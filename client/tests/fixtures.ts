import { test as base } from "@playwright/test";

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
   createdUsersRegistry: [async({}, use: any) => {
   // Create the worker-scoped user registry to avoid race conditions across workers
      const registry = new Set<CreatedUserRecord>();

      // Use the registry throughout the worker lifecycle
      await use(registry);

      // Clear the registry after the worker exists to avoid memory leaks
      registry.clear();
   }, { scope: "worker" }] as any
});

export { expect } from "@playwright/test";