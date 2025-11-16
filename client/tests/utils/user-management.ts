import { type Page } from "@playwright/test";
import type { AssignedUserRecord, CreatedUserRecord } from "@tests/fixtures";
import { createUser, loginUser } from "@tests/utils/authentication";
import { navigateToPath } from "@tests/utils/navigation";
import { Mutex } from "async-mutex";

/**
 * Mutex for thread-safe user assignment
 */
const mutex = new Mutex();

/**
 * Updates user credentials (username and/or password) in registries
 *
 * @param {Set<CreatedUserRecord>} usersRegistry - Registry of all created users for cleanup
 * @param {Record<string, string>} assignedRegistry - Username to password map for users currently assigned to tests
 * @param {string} originalUsername - Original username to update from
 * @param {Partial<{username: string; password: string}>} updates - Object with optional username and/or password to update
 */
export function updateUserInRegistries(
   usersRegistry: Set<CreatedUserRecord>,
   assignedRegistry: Record<string, string>,
   originalUsername: string,
   updates: Partial<{ username: string; password: string }>
): void {
   const { username: newUsername, password: newPassword } = updates;

   // Find and update the user in registry in a single pass
   for (const user of usersRegistry) {
      if (user.username === originalUsername) {
         // Update username in the user record
         if (newUsername) {
            user.username = newUsername;
         }

         // Update password in the user record
         if (newPassword) {
            user.password = newPassword;

            delete assignedRegistry[originalUsername];
            assignedRegistry[newUsername || originalUsername] = newPassword;
         }

         break;
      }
   }
}

/**
 * Sets up a test user by logging in as an available user or creating a new one
 *
 * @param {Page} page - Playwright page instance
 * @param {Set<CreatedUserRecord>} usersRegistry - Registry of all created users for cleanup
 * @param {Record<string, string>} assignedRegistry - Username to password map for users currently assigned to tests
 * @param {string} route - Route to navigate to after login
 * @param {boolean} [requiresIsolation=true] - If true, assigns a fresh user, otherwise reuses any available user
 * @param {boolean} [markAsTestScoped=false] - If true, marks the user with isTestScoped flag to prevent future reuse (username updates, password updates, account deletions, etc.)
 * @param {AssignedUserRecord} [assignedUser] - Optional fixture object to store the assigned user reference
 */
export async function setupAssignedUser(
   page: Page,
   usersRegistry: Set<CreatedUserRecord>,
   assignedRegistry: Record<string, string>,
   route: string,
   requiresIsolation: boolean = true,
   markAsTestScoped: boolean = false,
   assignedUser?: AssignedUserRecord
): Promise<void> {
   const release = await mutex.acquire();

   try {
      let userToAssign: CreatedUserRecord | null = null;

      // Find the first user in the registry that isn't currently assigned
      for (const user of usersRegistry) {
         // Skip users marked as test-scoped (never reuse them)
         if (user.isTestScoped) continue;

         // Check if the user is available for assignment (no isolation required or not already assigned)
         if (!requiresIsolation || !(user.username in assignedRegistry)) {
            userToAssign = user;
            break;
         }
      }

      if (!userToAssign) {
         // No available users within the current worker, so create a new one for the assignment
         userToAssign = await createUser(page, {}, false, usersRegistry, markAsTestScoped);
      }

      // Add the assigned user to the assigned registry
      assignedRegistry[userToAssign.username] = userToAssign.password;

      // Store the assigned user in the fixture if provided
      if (assignedUser) {
         assignedUser.current = userToAssign;
      }

      // Login with the assigned user's credentials
      await loginUser(page, userToAssign.username, userToAssign.password);

      // Navigate to the specified route
      await navigateToPath(page, route);
   } finally {
      release();
   }
}