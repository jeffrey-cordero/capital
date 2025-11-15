import { type Fixtures, test as base } from "@playwright/test";
import { cleanupCreatedTestUsers } from "@tests/utils/authentication";

/**
 * Record of a created test user's credentials for the test's final cleanup
 */
export type CreatedUserRecord = {
   username: string;
   email: string;
   name: string;
   birthday: string;
   password: string;
   isTestScoped?: boolean;
};

/**
 * Container for the currently assigned user in a test
 */
export type AssignedUserRecord = {
   current: CreatedUserRecord | null;
};

/**
 * Shared fixtures for all test suites
 */
type SharedFixtures = {
  /* Set of created test users for the worker's final cleanup */
  usersRegistry: Set<CreatedUserRecord>;
  /* Username to password map for users currently assigned to tests */
  assignedRegistry: Record<string, string>;
  /* Currently assigned user record for the test */
  assignedUser: AssignedUserRecord;
};

/**
 * Extend the base test suite with the shared fixtures
 */
export const test = base.extend<SharedFixtures>({
   usersRegistry: [
      // eslint-disable-next-line no-empty-pattern
      async({}: Fixtures<SharedFixtures>, use: (value: Set<CreatedUserRecord>) => Promise<void>) => {
         // Worker-scoped users registry to collect created test users for the test's final cleanup
         const usersRegistry = new Set<CreatedUserRecord>();

         // Make the users registry available to all test suites within this worker
         await use(usersRegistry);

         // Cleanup the created test users from the database before the worker exits
         await cleanupCreatedTestUsers(usersRegistry);
      }, { scope: "worker" }] as any,
   assignedRegistry: [
      // eslint-disable-next-line no-empty-pattern
      async({}: Fixtures<SharedFixtures>, use: (value: Record<string, string>) => Promise<void>) => {
         // Worker-scoped assigned registry to track users currently assigned to tests
         const assignedRegistry: Record<string, string> = {};

         // Make the assigned registry available to all test suites within this worker
         await use(assignedRegistry);
      }, { scope: "worker" }] as any,
   assignedUser: [
      // eslint-disable-next-line no-empty-pattern
      async({}: Fixtures<SharedFixtures>, use: (value: AssignedUserRecord) => Promise<void>) => {
         // Function-scoped assigned user to store the current test's assigned user
         const assignedUser: AssignedUserRecord = { current: null };

         // Make the assigned user available to the test
         await use(assignedUser);
      }, { scope: "test" }] as any
});

export { expect } from "@playwright/test";