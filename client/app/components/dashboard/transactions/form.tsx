import { faMoneyBillTransfer } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
import { Modal, Section } from "@/components/global/modal";
import SubmitButton from "@/components/global/submit";
import { sendApiRequest } from "@/lib/api";
import { getDateRange } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { addTransaction, updateTransaction } from "@/redux/slices/transactions";
import type { RootState } from "@/redux/store";

/**
 * Props for the TransactionForm component.
 *
 * @interface TransactionFormProps
 * @property {Transaction | undefined} transaction - The transaction to edit.
 * @property {Record<string, Account>} accountsMap - The mapping of accounts IDs to accounts.
 * @property {Record<string, BudgetType>} budgetsMap - The mapping of budget category IDs to budget types.
 * @property {boolean} open - Whether the modal is open.
 * @property {number} index - The index of the transaction in the transactions array.
 * @property {() => void} onClose - The function to call when the modal is closed.
 * @property {"account" | "budget"} filter - The filter to base the potential default values on.
 * @property {string | undefined} identifier - The identifier used to apply the potential default values.
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
 * The TransactionForm component for creating/editing transactions.
 *
 * @param {TransactionFormProps} props - The props for the TransactionForm component
 * @returns {React.ReactNode} The TransactionForm component
 */
export default function TransactionForm({ transaction, accountsMap, budgetsMap, open, index, onClose, filter, identifier }: TransactionFormProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate(), theme = useTheme();
   const updating = transaction !== undefined;
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);
   const budgets: OrganizedBudgets = useSelector((state: RootState) => state.budgets.value);

   // Setup the react-hook-form instance
   const {
      control,
      handleSubmit,
      reset,
      setError,
      clearErrors,
      formState: { isSubmitting, errors, dirtyFields }
   } = useForm({
      defaultValues: {
         amount: 0, date: "", description: "", account_id: "", budget_category_id: ""
      }
   });

   // Memoize the default values based on the filter and identifier
   const defaultAccountID: string = useMemo(() => {
      if (filter === "account") {
         return accounts.find((acc) => acc.account_id === identifier)?.account_id || "";
      }

      return "";
   }, [filter, identifier, accounts]);

   const defaultBudgetCategoryID: string = useMemo(() => {
      if (filter === "budget") {
         return budgets[identifier as BudgetType]?.budget_category_id;
      }

      return "";
   }, [filter, identifier, budgets]);

   // Setup minimum and maximum dates for transactions
   const [minDate, maxDate] = useMemo(() => getDateRange(), []);

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

   // Memoize the account and budget category options
   const accountOptions = useMemo(() => {
      return Object.values(accountsMap);
   }, [accountsMap]);

   const incomeCategoryOptions = useMemo(() => {
      return Object.values(budgets.Income.categories || []);
   }, [budgets.Income]);

   const expenseCategoryOptions = useMemo(() => {
      return Object.values(budgets.Expenses.categories || []);
   }, [budgets.Expenses]);

   const onSubmit = async(data: FieldValues) => {
      try {
         // Validate the form data against the transaction schema
         const type: BudgetType = data.budget_category_id ? budgetsMap[data.budget_category_id] : (data.amount >= 0 ? "Income" : "Expenses");
         const fields = transactionSchema.safeParse({ ...data, type: type });

         if (!fields.success) {
            handleValidationErrors(fields, setError);
            return;
         }

         if (updating) {
            // Format the updated fields payload
            const updatedFields = Object.keys(dirtyFields).reduce((acc: Record<string, any>, record) => {
               acc[record] = fields?.data?.[record as keyof typeof fields.data];

               return acc;
            }, {} as Partial<Transaction>);

            if (Object.keys(updatedFields).length > 0) {
               updatedFields.type = type;
               const result = await sendApiRequest<number>(
                  `dashboard/transactions/${transaction.transaction_id}`, "PUT", updatedFields, dispatch, navigate
               );

               if (result === 204) {
                  // Update the transaction in the Redux store and close the modal
                  dispatch(updateTransaction({ index, transaction: updatedFields }));
                  onClose();
               }
            }
         } else {
            const payload = {
               ...fields.data,
               type: type,
               budget_category_id: fields.data.budget_category_id || null
            } as Transaction;

            const result = await sendApiRequest<{ transaction_id: string }>(
               "dashboard/transactions", "POST", payload, dispatch, navigate, setError
            );

            if (result instanceof Object && "transaction_id" in result) {
               // Add the transaction to the Redux store and close the modal
               dispatch(addTransaction({ ...payload, transaction_id: result.transaction_id }));
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
         <Section
            title = {
               <FontAwesomeIcon
                  icon = { faMoneyBillTransfer }
                  size = "lg"
               />
            }
         >
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