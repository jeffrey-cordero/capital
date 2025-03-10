import { Account, AccountHistory, accountHistorySchema, accountSchema } from "capital/accounts";
import { ServerResponse } from "capital/server";
import { z } from "zod";

import { getCacheValue, removeCacheValue, setCacheValue } from "@/lib/redis";
import { sendServiceResponse, sendValidationErrors } from "@/lib/services";
import {
   create,
   deleteAccount as removeAccount,
   findByUserId,
   removeHistory,
   updateDetails,
   updateHistory as updateAccountHistory,
   updateOrdering
} from "@/repository/accountsRepository";

export async function fetchAccounts(user_id: string): Promise<ServerResponse> {
   const cache = await getCacheValue(`accounts:${user_id}`);

   if (cache) {
      return sendServiceResponse(200, "Accounts", JSON.parse(cache) as Account[]);
   } else {
      // Fetch the user accounts from the database and cache for 10 minutes
      const result: Account[] = await findByUserId(user_id);
      setCacheValue(`accounts:${user_id}`, 10 * 60, JSON.stringify(result));

      return sendServiceResponse(200, "Accounts", result);
   }
}

// Successful updates to the overall user account's should clear their respective cache value
export async function createAccount(user_id: string, account: Account): Promise<ServerResponse> {
   // Validate the account fields
   const fields = accountSchema.strict().safeParse(account);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid account fields");
   } else {
      // Create the account and fetch the inserted account UUID
      const account_id: string = await create(user_id, account);
      removeCacheValue(`accounts:${user_id}`);

      return sendServiceResponse(201, "Account created", { account_id: account_id });
   }
}

export async function updateAccount(
   type: "details" | "history",
   user_id: string,
   account: Partial<Account & AccountHistory>
): Promise<ServerResponse> {
   // Validate the account fields
   const fields = accountSchema.partial().safeParse(account);

   if (!fields.success) {
      return sendValidationErrors(fields, "Invalid account fields");
   } else if (!account.account_id) {
      return sendValidationErrors(null, "Invalid account fields",
         { account_id: "Missing account ID" }
      );
   } else if (Object.keys(account).length === 0) {
      return sendValidationErrors(null, "No account fields to update");
   }

   if (type === "details") {
      const result: boolean = await updateDetails(user_id, account.account_id, account);

      if (result) {
         removeCacheValue(`accounts:${user_id}`);

         return sendServiceResponse(204);
      } else {
         return sendServiceResponse(404, "Account not found", undefined,
            { account: "Account does not exist based on the provided ID" }
         );
      }
   } else {
      const fields = accountHistorySchema.safeParse(account as AccountHistory);

      if (!fields.success) {
         return sendValidationErrors(fields, "Invalid account history fields");
      } else {
         const result: boolean = await updateAccountHistory(
            user_id, account.account_id, Number(account.balance), account.last_updated ? new Date(account.last_updated) : new Date()
         );

         if (result) {
            removeCacheValue(`accounts:${user_id}`);

            return sendServiceResponse(204);
         } else {
            return sendServiceResponse(404, "Account not found", undefined,
               { account: "Account does not exist based on the provided ID" }
            );
         }
      }
   }
}

export async function updateAccountsOrdering(user_id: string, accounts: string[]): Promise<ServerResponse> {
   // Validate the array of account ID's
   const uuidSchema = z.string().uuid();
   const updates: Partial<Account>[] = [];

   if (!accounts || accounts.length === 0) {
      return sendValidationErrors(null, "Invalid account ordering fields",
         { accounts: "Account ID array must be non-empty" }
      );
   }

   for (let i = 0; i < accounts.length; i++) {
      if (!uuidSchema.safeParse(accounts[i]).success) {
         return sendValidationErrors(null, "Invalid account ordering fields",
            { account_id: `Account ID must be a valid UUID: '${accounts[i]}'` }
         );
      }

      updates.push({ account_id: accounts[i], account_order: i });
   }

   const result: boolean = await updateOrdering(user_id, updates);

   if (result) {
      removeCacheValue(`accounts:${user_id}`);

      return sendServiceResponse(204);
   } else {
      return sendServiceResponse(404, "Invalid account ordering fields", undefined,
         { accounts: "No possible ordering updates based on provided account ID's" }
      );
   }
}

export async function deleteAccountHistory(user_id: string, account_id: string, last_updated: string): Promise<ServerResponse> {
   const result: string = await removeHistory(user_id, account_id, new Date(last_updated));

   if (result === "missing") {
      return sendServiceResponse(404, "Account history record not found", undefined,
         { history: "Account history does not exist based on the provided date" }
      );
   } else if (result === "conflict") {
      return sendServiceResponse(409, "Account history record conflicts", undefined,
         { history: "At least one history record must remain for this account" }
      );
   } else {
      removeCacheValue(`accounts:${user_id}`);

      return sendServiceResponse(204);
   }
}

export async function deleteAccount(user_id: string, account_id: string): Promise<ServerResponse> {
   const result: boolean = await removeAccount(user_id, account_id);

   if (result) {
      removeCacheValue(`accounts:${user_id}`);

      return sendServiceResponse(204);
   } else {
      return sendServiceResponse(404, "Account not found", undefined,
         { account: "Account does not exist based on the provided ID" }
      );
   }
}