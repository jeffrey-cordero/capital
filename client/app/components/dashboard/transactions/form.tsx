import { faMoneyBillTransfer } from "@fortawesome/free-solid-svg-icons";
import {
   Box,
   FormControl,
   FormHelperText,
   InputLabel,
   MenuItem,
   OutlinedInput,
   Select,
   Stack,
   TextField,
   useTheme
} from "@mui/material";
import { type Account } from "capital/accounts";
import { type BudgetType, type OrganizedBudgets } from "capital/budgets";
import { type Transaction, transactionSchema } from "capital/transactions";
import { useCallback, useEffect, useMemo } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import { RenderAccountChip, RenderCategoryChip } from "@/components/dashboard/transactions/render";
import Modal from "@/components/global/modal";
import Section from "@/components/global/section";
import SubmitButton from "@/components/global/submit";
import { sendApiRequest } from "@/lib/api";
import { getValidDateRange } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { addTransaction, updateTransaction } from "@/redux/slices/transactions";
import type { RootState } from "@/redux/store";

/**
 * Props for the TransactionForm component
 *
 * @property {Transaction | undefined} transaction - Transaction to edit or undefined for creation
 * @property {Record<string, Account>} accountsMap - Mapping of account IDs to accounts
 * @property {Record<string, BudgetType>} budgetsMap - Mapping of budget category IDs to budget types
 * @property {boolean} open - Whether the modal is open
 * @property {number} index - Index of the transaction in the transactions array
 * @property {() => void} onClose - Function to call when modal closes
 * @property {"account" | "budget"} filter - Filter to base potential default values on
 * @property {string | undefined} identifier - Identifier for applying default values
 */
interface TransactionFormProps {
   transaction: Transaction | undefined;
   accountsMap: Record<string, Account>;
   budgetsMap: Record<string, BudgetType>;
   open: boolean;
   index: number;
   onClose: () => void;
   filter: "account" | "budget" | undefined;
   identifier: string | undefined;
}

/**
 * Transaction creation and editing form with validation
 *
 * @param {TransactionFormProps} props - The TransactionForm component props
 * @returns {React.ReactNode} Transaction form modal
 */
