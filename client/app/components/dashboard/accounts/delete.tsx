import { type Account } from "capital/accounts";
import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Confirmation from "@/components/global/confirmation";
import { sendApiRequest } from "@/lib/api";
import { removeAccount } from "@/redux/slices/accounts";

export default function AccountDeletion({ account, disabled }: { account: Account, disabled: boolean }) {
   const dispatch = useDispatch(), navigate = useNavigate();

   const onSubmit = useCallback(async() => {
      try {
         const result: number = await sendApiRequest(
            `dashboard/accounts/${account.account_id}`, "DELETE", undefined, dispatch, navigate
         );

         if (result === 204) {
            dispatch(removeAccount(account.account_id ?? ""));
         }
      } catch (error) {
         console.error(error);
      }
   }, [dispatch, navigate, account.account_id]);

   return (
      <Confirmation
         disabled = { disabled }
         message = {
            `Are you sure you want to delete your account? This action will permanently erase all your account history. 
         However, any transactions linked to your account will be detached, but not deleted. Once deleted, this action cannot be undone.`
         }
         onConfirmation = { onSubmit }
      />
   );
}