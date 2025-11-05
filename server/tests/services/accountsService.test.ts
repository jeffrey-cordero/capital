import { Account, IMAGES } from "capital/accounts";
import { createMockAccounts, createValidAccount, TEST_ACCOUNT_ID, TEST_ACCOUNT_IDS } from "capital/mocks/accounts";
import { TEST_USER_ID } from "capital/mocks/user";
import { HTTP_STATUS, ServerResponse } from "capital/server";

import * as accountsService from "@/services/accountsService";
import { ACCOUNT_CACHE_DURATION } from "@/services/accountsService";
import {
   arrangeDefaultRedisCacheBehavior,
   arrangeMockCacheHit,
   arrangeMockCacheMiss,
   arrangeMockRepositoryError,
   arrangeMockRepositorySuccess,
   assertCacheHitBehavior,
   assertCacheInvalidation,
   assertCacheInvalidationNotCalled,
   assertCacheMissBehavior,
   assertMethodsNotCalled,
   assertRepositoryCall,
   assertServiceErrorResponse,
   assertServiceSuccessResponse,
   assertServiceThrows
} from "@/tests/utils/services";

jest.mock("@/lib/redis");
jest.mock("@/repository/accountsRepository");

describe("Account Service", () => {
   const userId: string = TEST_USER_ID;
   const accountsCacheKey: string = `accounts:${userId}`;
   const VALID_IMAGE_VALUES: string[] = [
      ...Array.from(IMAGES),
      "https://example.com/images/account-icon.png",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
   ];

   let redis: typeof import("@/lib/redis");
   let accountsRepository: typeof import("@/repository/accountsRepository");

   /**
    * Asserts account validation error response for create/update operations
    *
    * @param {ServerResponse} result - Service response result
    * @param {Record<string, string>} expectedErrors - Expected validation errors
    */
   const assertAccountValidationErrorResponse = (result: ServerResponse, expectedErrors: Record<string, string>): void => {
      assertMethodsNotCalled([
         { module: accountsRepository, methods: ["create", "updateDetails", "updateOrdering", "deleteAccount"] },
         { module: redis, methods: ["removeCacheValue"] }
      ]);
      assertServiceErrorResponse(result, HTTP_STATUS.BAD_REQUEST, expectedErrors);
   };

   /**
    * Asserts account cache hit behavior - cache read, no repository call, no cache write
    */
   const assertAccountCacheHitBehavior = (): void => {
      assertCacheHitBehavior(redis, accountsRepository, "findByUserId", accountsCacheKey);
   };

   /**
    * Asserts account cache miss behavior - cache read, repository call, cache write
    *
    * @param {string} userId - Expected user ID
    * @param {Account[]} expectedAccounts - Expected accounts data
    */
   const assertAccountCacheMissBehavior = (userId: string, expectedAccounts: Account[]): void => {
      assertCacheMissBehavior(
         redis,
         accountsRepository,
         "findByUserId",
         accountsCacheKey,
         userId,
         expectedAccounts,
         ACCOUNT_CACHE_DURATION
      );
   };

   /**
    * Asserts account operation success - repository call and cache invalidation
    *
    * @param {string} repositoryMethod - Repository method name
    * @param {any[]} expectedParams - Expected parameters for repository call
    */
   const assertAccountOperationSuccess = (repositoryMethod: string, expectedParams: any[]): void => {
      assertRepositoryCall(accountsRepository, repositoryMethod, expectedParams);
      assertCacheInvalidation(redis, accountsCacheKey);
   };

   beforeEach(async() => {
      jest.clearAllMocks();

      accountsRepository = await import("@/repository/accountsRepository");
      redis = await import("@/lib/redis");

      arrangeDefaultRedisCacheBehavior(redis);
   });

   describe("fetchAccounts", () => {
      it("should return cached accounts on cache hit", async() => {
         const cachedAccounts: Account[] = createMockAccounts();
         const cachedData: string = JSON.stringify(cachedAccounts);
         arrangeMockCacheHit(redis, cachedData);

         const result: ServerResponse = await accountsService.fetchAccounts(userId);

         assertAccountCacheHitBehavior();
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, cachedAccounts);
      });

      it("should fetch from database and cache on cache miss", async() => {
         const mockAccounts: Account[] = createMockAccounts();

         arrangeMockCacheMiss(redis);
         arrangeMockRepositorySuccess(accountsRepository, "findByUserId", mockAccounts);

         const result: ServerResponse = await accountsService.fetchAccounts(userId);

         assertAccountCacheMissBehavior(userId, mockAccounts);
         assertServiceSuccessResponse(result, HTTP_STATUS.OK, mockAccounts);
      });
   });

   describe("createAccount", () => {
      it("should create account successfully with valid data", async() => {
         const validAccount: Account = createValidAccount();

         arrangeMockRepositorySuccess(accountsRepository, "create", TEST_ACCOUNT_ID);

         const result: ServerResponse = await accountsService.createAccount(userId, validAccount);

         assertAccountOperationSuccess("create", [userId, expect.objectContaining(validAccount)]);
         assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { account_id: TEST_ACCOUNT_ID });
      });

      VALID_IMAGE_VALUES.forEach((image) => {
         it(`should create account successfully with valid image: ${image.length > 50 ? image.substring(0, 50) + "..." : image}`, async() => {
            const validAccount: Account = createValidAccount({ image });

            arrangeMockRepositorySuccess(accountsRepository, "create", TEST_ACCOUNT_ID);

            const result: ServerResponse = await accountsService.createAccount(userId, validAccount);

            assertAccountOperationSuccess("create", [userId, expect.objectContaining(validAccount)]);
            assertServiceSuccessResponse(result, HTTP_STATUS.CREATED, { account_id: TEST_ACCOUNT_ID });
         });
      });

      const requiredFields: (keyof Account)[] = ["balance", "last_updated", "type", "account_order"];

      requiredFields.forEach((field) => {
         it(`should return validation errors for missing ${field}`, async() => {
            const invalidAccount: Partial<Account> = {
               ...createValidAccount(),
               [field]: undefined
            };

            const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount as Account);

            const fieldName: string = field.replace(/_/g, " ");
            const identifier: string = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
            const expectedError: string = `${identifier} is required`;

            assertAccountValidationErrorResponse(
               result,
               { [field]: expectedError }
            );
         });
      });

      it("should return validation errors for invalid field types", async() => {
         const invalidAccount: any = {
            name: "Test Account",
            balance: "not-a-number",
            last_updated: "invalid-date",
            type: "Checking",
            account_order: "not-an-integer"
         };

         const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount);

         assertAccountValidationErrorResponse(
            result,
            {
               balance: "Invalid input",
               last_updated: "Last updated must be a valid date",
               account_order: "Invalid input"
            }
         );
      });

      it("should return validation errors for name too short", async() => {
         const invalidAccount: Account = createValidAccount({ name: "" });

         const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount);

         assertAccountValidationErrorResponse(
            result,
            { name: "Name must be at least 1 character" }
         );
      });

      it("should return validation errors for name too long", async() => {
         const invalidAccount: Account = createValidAccount({ name: "a".repeat(31) });

         const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount);

         assertAccountValidationErrorResponse(
            result,
            { name: "Name must be at most 30 characters" }
         );
      });

      it("should return validation errors for balance below minimum", async() => {
         const invalidAccount: Account = createValidAccount({ balance: -1_000_000_000_000 });

         const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount);

         assertAccountValidationErrorResponse(
            result,
            { balance: "Balance is below the minimum allowed value" }
         );
      });

      it("should return validation errors for balance above maximum", async() => {
         const invalidAccount: Account = createValidAccount({ balance: 1_000_000_000_000_000 });

         const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount);

         assertAccountValidationErrorResponse(
            result,
            { balance: "Balance exceeds the maximum allowed value" }
         );
      });

      it("should return validation errors for invalid account type", async() => {
         const invalidAccount: Account = createValidAccount({ type: "InvalidType" });

         const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount);

         assertAccountValidationErrorResponse(
            result,
            { type: "Account type must be one of the following: Checking, Savings, Credit Card, Debt, Retirement, Investment, Loan, Property, Other" }
         );
      });

      it("should return validation errors for invalid image URL", async() => {
         const invalidAccount: Account = createValidAccount({ image: "not-a-valid-url" });

         const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount);

         assertAccountValidationErrorResponse(
            result,
            { image: "Image must be a valid URL" }
         );
      });

      it("should return validation errors for account_order negative", async() => {
         const invalidAccount: Account = createValidAccount({
            account_order: -1
         });

         const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount);

         assertAccountValidationErrorResponse(
            result,
            { account_order: "Account order cannot be negative" }
         );
      });

      it("should return validation errors for account_order too large", async() => {
         const invalidAccount: Account = createValidAccount({
            account_order: 2_147_483_648
         });

         const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount);

         assertAccountValidationErrorResponse(
            result,
            { account_order: "Account order exceeds maximum value" }
         );
      });

      it("should return validation errors for last_updated too early", async() => {
         const invalidAccount: Account = createValidAccount({
            last_updated: "1799-12-31"
         });

         const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount);

         assertAccountValidationErrorResponse(
            result,
            { last_updated: "Last updated must be on or after 1800-01-01" }
         );
      });

      it("should return validation errors for last_updated in the future", async() => {
         const futureDate = new Date();
         futureDate.setFullYear(futureDate.getFullYear() + 1);
         const invalidAccount: Account = createValidAccount({
            last_updated: futureDate.toISOString()
         });

         const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount);

         assertAccountValidationErrorResponse(
            result,
            { last_updated: "Last updated cannot be in the future" }
         );
      });

      it("should return validation errors for extra fields (strict mode)", async() => {
         const invalidAccount: any = {
            ...createValidAccount(),
            extraField: "not-allowed"
         };

         const result: ServerResponse = await accountsService.createAccount(userId, invalidAccount);

         // Strict mode errors for unrecognized keys are not captured by flatten().fieldErrors
         // So we verify that validation fails (BAD_REQUEST) but don't check specific error messages
         expect(result.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
         expect(result.errors).toBeDefined();
         assertMethodsNotCalled([
            { module: accountsRepository, methods: ["create", "updateDetails", "updateOrdering", "deleteAccount"] },
            { module: redis, methods: ["removeCacheValue"] }
         ]);
      });

      it("should handle repository errors during creation using helper", async() => {
         const validAccount: Account = createValidAccount();
         arrangeMockRepositoryError(accountsRepository, "create", "Database connection failed");

         await assertServiceThrows(
            () => accountsService.createAccount(userId, validAccount),
            "Database connection failed"
         );

         assertRepositoryCall(accountsRepository, "create", [userId, expect.objectContaining(validAccount)]);
         assertCacheInvalidationNotCalled(redis);
      });
   });

   describe("updateAccount", () => {
      it("should update account successfully with valid data", async() => {
         const updates: Partial<Account> = {
            account_id: TEST_ACCOUNT_ID,
            name: "Updated Account Name",
            balance: 2000.75,
            last_updated: new Date("2024-02-01").toISOString(),
            type: "Savings"
         };

         arrangeMockRepositorySuccess(accountsRepository, "updateDetails", true);

         const result: ServerResponse = await accountsService.updateAccount(userId, updates);

         assertAccountOperationSuccess("updateDetails", [userId, updates.account_id!, expect.objectContaining(updates)]);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      VALID_IMAGE_VALUES.forEach((image) => {
         it(`should update account successfully with valid image: ${image.length > 50 ? image.substring(0, 50) + "..." : image}`, async() => {
            const updates: Partial<Account> = {
               account_id: TEST_ACCOUNT_ID,
               image,
               last_updated: new Date("2024-02-01").toISOString()
            };

            arrangeMockRepositorySuccess(accountsRepository, "updateDetails", true);

            const result: ServerResponse = await accountsService.updateAccount(userId, updates);

            assertAccountOperationSuccess("updateDetails", [userId, updates.account_id!, expect.objectContaining(updates)]);
            assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
         });
      });

      it("should return not found when account does not exist", async() => {
         const updates: Partial<Account> = {
            account_id: "00000000-0000-0000-0000-000000000000",
            name: "Updated Name",
            last_updated: new Date("2024-02-01").toISOString()
         };

         arrangeMockRepositorySuccess(accountsRepository, "updateDetails", false);

         const result: ServerResponse = await accountsService.updateAccount(userId, updates);

         assertRepositoryCall(accountsRepository, "updateDetails", [userId, updates.account_id!, expect.objectContaining(updates)]);
         assertCacheInvalidationNotCalled(redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, {
            account_id: "Account does not exist based on the provided ID"
         });
      });

      const updateRequiredFields: Array<{ field: keyof Account; errorMessage: string }> = [
         { field: "account_id", errorMessage: "Missing account ID" },
         { field: "last_updated", errorMessage: "Missing last updated timestamp" }
      ];

      updateRequiredFields.forEach(({ field, errorMessage }) => {
         it(`should return validation errors for missing ${field}`, async() => {
            const updates: Partial<Account> = {
               account_id: TEST_ACCOUNT_ID,
               name: "Updated Name",
               last_updated: new Date("2024-02-01").toISOString(),
               [field]: undefined
            };

            const result: ServerResponse = await accountsService.updateAccount(userId, updates);

            assertAccountValidationErrorResponse(
               result,
               { [field]: errorMessage }
            );
         });
      });

      it("should return validation errors for invalid field values", async() => {
         const updates: Partial<Account> = {
            account_id: TEST_ACCOUNT_ID,
            name: "a".repeat(31),
            balance: 1_000_000_000_000_000,
            last_updated: new Date("2024-02-01").toISOString(),
            type: "InvalidType" as any
         };

         const result: ServerResponse = await accountsService.updateAccount(userId, updates);

         assertAccountValidationErrorResponse(
            result,
            {
               name: "Name must be at most 30 characters",
               balance: "Balance exceeds the maximum allowed value",
               type: "Account type must be one of the following: Checking, Savings, Credit Card, Debt, Retirement, Investment, Loan, Property, Other"
            }
         );
      });

      it("should handle repository errors during update using helper", async() => {
         const updates: Partial<Account> = {
            account_id: TEST_ACCOUNT_ID,
            name: "Updated Name",
            last_updated: new Date("2024-02-01").toISOString()
         };

         arrangeMockRepositoryError(accountsRepository, "updateDetails", "Database connection failed");

         await assertServiceThrows(
            () => accountsService.updateAccount(userId, updates),
            "Database connection failed"
         );

         assertRepositoryCall(accountsRepository, "updateDetails", [userId, updates.account_id!, expect.objectContaining(updates)]);
         assertCacheInvalidationNotCalled(redis);
      });
   });

   describe("updateAccountsOrdering", () => {
      it("should update accounts ordering successfully with valid data", async() => {
         const accountIds: string[] = TEST_ACCOUNT_IDS;

         arrangeMockRepositorySuccess(accountsRepository, "updateOrdering", true);

         const result: ServerResponse = await accountsService.updateAccountsOrdering(userId, accountIds);

         const expectedUpdates = accountIds.map((id, index) => ({
            account_id: id,
            account_order: index
         }));
         assertAccountOperationSuccess("updateOrdering", [userId, expectedUpdates]);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return not found when accounts do not exist", async() => {
         const accountIds: string[] = [
            "00000000-0000-0000-0000-000000000001",
            "00000000-0000-0000-0000-000000000002"
         ];

         arrangeMockRepositorySuccess(accountsRepository, "updateOrdering", false);

         const result: ServerResponse = await accountsService.updateAccountsOrdering(userId, accountIds);

         const expectedUpdates = accountIds.map((id, index) => ({
            account_id: id,
            account_order: index
         }));
         assertRepositoryCall(accountsRepository, "updateOrdering", [userId, expectedUpdates]);
         assertCacheInvalidationNotCalled(redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, {
            accounts: "Account(s) do not exist or do not belong to the user based on the provided IDs"
         });
      });

      it("should return validation errors for empty array", async() => {
         const accountIds: string[] = [];

         const result: ServerResponse = await accountsService.updateAccountsOrdering(userId, accountIds);

         assertAccountValidationErrorResponse(
            result,
            { accounts: "Account ID's array must be a valid array representation" }
         );
      });

      it("should return validation errors for non-array input", async() => {
         const accountIds: any = "not-an-array";

         const result: ServerResponse = await accountsService.updateAccountsOrdering(userId, accountIds);

         assertAccountValidationErrorResponse(
            result,
            { accounts: "Account ID's array must be a valid array representation" }
         );
      });

      it("should return validation errors for invalid UUID in array", async() => {
         const accountIds: string[] = [TEST_ACCOUNT_IDS[0], "invalid-uuid"];

         const result: ServerResponse = await accountsService.updateAccountsOrdering(userId, accountIds);

         assertAccountValidationErrorResponse(
            result,
            { account_id: "Invalid account ID: 'invalid-uuid'" }
         );
      });

      it("should return validation errors for multiple invalid UUIDs", async() => {
         const accountIds: string[] = ["invalid-1", "invalid-2"];

         const result: ServerResponse = await accountsService.updateAccountsOrdering(userId, accountIds);

         assertAccountValidationErrorResponse(
            result,
            { account_id: "Invalid account ID: 'invalid-1'" }
         );
      });

      it("should handle repository errors during ordering update using helper", async() => {
         const accountIds: string[] = TEST_ACCOUNT_IDS.slice(0, 2);

         arrangeMockRepositoryError(accountsRepository, "updateOrdering", "Database connection failed");

         await assertServiceThrows(
            () => accountsService.updateAccountsOrdering(userId, accountIds),
            "Database connection failed"
         );

         const expectedUpdates = accountIds.map((id, index) => ({
            account_id: id,
            account_order: index
         }));
         assertRepositoryCall(accountsRepository, "updateOrdering", [userId, expectedUpdates]);
         assertCacheInvalidationNotCalled(redis);
      });
   });

   describe("deleteAccount", () => {
      it("should delete account successfully", async() => {
         arrangeMockRepositorySuccess(accountsRepository, "deleteAccount", true);

         const result: ServerResponse = await accountsService.deleteAccount(userId, TEST_ACCOUNT_ID);

         assertAccountOperationSuccess("deleteAccount", [userId, TEST_ACCOUNT_ID]);
         assertServiceSuccessResponse(result, HTTP_STATUS.NO_CONTENT);
      });

      it("should return not found when account does not exist", async() => {
         const accountId: string = "00000000-0000-0000-0000-000000000000";

         arrangeMockRepositorySuccess(accountsRepository, "deleteAccount", false);

         const result: ServerResponse = await accountsService.deleteAccount(userId, accountId);

         assertRepositoryCall(accountsRepository, "deleteAccount", [userId, accountId]);
         assertCacheInvalidationNotCalled(redis);
         assertServiceErrorResponse(result, HTTP_STATUS.NOT_FOUND, {
            account_id: "Account does not exist based on the provided ID or does not belong to the user"
         });
      });

      it("should return validation errors for missing account_id", async() => {
         const accountId: string = "";

         const result: ServerResponse = await accountsService.deleteAccount(userId, accountId);

         assertAccountValidationErrorResponse(
            result,
            { account_id: "Missing account ID" }
         );
      });

      it("should handle repository errors during deletion using helper", async() => {
         arrangeMockRepositoryError(accountsRepository, "deleteAccount", "Database connection failed");

         await assertServiceThrows(
            () => accountsService.deleteAccount(userId, TEST_ACCOUNT_ID),
            "Database connection failed"
         );

         assertRepositoryCall(accountsRepository, "deleteAccount", [userId, TEST_ACCOUNT_ID]);
         assertCacheInvalidationNotCalled(redis);
      });
   });
});