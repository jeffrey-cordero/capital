import { type Fixtures, test as base } from "@playwright/test";
import { cleanupCreatedTestUsers } from "@tests/utils/authentication";

/**
 * Record of a created test user's credentials
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
         const usersRegistry = new Set<CreatedUserRecord>();

         await use(usersRegistry);

         // Cleanup the created test users from the database before the worker exits
         await cleanupCreatedTestUsers(usersRegistry);
      }, { scope: "worker" }] as any,
   assignedRegistry: [
      // eslint-disable-next-line no-empty-pattern
      async({}: Fixtures<SharedFixtures>, use: (value: Record<string, string>) => Promise<void>) => {
         const assignedRegistry: Record<string, string> = {};

         await use(assignedRegistry);
      }, { scope: "worker" }] as any,
   assignedUser: [
      // eslint-disable-next-line no-empty-pattern
      async({}: Fixtures<SharedFixtures>, use: (value: AssignedUserRecord) => Promise<void>) => {
         const assignedUser: AssignedUserRecord = { current: null };

         await use(assignedUser);
      }, { scope: "test" }] as any
});

export { expect } from "@playwright/test";