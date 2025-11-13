import { type Page } from "@playwright/test";
import type { CreatedUserRecord } from "@tests/fixtures";
import { createUser, loginUser } from "@tests/utils/authentication";
import { navigateToPath } from "@tests/utils/navigation";
import { Mutex } from "async-mutex";

/**
 * Mutex for thread-safe user assignment
 */
const mutex = new Mutex();

/**
 * Sets up a test user by logging in as an available user or creating a new one
 *
 * @param {Page} page - Playwright page instance
 * @param {Set<CreatedUserRecord>} usersRegistry - Registry of all created users for cleanup
 * @param {Record<string, string>} assignedRegistry - Username to password map for users currently assigned to tests
 * @param {string} route - Route to navigate to after login
 * @param {boolean} [requiresIsolation=true] - If true, assigns a fresh user, otherwise reuses any available user
 * @param {boolean} [markAsSingleTest=false] - If true, marks the user with isSingleTest flag to prevent future reuse (username updates, password updates, account deletions, etc.)
 */
export async function setupAssignedUser(
   page: Page,
   usersRegistry: Set<CreatedUserRecord>,
   assignedRegistry: Record<string, string>,
   route: string,
   requiresIsolation: boolean = true,
   markAsSingleTest: boolean = false
): Promise<void> {
   const release = await mutex.acquire();

   try {
      let userToAssign: CreatedUserRecord | null = null;

      // Find the first user in the registry that isn't currently assigned
      for (const user of usersRegistry) {
         // Skip users marked as single-test (never reuse them)
         if (user.isSingleTest) continue;

         // Check if the user is available for assignment (no isolation required or not already assigned)
         if (!requiresIsolation || !(user.username in assignedRegistry)) {
            userToAssign = user;
            break;
         }
      }

      if (!userToAssign) {
         // No available users within the current worker, so create a new one for the assignment
         userToAssign = await createUser(page, {}, false, usersRegistry);
      }

      // Mark user as single-test if requested (prevents future reuse)
      if (markAsSingleTest) {
         userToAssign.isSingleTest = true;
      }

      // Add the assigned user to the assigned registry
      assignedRegistry[userToAssign.username] = userToAssign.password;

      // Login with the assigned user's credentials
      await loginUser(page, userToAssign.username, userToAssign.password);

      // Navigate to the specified route
      await navigateToPath(page, route);
   } finally {
      release();
   }
}