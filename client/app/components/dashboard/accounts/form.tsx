import { faPenToSquare, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   FormControl,
   FormHelperText,
   InputLabel,
   NativeSelect,
   OutlinedInput,
   Stack
} from "@mui/material";
import { type Account, accountSchema, types } from "capital/accounts";
import { useEffect, useMemo } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import AccountDeletion from "@/components/dashboard/accounts/delete";
import AccountHistory from "@/components/dashboard/accounts/history";
import AccountImage from "@/components/dashboard/accounts/image";
import Transactions from "@/components/dashboard/transactions/transactions";
import { Modal, ModalSection } from "@/components/global/modal";
import { sendApiRequest } from "@/lib/api";
import { getCurrentDate } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { addAccount, updateAccount } from "@/redux/slices/accounts";
import type { RootState } from "@/redux/store";

/**
 * The AccountForm component to create and update accounts
 *
 * @interface AccountFormProps
 * @property {Account | undefined} account - The account to create or update
 * @property {boolean} open - Whether the modal is open
 * @property {() => void} onClose - The function to call when the modal is closed
 */
interface AccountFormProps {
   account: Account | undefined;
   open: boolean;
   onClose: () => void;
}

/**
 * The AccountForm component to create and update accounts
 *
 * @param {AccountFormProps} props - The props for the AccountForm component
 * @returns {React.ReactNode} The AccountForm component
 */
