import { type Account } from "capital/accounts";
import { HTTP_STATUS } from "capital/server";
import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Confirmation from "@/components/global/confirmation";
import { sendApiRequest } from "@/lib/api";
import { removeAccount } from "@/redux/slices/accounts";

const message = "Are you sure you want to delete your account? This action will permanently erase all your account history. \
However, any transactions linked to your account will be detached, but not deleted. Once deleted, this action cannot be undone.";

/**
 * Account deletion component with confirmation dialog, which preserves
 * linked transactions while removing basic account data
 *
 * @param {Account} account - The account to be deleted
 * @returns {React.ReactNode} Confirmation dialog for account deletion
 */
export default function AccountDeletion({ account }: { account: Account }): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();

   const onSubmit = useCallback(async() => {
      try {
         const result = await sendApiRequest<number>(
            `dashboard/accounts/${account.account_id}`, "DELETE", undefined, dispatch, navigate
         );

         if (result === HTTP_STATUS.NO_CONTENT) {
            dispatch(removeAccount(account.account_id ?? ""));
         }
      } catch (error) {
         console.error(error);
      }
   }, [dispatch, navigate, account.account_id]);

   return (
      <Confirmation
         dataTestId = "account-delete-button"
         message = { message }
         onConfirmation = { onSubmit }
         type = "button"
      />
   );
}