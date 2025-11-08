import { type Page } from "@playwright/test";
import type { CreatedUserRecord } from "@tests/fixtures";
import { createUser, DASHBOARD_ROUTE, loginUser } from "@tests/utils/authentication";
import { Mutex } from "async-mutex";

/**
 * Mutex to ensure thread-safe user assignment during concurrent test execution
 */
const mutex = new Mutex();

/**
 * Sets up a test-specific user by either logging in as an available user or creating a new one
 * Reuses users from usersRegistry that aren't currently assigned before creating new ones
 * Called in beforeEach blocks to set up users for individual tests
 * The user will be logged in after this function completes
 *
 * @param {Page} page - Playwright page instance
 * @param {Set<CreatedUserRecord>} usersRegistry - Registry of all created users for cleanup
 * @param {Set<CreatedUserRecord>} assignedRegistry - Registry of users currently assigned to tests
 * @returns {Promise<CreatedUserRecord>} Credentials for the assigned and logged-in user
 */
export async function setupAssignedUser(
   page: Page,
   usersRegistry: Set<CreatedUserRecord>,
   assignedRegistry: Set<CreatedUserRecord>
): Promise<CreatedUserRecord> {
   const release = await mutex.acquire();

   try {
      // Find users in usersRegistry that aren't currently assigned
      const availableUsers = Array.from(usersRegistry).filter(
         user => !Array.from(assignedRegistry).some(
            assigned => assigned.username === user.username
         )
      );

      if (availableUsers.length > 0) {
         // Reuse an available user - login and add to assigned registry
         const userToAssign = availableUsers[0];
         await loginUser(page, userToAssign.username, userToAssign.password);
         assignedRegistry.add(userToAssign);
         return userToAssign;
      }

      // No available users, create a new one and keep logged in
      // createUser adds user to usersRegistry internally and returns credentials
      // keepLoggedIn: true means user stays logged in after creation
      const { username, password } = await createUser(page, {}, true, usersRegistry);

      // Add user to assigned registry with mutex protection
      const userCredentials: CreatedUserRecord = { username, password };
      assignedRegistry.add(userCredentials);

      return userCredentials;
   } finally {
      release();
   }
}

/**
 * Assigns a user from the assigned registry or creates a new one if needed
 * Uses mutex to ensure thread-safe user assignment
 *
 * @param {Page} page - Playwright page instance
 * @param {Set<CreatedUserRecord>} usersRegistry - Registry of all created users for cleanup
 * @param {Set<CreatedUserRecord>} assignedRegistry - Registry of users currently assigned to tests
 * @returns {Promise<CreatedUserRecord>} Credentials for the assigned user
 */
export async function assignUser(
   page: Page,
   usersRegistry: Set<CreatedUserRecord>,
   assignedRegistry: Set<CreatedUserRecord>
): Promise<CreatedUserRecord> {
   const release = await mutex.acquire();

   try {
      // Check if users are available in assigned registry
      if (assignedRegistry.size > 0) {
         // Use existing assigned user (reuse for concurrent tests)
         const assignedUser = Array.from(assignedRegistry)[0];
         return assignedUser;
      }

      // No assigned users available, set up a new one
      return await setupAssignedUser(page, usersRegistry, assignedRegistry);
   } finally {
      release();
   }
}

/**
 * Gets or assigns a user and logs them in
 * Handles page reload scenarios by checking if already logged in
 *
 * @param {Page} page - Playwright page instance
 * @param {Set<CreatedUserRecord>} usersRegistry - Registry of all created users for cleanup
 * @param {Set<CreatedUserRecord>} assignedRegistry - Registry of users currently assigned to tests
 * @returns {Promise<CreatedUserRecord>} Credentials for the assigned and logged-in user
 */
export async function getAssignedUser(
   page: Page,
   usersRegistry: Set<CreatedUserRecord>,
   assignedRegistry: Set<CreatedUserRecord>
): Promise<CreatedUserRecord> {
   const credentials = await assignUser(page, usersRegistry, assignedRegistry);

   // Check if already logged in by checking current URL
   const currentUrl = page.url();
   if (!currentUrl.includes(DASHBOARD_ROUTE)) {
      // Not logged in, perform login
      await loginUser(page, credentials.username, credentials.password);
   }

   return credentials;
}