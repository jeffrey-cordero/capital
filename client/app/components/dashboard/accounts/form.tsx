import {
   Box,
   FormControl,
   FormHelperText,
   InputLabel,
   MenuItem,
   OutlinedInput,
   Select,
   Stack
} from "@mui/material";
import { type Account, accountSchema, types } from "capital/accounts";
import { useCallback, useEffect, useMemo } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import AccountDeletion from "@/components/dashboard/accounts/delete";
import AccountImage from "@/components/dashboard/accounts/image";
import Transactions from "@/components/dashboard/transactions/transactions";
import { Modal, ModalSection } from "@/components/global/modal";
import SubmitButton from "@/components/global/submit";
import { sendApiRequest } from "@/lib/api";
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

   useEffect(() => {
      reset(account ? account : undefined, { keepDirty: false });
   }, [account, reset, open]);

   // Memoize account types for selection input
   const accountTypes = useMemo(() => Array.from(types), []);

   const onCancel = useCallback(() => {
      reset(account ? account : undefined, { keepDirty: false });
   }, [account, reset]);

   // Handles form submission for both create and update operations
   const onSubmit = async(data: FieldValues) => {
      const account_order: number = account?.account_order ?? accounts.length;

      try {
         const fields = accountSchema.safeParse({ ...data, account_order, last_updated: new Date().toISOString() });

         if (!fields.success) {
            handleValidationErrors(fields, setError);
            return;
         }

         if (updating) {
            // For updates, only send modified fields
            const updatedFields = Object.keys(dirtyFields).reduce((acc: Record<string, any>, record) => {
               acc[record] = fields.data[record as keyof typeof fields.data];

               return acc;
            }, {});

            // Only proceed if there are actual changes
            if (Object.keys(updatedFields).length > 0) {
               updatedFields.last_updated = fields.data.last_updated;

               const result = await sendApiRequest<number>(
                  `dashboard/accounts/${account.account_id}`, "PUT", updatedFields, dispatch, navigate
               );

               if (result === 204) {
                  // Update account for a valid response
                  dispatch(updateAccount({
                     ...updatedFields,
                     account_id: account.account_id
                  }));
                  reset(updatedFields);
               }
            }
         } else {
            const result = await sendApiRequest<{ account_id: string }>(
               "dashboard/accounts", "POST", fields.data, dispatch, navigate, setError
            );

            if (typeof result === "object" && result?.account_id) {
               // Add new account for a valid response
               dispatch(addAccount({
                  ...fields.data,
                  account_id: result.account_id,
                  last_updated: new Date().toISOString()
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
                        spacing = { 1.5 }
                        sx = { { mt: 2 } }
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
                                    fullWidth = { true }
                                 >
                                    <InputLabel
                                       htmlFor = "type"
                                       variant = "outlined"
                                    >
                                       Type
                                    </InputLabel>
                                    <Select
                                       { ...field }
                                       label = "Type"
                                       slotProps = {
                                          {
                                             input: {
                                                id: "type"
                                             }
                                          }
                                       }
                                       value = { types.has(field.value) ? field.value : "Checking" }
                                       variant = "outlined"
                                    >
                                       {
                                          accountTypes.map((key) => (
                                             <MenuItem
                                                key = { key }
                                                value = { key }
                                             >
                                                { key }
                                             </MenuItem>
                                          ))
                                       }
                                    </Select>
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
                           {
                              updating && (
                                 <AccountDeletion
                                    account = { account }
                                 />
                              )
                           }
                           <SubmitButton
                              isSubmitting = { isSubmitting }
                              onCancel = { onCancel }
                              type = { updating ? "Update" : "Create" }
                              visible = { Object.keys(dirtyFields).length > 0 }
                           />
                        </Stack>
                     </Stack>
                  </form>
               </Box>
            </ModalSection>
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