export default function TransactionForm({ transaction, accountsMap, budgetsMap, open, index, onClose, filter, identifier }: TransactionFormProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate(), theme = useTheme();
   const updating = transaction !== undefined;
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);
   const budgets: OrganizedBudgets = useSelector((state: RootState) => state.budgets.value);

   // Form setup with react-hook-form
   const {
      control,
      handleSubmit,
      reset,
      setError,
      clearErrors,
      formState: { isSubmitting, errors, dirtyFields } } = useForm({
      defaultValues: {
         amount: 0,
         date: "",
         description: "",
         account_id: "",
         budget_category_id: ""
      }
   });

   // Default selection values for new transactions based on the potential filter and identifier
   const [defaultAccountID, defaultBudgetCategoryID] = useMemo(() => {
      return [
         filter === "account" ? accounts.find((a) => a.account_id === identifier)?.account_id || "" : "",
         filter === "budget" ? budgets[identifier as BudgetType]?.budget_category_id || "" : ""
      ];
   }, [filter, identifier, accounts, budgets]);

   // Account and budget category selection options
   const [accountOptions, incomeCategoryOptions, expenseCategoryOptions] = useMemo(() => {
      return [
         Object.values(accountsMap),
         Object.values(budgets.Income.categories || []),
         Object.values(budgets.Expenses.categories || [])
      ];
   }, [accountsMap, budgets.Income.categories, budgets.Expenses.categories]);

   // Minimum and maximum potential dates for valid transactions
   const [minDate, maxDate] = useMemo(() => getValidDateRange(), []);

   const onReset = useCallback(() => {
      if (transaction) {
         reset({
            ...transaction,
            date: transaction.date.split("T")[0],
            account_id: transaction.account_id || "",
            budget_category_id: transaction.budget_category_id || ""
         });
      } else {
         reset({
            amount: 0,
            date: maxDate,
            description: "",
            account_id: defaultAccountID,
            budget_category_id: defaultBudgetCategoryID
         });
      }
   }, [transaction, reset, defaultAccountID, defaultBudgetCategoryID, maxDate]);

   // Reset the default form values when the modal visibility changes
   useEffect(() => {
      if (open) {
         onReset();
      } else {
         clearErrors();
      }
   }, [open, onReset, clearErrors]);

   const onSubmit = async(data: FieldValues) => {
      try {
         // Ignore empty updates
         if (Object.keys(dirtyFields).length === 0) return;

         // Normalize transaction type based on the budget category ID or amount
         const type: BudgetType = data.budget_category_id ? budgetsMap[data.budget_category_id] : (data.amount >= 0 ? "Income" : "Expenses");
         const fields = transactionSchema.safeParse({
            ...data,
            type: type
         });

         if (!fields.success) {
            // Invalid transaction inputs
            handleValidationErrors(fields, setError);
            return;
         }

         if (updating) {
            // Normalize the updated fields payload for the API request
            const updatedFields = Object.keys(dirtyFields).reduce((acc: Record<string, any>, record) => {
               acc[record] = fields?.data?.[record as keyof typeof fields.data];

               return acc;
            }, { type } as Partial<Transaction>);

            // Submit the API request for the updated transaction
            const result = await sendApiRequest<number>(
               `dashboard/transactions/${transaction.transaction_id}`, "PUT", updatedFields, dispatch, navigate
            );

            if (result === 204) {
               // Update the transaction in the Redux store and close the modal
               dispatch(updateTransaction({ index, transaction: updatedFields }));
               onClose();
            }
         } else {
            // Normalize the transaction payload for the API request
            const payload = {
               ...fields.data,
               type: type,
               budget_category_id: fields.data.budget_category_id || null
            } as Transaction;

            // Submit the API request for the new transaction
            const result = await sendApiRequest<{ transaction_id: string }>(
               "dashboard/transactions", "POST", payload, dispatch, navigate, setError
            );

            if (result instanceof Object && "transaction_id" in result) {
               // Add the transaction to the Redux store and close the modal
               dispatch(addTransaction({
                  ...payload,
                  transaction_id: result.transaction_id
               }));
               onClose();
            }
         }
      } catch (error) {
         console.error("Transaction form submission error:", error);
      }
   };

   return (
      <Modal
         displayWarning = { Object.keys(dirtyFields).length > 0 }
         onClose = { onClose }
         open = { open }
         sx = { { width: { xs: "95%", sm: "80%", md: "60%", lg: "50%" }, px: { xs: 2, sm: 3 }, py: 3, maxWidth: "95%" } }
      >
         <Section icon = { faMoneyBillTransfer }>
            <Box sx = { { mt: 2 } }>
               <form onSubmit = { handleSubmit(onSubmit) }>
                  <Stack
                     direction = "column"
                     spacing = { 1 }
                  >
                     <Stack
                        direction = { { xs: "column", sm: "row" } }
                        spacing = { 1 }
                     >
                        <Controller
                           control = { control }
                           name = "date"
                           render = {
                              ({ field }) => (
                                 <FormControl
                                    error = { Boolean(errors.date) }
                                    fullWidth = { true }
                                 >
                                    <TextField
                                       { ...field }
                                       error = { Boolean(errors.date) }
                                       id = "date"
                                       label = "Date"
                                       size = "medium"
                                       slotProps = {
                                          {
                                             htmlInput: {
                                                min: minDate,
                                                max: maxDate
                                             },
                                             inputLabel: {
                                                shrink: true
                                             }
                                          }
                                       }
                                       sx = {
                                          {
                                             colorScheme: theme.palette.mode === "dark" ? "dark" : "inherit"
                                          }
                                       }
                                       type = "date"
                                       value = { field.value || "" }
                                    />
                                    <FormHelperText>
                                       { errors.date?.message?.toString() }
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                        <Controller
                           control = { control }
                           name = "amount"
                           render = {
                              ({ field }) => (
                                 <FormControl
                                    error = { Boolean(errors.amount) }
                                    fullWidth = { true }
                                 >
                                    <InputLabel htmlFor = "amount">
                                       Amount
                                    </InputLabel>
                                    <OutlinedInput
                                       { ...field }
                                       aria-label = "Amount"
                                       id = "amount"
                                       inputProps = { { step: 0.01 } }
                                       label = "Amount"
                                       type = "number"
                                       value = { field.value || "" }
                                    />
                                    <FormHelperText>
                                       { errors.amount?.message?.toString() }
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                     </Stack>
                     <Controller
                        control = { control }
                        name = "description"
                        render = {
                           ({ field }) => (
                              <FormControl
                                 error = { Boolean(errors.description) }
                                 fullWidth = { true }
                              >
                                 <TextField
                                    { ...field }
                                    error = { Boolean(errors.description) }
                                    id = "description"
                                    label = "Description"
                                    minRows = { 3 }
                                    multiline = { true }
                                    variant = "outlined"
                                 />
                                 <FormHelperText>
                                    { errors.description?.message?.toString() }
                                 </FormHelperText>
                              </FormControl>
                           )
                        }
                     />
                     <Stack
                        direction = { { xs: "column", sm: "row" } }
                        spacing = { 1 }
                     >
                        <Controller
                           control = { control }
                           name = "account_id"
                           render = {
                              ({ field }) => (
                                 <FormControl
                                    error = { Boolean(errors.account_id) }
                                    fullWidth = { true }
                                 >
                                    <InputLabel
                                       htmlFor = "account_id"
                                       variant = "outlined"
                                    >
                                       Account
                                    </InputLabel>
                                    <Select
                                       { ...field }
                                       defaultValue = { budgets.Income.budget_category_id }
                                       label = "Account"
                                       renderValue = {
                                          (value) => (
                                             <RenderAccountChip
                                                account_id = { value }
                                             />
                                          )
                                       }
                                       slotProps = {
                                          {
                                             input: {
                                                id: "account_id"
                                             }
                                          }
                                       }
                                       value = { field.value || "" }
                                       variant = "outlined"
                                    >
                                       <MenuItem
                                          sx = { { color: "transparent" } }
                                          value = ""
                                       >
                                          -- Select Account --
                                       </MenuItem>
                                       {
                                          accountOptions.map((account) => (
                                             <MenuItem
                                                key = { `account-option-${account.account_id}` }
                                                value = { account.account_id }
                                             >
                                                { account.name }
                                             </MenuItem>
                                          ))
                                       }
                                    </Select>
                                    <FormHelperText>
                                       { errors.account_id?.message?.toString() }
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                        <Controller
                           control = { control }
                           defaultValue = { budgets.Income.budget_category_id }
                           name = "budget_category_id"
                           render = {
                              ({ field }) => (
                                 <FormControl
                                    error = { Boolean(errors.budget_category_id) }
                                    fullWidth = { true }
                                 >
                                    <InputLabel
                                       htmlFor = "budget_category_id"
                                       variant = "outlined"
                                    >
                                       Category
                                    </InputLabel>
                                    <Select
                                       { ...field }
                                       label = "Category"
                                       renderValue = {
                                          (value) => (
                                             <RenderCategoryChip
                                                budget_category_id = { value }
                                                type = { budgetsMap[value] || "Income" }
                                             />
                                          )
                                       }
                                       slotProps = {
                                          {
                                             input: {
                                                id: "budget_category_id"
                                             }
                                          }
                                       }
                                       value = { field.value || "" }
                                    >
                                       <MenuItem
                                          sx = { { fontWeight: "bold" } }
                                          value = { budgets.Income.budget_category_id }
                                       >
                                          Income
                                       </MenuItem>
                                       {
                                          incomeCategoryOptions.map((category) => (
                                             <MenuItem
                                                key = { `income-category-${category.budget_category_id}` }
                                                sx = { { pl: 3.5 } }
                                                value = { category.budget_category_id }
                                             >
                                                { category.name }
                                             </MenuItem>
                                          ))
                                       }
                                       <MenuItem
                                          sx = { { fontWeight: "bold" } }
                                          value = { budgets.Expenses.budget_category_id }
                                       >
                                          Expenses
                                       </MenuItem>
                                       {
                                          expenseCategoryOptions.map((category) => (
                                             <MenuItem
                                                key = { `expense-category-${category.budget_category_id}` }
                                                sx = { { pl: 3.5 } }
                                                value = { category.budget_category_id }
                                             >
                                                { category.name }
                                             </MenuItem>
                                          ))
                                       }
                                    </Select>
                                    <FormHelperText>
                                       { errors.budget_category_id?.message?.toString() }
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                     </Stack>
                     <SubmitButton
                        isSubmitting = { isSubmitting }
                        onCancel = { onClose }
                        type = { updating ? "Update" : "Create" }
                        visible = { true }
                     />
                  </Stack>
               </form>
            </Box>
         </Section>
      </Modal>
   );
}