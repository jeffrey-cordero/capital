import { faBank, faChartLine, faMoneyBillTransfer } from "@fortawesome/free-solid-svg-icons";
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
import { type Account, accountSchema, TYPES } from "capital/accounts";
import { HTTP_STATUS } from "capital/server";
import type { Transaction } from "capital/transactions";
import { useCallback, useEffect, useMemo } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import AccountDeletion from "@/components/dashboard/accounts/delete";
import AccountImage from "@/components/dashboard/accounts/image";
import Transactions from "@/components/dashboard/transactions/transactions";
import Graph from "@/components/global/graph";
import Modal from "@/components/global/modal";
import Section from "@/components/global/section";
import SubmitButton from "@/components/global/submit";
import { sendApiRequest } from "@/lib/api";
import { getCurrentDate } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { addAccount, updateAccount } from "@/redux/slices/accounts";
import type { RootState } from "@/redux/store";

/**
 * Props for account creation and editing form
 *
 * @property {Account | undefined} account - Account to edit or undefined for creation
 * @property {boolean} open - Modal visibility state
 * @property {() => void} onClose - Function to call when modal closes
 */
interface AccountFormProps {
   account: Account | undefined;
   open: boolean;
   onClose: () => void;
}

/**
 * Account creation and editing form with validation, which includes
 * account history visualization and transaction listing for existing accounts
 *
 * @param {AccountFormProps} props - The props for the AccountForm component
 * @returns {React.ReactNode} Form modal with validation and submission handling
 */
export default function AccountForm({ account, open, onClose }: AccountFormProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);
   const transactions: Transaction[] = useSelector((state: RootState) => state.transactions.value);
   const isUpdating = account !== undefined;

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
      // Reset form values when modal visibility changes
      reset(account ? account : undefined, { keepDirty: false });
   }, [account, reset, open]);

   // Prepare account types for selection dropdown
   const accountTypes = useMemo(() => Array.from(TYPES), []);

   const onCancel = useCallback(() => {
      reset(account ? account : undefined, { keepDirty: false });
   }, [account, reset]);

   // Process form submission for both create and update operations
   const onSubmit = async(data: FieldValues) => {
      const account_order: number = account?.account_order ?? accounts.length;

      try {
         const fields = accountSchema.safeParse({
            ...data,
            name: data.name || "",
            account_order,
            last_updated: new Date().toISOString()
         });

         if (!fields.success) {
            handleValidationErrors(fields, setError);
            return;
         }

         if (isUpdating) {
            // Extract only modified fields for the update operation
            const updatedFields = Object.keys(dirtyFields).reduce((acc: Record<string, any>, record) => {
               acc[record] = fields.data[record as keyof typeof fields.data];

               return acc;
            }, {});

            if (Object.keys(updatedFields).length > 0) {
               updatedFields.last_updated = fields.data.last_updated;

               const result = await sendApiRequest<number>(
                  `dashboard/accounts/${account.account_id}`, "PUT", updatedFields, dispatch, navigate
               );

               if (result === HTTP_STATUS.NO_CONTENT) {
                  // Update local state after successful API call
                  dispatch(updateAccount({
                     ...updatedFields,
                     account_id: account.account_id
                  }));

                  // Reset form to new values
                  reset(updatedFields);
               }
            }
         } else {
            const result = await sendApiRequest<{ account_id: string }>(
               "dashboard/accounts", "POST", fields.data, dispatch, navigate, setError
            );

            if (typeof result === "object" && result?.account_id) {
               // Add new account to store after successful API call
               dispatch(addAccount({
                  ...fields.data,
                  account_id: result.account_id,
                  last_updated: new Date().toISOString()
               }));

               // Close modal after successful creation
               onClose();
            }
         }
      } catch (error) {
         console.error("Failed to submit account form:", error);
      }
   };

   // Generate account balance history data for visualization
   const history = useMemo(() => {
      // Initialize with the current account balance
      let balance: number = account?.balance || 0;
      const data: { date: string, value: number }[] = [{
         value: balance,
         date: getCurrentDate().toISOString().split("T")[0]
      }];

      transactions.forEach((transaction) => {
         // Process only transactions tied to the current account
         if (transaction.account_id !== account?.account_id) return;

         const [year, month] = transaction.date!.split("-");
         const [lastYear, lastMonth] = data[data.length - 1].date.split("-");

         if (lastMonth !== month || lastYear !== year) {
            // Add data point for each new month based on the current rolling balance
            data.push({
               value: balance,
               date: transaction.date!.split("T")[0]
            });
         }

         balance -= transaction.amount;
      });

      // Add historical data points for trend visualization
      const [lastYear, lastMonth] = data[data.length - 1].date!.split("-");
      data.push({
         value: balance,
         date: new Date(Number(lastYear), Number(lastMonth) - 2, 1).toISOString().split("T")[0]
      });

      // Add year-over-year comparison point
      if (lastMonth !== "01") {
         data.push({ value: balance, date: new Date(Number(lastYear) - 1, 11, 1).toISOString().split("T")[0] });
      }

      // Chronological order for the graph
      data.reverse();

      return { [account?.account_id || ""]: data };
   }, [account?.account_id, account?.balance, transactions]);

   return (
      <Modal
         displayWarning = { Object.keys(dirtyFields).length > 0 }
         onClose = { onClose }
         open = { open }
         sx = { { position: "relative", width: { xs: "90%", md: "70%", lg: "60%", xl: "45%" }, px: { xs: 2, sm: 3 }, py: 3, maxWidth: "90%" } }
      >
         <Stack
            direction = "column"
            spacing = { 3 }
         >
            <Section icon = { faBank }>
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
                                       inputProps = { { "data-testid": "account-name" } }
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
                                       inputProps = { { "data-testid": "account-balance", step: 0.01 } }
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
                                       inputProps = { { "data-testid": "account-type" } }
                                       label = "Type"
                                       slotProps = {
                                          {
                                             input: {
                                                id: "type"
                                             }
                                          }
                                       }
                                       value = { TYPES.has(field.value) ? field.value : "Checking" }
                                       variant = "outlined"
                                    >
                                       {
                                          accountTypes.map((type: string) => (
                                             <MenuItem
                                                key = { `account-type-${type}` }
                                                value = { type }
                                             >
                                                { type }
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
                              isUpdating && (
                                 <AccountDeletion
                                    account = { account }
                                 />
                              )
                           }
                           <SubmitButton
                              isSubmitting = { isSubmitting }
                              onCancel = { onCancel }
                              type = { isUpdating ? "Update" : "Create" }
                              visible = { Object.keys(dirtyFields).length > 0 }
                           />
                        </Stack>
                     </Stack>
                  </form>
               </Box>
            </Section>
            {
               isUpdating && (
                  <>
                     <Box sx = { { mb: "-25px !important" } }>
                        <Section
                           icon = { faChartLine }
                        >
                           <Graph
                              data = { history as any }
                              defaultValue = { account?.account_id || "" }
                              isAverage = { false }
                              isCard = { false }
                              isIndicators = { false }
                              title = { account?.name || "" }
                           />
                        </Section>
                     </Box>
                     <Section
                        icon = { faMoneyBillTransfer }
                     >
                        <Transactions
                           filter = "account"
                           identifier = { account.account_id }
                        />
                     </Section>
                  </>
               )
            }
         </Stack>
      </Modal>
   );
}