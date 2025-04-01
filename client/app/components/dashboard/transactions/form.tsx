import { faFloppyDisk, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   FormControl,
   FormHelperText,
   InputLabel,
   ListSubheader,
   MenuItem,
   OutlinedInput,
   Select,
   Stack,
   TextField
} from "@mui/material";
import { type Account } from "capital/accounts";
import { type BudgetType, type OrganizedBudgets } from "capital/budgets";
import { useEffect, useMemo } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import { Modal, ModalSection } from "@/components/global/modal";
import { normalizeDate } from "@/lib/dates";
import type { Transaction } from "@/redux/slices/transactions";
import type { RootState } from "@/redux/store";
import { transactionSchema } from "capital/transactions";
import { handleValidationErrors } from "@/lib/validation";

/**
 * Props for the TransactionForm component.
 *
 * @interface TransactionFormProps
 * @property {Transaction | undefined} transaction - The transaction to edit
 * @property {boolean} open - Whether the modal is open
 * @property {() => void} onClose - The function to call when the modal is closed
 */
interface TransactionFormProps {
   transaction: Transaction | undefined;
   open: boolean;
   onClose: () => void;
}

/**
 * The TransactionForm component for creating/editing transactions.
 *
 * @param {TransactionFormProps} props - The props for the TransactionForm component
 * @returns {React.ReactNode} The TransactionForm component
 */
