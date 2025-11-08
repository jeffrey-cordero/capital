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
 */
export async function setupAssignedUser(
   page: Page,
   usersRegistry: Set<CreatedUserRecord>,
   assignedRegistry: Record<string, string>,
   route: string
): Promise<void> {
   const release = await mutex.acquire();

   try {
      // Find the first user in the registry that isn't currently assigned
      let userToAssign: CreatedUserRecord | null = null;

      for (const user of usersRegistry) {
         if (!(user.username in assignedRegistry)) {
            userToAssign = user;
            break;
         }
      }

      if (!userToAssign) {
         // No available users within the current worker, so create a new one for the assignment
         userToAssign = await createUser(page, {}, false, usersRegistry);
      }

      // Login with the assigned user's credentials
      await loginUser(page, userToAssign.username, userToAssign.password);

      // Add the assigned user to the assigned registry
      assignedRegistry[userToAssign.username] = userToAssign.password;

      // Navigate to the specified route
      await navigateToPath(page, route);
   } finally {
      release();
   }
}