export default function AccountForm({ account, open, onClose }: AccountFormProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);
   const updating = account !== undefined;

   // Form setup with react-hook-form
   const {
      control,
      setError,
      clearErrors,
      setValue,
      handleSubmit,
      reset,
      watch,
      formState: { isSubmitting, errors, dirtyFields }
   } = useForm();

   // Reset form to match passed account data or clear the form (account is undefined)
   useEffect(() => {
      reset(account ? account : undefined);
   }, [account, reset, open]);

   // Memoize account types for selection input
   const accountTypes = useMemo(() => Array.from(types), []);

   // Handles form submission for both create and update operations
   const onSubmit = async(data: FieldValues) => {
      if (updating && !account) return; // Invalid state, return without submitting

      const account_order: number = account?.account_order ?? accounts.length;

      try {
         const fields = accountSchema.safeParse({ ...data, account_order });

         if (!fields.success) {
            handleValidationErrors(fields, setError);
            return;
         }

         if (updating) {
            // For updates, only send modified fields
            const updatedFields = Object.keys(dirtyFields).reduce((acc: Record<string, any>, record) => {
               acc[record] = data[record];

               return acc;
            }, {});

            // Only proceed if there are actual changes
            if (Object.keys(updatedFields).length > 0) {
               updatedFields.account_id = account.account_id;

               const result = await sendApiRequest<number>(
                  `dashboard/accounts/${account.account_id}`, "PUT", updatedFields, dispatch, navigate
               );

               if (result === 204) {
                  // Update account for a valid response
                  dispatch(updateAccount({
                     account: {
                        ...account,
                        ...updatedFields
                     },
                     history: updatedFields.balance ? {
                        balance: updatedFields.balance,
                        last_updated: getCurrentDate().toISOString().split("T")[0]
                     } : undefined
                  }));
               }
            }
         } else {
            // For new accounts, prepare creation data
            const creation = {
               name: data.name.trim(),
               balance: data.balance,
               type: data.type,
               image: data.image?.trim() || undefined,
               account_order: accounts.length
            };

            const result = await sendApiRequest<{ account_id: string }>(
               "dashboard/accounts", "POST", creation, dispatch, navigate, setError
            );

            if (typeof result === "object" && result?.account_id) {
               // Add new account for a valid response
               dispatch(addAccount({
                  ...creation,
                  account_id: result.account_id,
                  history: [{
                     balance: creation.balance,
                     last_updated: new Date().toISOString()
                  }]
               } as Account));

               onClose();
            }
         }
      } catch (error) {
         console.error("Failed to submit account form:", error);
      }
   };

   return (
      <Modal
         displayWarning = { Object.keys(dirtyFields).length > 0 }
         onClose = { onClose }
         open = { open }
         sx = { { position: "relative", width: { xs: "90%", md: "70%", lg: "60%", xl: "45%" }, p: { xs: 2, sm: 3 }, maxWidth: "90%" } }
      >
         <Stack
            direction = "column"
            spacing = { 3 }
         >
            <ModalSection title = "Details">
               <Box>
                  <form onSubmit = { handleSubmit(onSubmit) }>
                     <Stack
                        direction = "column"
                        spacing = { 2 }
                        sx = { { mt: 3 } }
                     >
                        <Controller
                           control = { control }
                           name = "name"
                           render = {
                              ({ field }) => (
                                 <FormControl error = { Boolean(errors.name) }>
                                    <InputLabel htmlFor = "name">
                                       Name
                                    </InputLabel>
                                    <OutlinedInput
                                       { ...field }
                                       aria-label = "Name"
                                       autoComplete = "none"
                                       autoFocus = { true }
                                       id = "name"
                                       label = "Name"
                                       type = "text"
                                       value = { field.value || "" }
                                    />
                                    <FormHelperText>
                                       { errors.name?.message?.toString() }
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                        <Controller
                           control = { control }
                           name = "balance"
                           render = {
                              ({ field }) => (
                                 <FormControl error = { Boolean(errors.balance) }>
                                    <InputLabel htmlFor = "balance">
                                       Balance
                                    </InputLabel>
                                    <OutlinedInput
                                       { ...field }
                                       aria-label = "Balance"
                                       id = "balance"
                                       inputProps = { { step: 0.01 } }
                                       label = "Balance"
                                       type = "number"
                                       value = { field.value || "" }
                                    />
                                    <FormHelperText>
                                       { errors.balance?.message?.toString() }
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                        <Controller
                           control = { control }
                           defaultValue = "Checking"
                           name = "type"
                           render = {
                              ({ field }) => (
                                 <FormControl
                                    error = { Boolean(errors.type) }
                                    sx = { { px: 0.75 } }
                                 >
                                    <InputLabel
                                       htmlFor = "type"
                                       sx = { { px: 0.75 } }
                                       variant = "standard"
                                    >
                                       Type
                                    </InputLabel>
                                    <NativeSelect
                                       { ...field }
                                       id = "type"
                                    >
                                       {
                                          accountTypes.map((key) => (
                                             <option
                                                key = { key }
                                                value = { key }
                                             >
                                                { key }
                                             </option>
                                          ))
                                       }
                                    </NativeSelect>
                                 </FormControl>
                              )
                           }
                        />
                        <Stack
                           direction = "column"
                           spacing = { 1 }
                        >
                           <AccountImage
                              clearErrors = { clearErrors }
                              control = { control }
                              errors = { errors }
                              setError = { setError }
                              setValue = { setValue }
                              value = { watch("image") }
                           />
                           <Button
                              className = "btn-primary"
                              color = "primary"
                              fullWidth = { true }
                              loading = { isSubmitting }
                              startIcon = { <FontAwesomeIcon icon = { updating ? faPenToSquare : faPlus } /> }
                              type = "submit"
                              variant = "contained"
                           >
                              { updating ? "Update" : "Create" }
                           </Button>
                           {
                              updating && (
                                 <AccountDeletion
                                    account = { account }
                                 />
                              )
                           }
                        </Stack>
                     </Stack>
                  </form>
               </Box>
            </ModalSection>
            {
               updating && (
                  <ModalSection title = "Analytics">
                     <AccountHistory
                        account = { account }
                     />
                  </ModalSection>
               )
            }
            {
               updating && account && (
                  <ModalSection title = "Transactions">
                     <Transactions
                        filter = "account"
                        identifier = { account.account_id }
                     />
                  </ModalSection>
               )
            }
         </Stack>
      </Modal>
   );
}