export default function TransactionForm({ transaction, open, onClose }: TransactionFormProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const updating = transaction !== undefined;
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);
   const budgets: OrganizedBudgets = useSelector((state: RootState) => state.budgets.value);

   // Setup form with default values
   const {
      control,
      handleSubmit,
      reset,
      setError,
      clearErrors,
      watch,
      setValue,
      formState: { isSubmitting, errors, dirtyFields }
   } = useForm({
      defaultValues: {
         title: "", amount: 0, date: "", description: "", account_id: "", budget_category_id: ""
      }
   });

   // Handle swapping between income and expenses based on current amount input
   const amount = watch("amount");

   const transactionType: BudgetType | null = useMemo(() => {
      if (amount >= 0 || !amount) return "Income";
      if (amount < 0) return "Expenses";

      return null;
   }, [amount]);

   // Handle resetting the form when the modal visibility changes
   useEffect(() => {
      if (open) {
         if (transaction) {
            reset({
               ...transaction,
               date: transaction.date,
               account_id: transaction.account_id ?? "",
               budget_category_id: transaction.budget_category_id ?? ""
            });
         } else {
            reset({
               title: "", amount: 0, date: "", description: "",
               account_id: "", budget_category_id: ""
            });
         }
      } else {
         clearErrors();
      }
   }, [transaction, open, reset, clearErrors]);

   // Account and budget category selections
   const accountOptions = useMemo(() => {
      return Object.values(accounts.reduce((acc: Record<string, Account>, record) => {
         acc[record.account_id] = record;

         return acc;
      }, {}));
   }, [accounts]);

   const incomeCategoryOptions = useMemo(() => {
      return Object.values(budgets.Income?.categories ?? []);
   }, [budgets.Income]);

   const expenseCategoryOptions = useMemo(() => {
      return Object.values(budgets.Expenses?.categories ?? []);
   }, [budgets.Expenses]);

   const onSubmit = async(data: FieldValues) => {
      try {
         if (updating && transaction) {
            console.log("UPDATE");
         } else {
            const fields = transactionSchema.safeParse(data);
            console.log(data)

            if (!fields.success) {
               handleValidationErrors(fields, setError);
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
         sx = { { width: { xs: "95%", sm: "80%", md: "60%", lg: "50%" }, p: { xs: 2, sm: 3 } } }
      >
         <ModalSection title = "Details">
            <Box sx = { { mt: 2 } }>
               <form onSubmit = { handleSubmit(onSubmit) }>
                  <Stack spacing = { 2.5 }>
                     <Controller
                        control = { control }
                        name = "title"
                        render = {
                           ({ field }) => (
                              <FormControl
                                 error = { Boolean(errors.title) }
                                 fullWidth = { true }
                              >
                                 <InputLabel htmlFor = "title">
                                    Title
                                 </InputLabel>
                                 <OutlinedInput
                                    { ...field }
                                    autoComplete = "off"
                                    id = "title"
                                    label = "Title"
                                 />
                                 <FormHelperText>
                                    { errors.title?.message }
                                 </FormHelperText>
                              </FormControl>
                           )
                        }
                     />
                     <Stack
                        direction = { { xs: "column", sm: "row" } }
                        spacing = { 2.5 }
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
                                       id = "date"
                                       label = "Date"
                                       size = "medium"
                                       slotProps = {
                                          {
                                             inputLabel: {
                                                shrink: true
                                             }
                                          }
                                       }
                                       type = "date"
                                       value = { field.value || "" }
                                       error = { Boolean(errors.date) }
                                       sx = {{ "& .MuiOutlinedInput-input": { color: Boolean(errors.date) ? "red" : "inherit" } }}
                                    />
                                    <FormHelperText>
                                       { errors.date?.message }
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
                                    <InputLabel htmlFor = "amount">Amount</InputLabel>
                                    <OutlinedInput
                                       { ...field }
                                       autoComplete = "off"
                                       id = "amount"
                                       inputProps = { { step: 0.01 } }
                                       label = "Amount"
                                       type = "number"
                                       value = { field.value || "" }
                                    />
                                    <FormHelperText>
                                       { errors.amount?.message }
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
                                 <InputLabel
                                    htmlFor = "description"
                                    shrink = { true }
                                    variant = "outlined"
                                 >
                                    Description
                                 </InputLabel>
                                 <TextField
                                    { ...field }
                                    id = "description"
                                    multiline = { true }
                                    placeholder = "Add details"
                                    minRows = { 3 }
                                    variant = "outlined"
                                 />
                                 <FormHelperText>
                                    { errors.description?.message }
                                 </FormHelperText>
                              </FormControl>
                           )
                        }
                     />
                     <Stack
                        direction = { { xs: "column", sm: "row" } }
                        spacing = { 2.5 }
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
                                       sx = { { px: 0.75 } }
                                       variant = "outlined"
                                    >
                                       Account
                                    </InputLabel>
                                    <Select
                                       { ...field }
                                       id = "account_id"
                                       label = "Account"
                                       value = { field.value || "" }
                                    >
                                       <MenuItem
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
                                       { errors.account_id?.message }
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                        <Controller
                           control = { control }
                           name = "budget_category_id"
                           render = {
                              ({ field }) => (
                                 <FormControl
                                    error = { Boolean(errors.budget_category_id) }
                                    fullWidth = { true }
                                 >
                                    <InputLabel
                                       htmlFor = "budget_category_id"
                                       sx = { { px: 0.75 } }
                                       variant = "outlined"
                                    >
                                       Category
                                    </InputLabel>
                                    <Select
                                       { ...field }
                                       id = "budget_category_id"
                                       label = "Category"
                                       value = { field.value || "" }
                                    >
                                       <MenuItem value = "">
                                          -- Select Category --
                                       </MenuItem>
                                       {
                                          transactionType === "Income" && (
                                             <Box>
                                                <MenuItem value = { budgets.Income.budget_category_id } sx = {{ fontWeight: "bold" }}>
                                                   Income
                                                </MenuItem>
                                                {
                                                   incomeCategoryOptions.map((category) => (
                                                      <MenuItem
                                                         key = { `income-category-${category.budget_category_id}` }
                                                         value = { category.budget_category_id }
                                                         sx = {{ pl: 3.5 }}
                                                      >
                                                         { category.name }
                                                      </MenuItem>
                                                   ))
                                                }
                                             </Box>
                                          )
                                       }
                                       {
                                          transactionType === "Expenses" && (
                                             <Box>
                                                <MenuItem value = { budgets.Expenses.budget_category_id } sx = {{ fontWeight: "bold" }}>
                                                   Expenses
                                                </MenuItem>
                                                {
                                                   expenseCategoryOptions.map((category) => (
                                                      <MenuItem
                                                         key = { `expense-category-${category.budget_category_id}` }
                                                         value = { category.budget_category_id }
                                                         sx = {{ pl: 3.5 }}
                                                      >
                                                         { category.name }
                                                      </MenuItem>
                                                   ))
                                                }
                                             </Box>
                                          )
                                       }
                                    </Select>
                                    <FormHelperText>
                                       { errors.budget_category_id?.message }
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                     </Stack>
                     <Button
                        className = "btn-primary"
                        color = "primary"
                        disabled = { isSubmitting }
                        fullWidth = { true }
                        startIcon = { <FontAwesomeIcon icon = { updating ? faFloppyDisk : faPlus } /> }
                        sx = { { mt: 2, py: 1.2 } }
                        type = "submit"
                        variant = "contained"
                     >
                        { updating ? "Update" : "Create" }
                     </Button>
                  </Stack>
               </form>
            </Box>
         </ModalSection>
      </Modal>
   );
}