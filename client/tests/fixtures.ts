import { type Fixtures, test as base } from "@playwright/test";

/**
 * Record of a created user's credentials
 */
export type CreatedUserRecord = { username: string; password: string; };

/**
 * Shared fixtures for all tests
 */
type SharedFixtures = {
  createdUsersRegistry: Set<CreatedUserRecord>;
};

/**
 * Extend the base test with the shared fixtures
 */
export const test = base.extend<SharedFixtures>({
   createdUsersRegistry: [
      // The first argument requires object destructuring pattern
      // eslint-disable-next-line no-empty-pattern
      async({}: Fixtures<SharedFixtures>, use: (value: Set<CreatedUserRecord>) => Promise<void>) => {
         // Worker-scoped registry
         const registry = new Set<CreatedUserRecord>();

         // Make the registry available to all tests in this worker
         await use(registry);

         // Runs after worker exits
         registry.clear();
      },
      { scope: "worker" }
   ] as any
});

export { expect } from "@playwright/test";