import { faFloppyDisk, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   FormControl,
   FormHelperText,
   InputLabel,
   MenuItem,
   OutlinedInput,
   Select,
   Stack,
   TextField
} from "@mui/material";
import { type Account } from "capital/accounts";
import { type BudgetType, type OrganizedBudgets } from "capital/budgets";
import { type Transaction, transactionSchema } from "capital/transactions";
import { useEffect, useMemo } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import { Modal, ModalSection } from "@/components/global/modal";
import { sendApiRequest } from "@/lib/api";
import { handleValidationErrors } from "@/lib/validation";
import { addTransaction, updateTransaction } from "@/redux/slices/transactions";
import type { RootState } from "@/redux/store";

/**
 * Props for the TransactionForm component.
 *
 * @interface TransactionFormProps
 * @property {Transaction | undefined} transaction - The transaction to edit.
 * @property {Record<string, Account>} accountsMap - The mapping of accounts IDs to accounts.
 * @property {boolean} open - Whether the modal is open.
 * @property {number} index - The index of the transaction in the transactions array.
 * @property {() => void} onClose - The function to call when the modal is closed.
 */
interface TransactionFormProps {
   transaction: Transaction | undefined;
   accountsMap: Record<string, Account>;
   open: boolean;
   index: number;
   onClose: () => void;
}

/**
 * The TransactionForm component for creating/editing transactions.
 *
 * @param {TransactionFormProps} props - The props for the TransactionForm component
 * @returns {React.ReactNode} The TransactionForm component
 */
export default function TransactionForm({ transaction, accountsMap, open, index, onClose }: TransactionFormProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const updating = transaction !== undefined;
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
         amount: 0, date: "", description: "", account_id: "", budget_category_id: ""
      }
   });

   // Handle swapping between income and expenses based on current amount input
   const amount = watch("amount");

   const transactionType: BudgetType | null = useMemo(() => {
      if (amount >= 0 || !amount) return "Income";
      if (amount < 0) return "Expenses";

      return null;
   }, [amount]);
   const disableIncome: boolean = transactionType !== "Income";
   const disableExpenses: boolean = !disableIncome;

   useEffect(() => {
      setValue(
         "budget_category_id",
         disableIncome ? budgets.Expenses.budget_category_id : budgets.Income.budget_category_id,
         { shouldDirty: true }
      );
   }, [disableIncome, budgets.Expenses.budget_category_id, budgets.Income.budget_category_id, setValue]);

   // Handle resetting the form when the modal visibility changes
   useEffect(() => {
      if (open) {
         if (transaction) {
            reset({
               ...transaction,
               date: transaction.date.split("T")[0],
               account_id: transaction.account_id ?? "",
               budget_category_id: transaction.budget_category_id ?? ""
            });
         } else {
            reset({
               amount: 0, date: "", description: "", account_id: "", budget_category_id: ""
            });
         }
      } else {
         clearErrors();
      }
   }, [transaction, open, reset, clearErrors]);

   // Account and budget category selections
   const accountOptions = useMemo(() => {
      return Object.values(accountsMap);
   }, [accountsMap]);

   const incomeCategoryOptions = useMemo(() => {
      return Object.values(budgets.Income.categories || []);
   }, [budgets.Income]);

   const expenseCategoryOptions = useMemo(() => {
      return Object.values(budgets.Expenses.categories || []);
   }, [budgets.Expenses]);

   const onSubmit = async (data: FieldValues) => {
      try {
         // Validate the form data against the transaction schema
         const fields = transactionSchema.safeParse(data);

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
               const result = await sendApiRequest<number>(
                  `dashboard/transactions/${transaction.transaction_id}`, "PUT", updatedFields, dispatch, navigate
               );

               if (result === 204) {
                  // Update the transaction in the Redux store
                  dispatch(updateTransaction({ index, transaction: updatedFields }));

                  // Reset the form to the updated fields
                  reset({
                     ...updatedFields,
                     date: updatedFields.date ? updatedFields.date.split("T")[0] : undefined
                  });
               }
            }
         } else {
            // Format the construction payload
            const payload = {
               ...fields.data,
               amount: parseFloat(data.amount),
               date: new Date(data.date).toISOString(),
               budget_category_id: data.budget_category_id || (
                  data.amount >= 0 ? budgets.Income.budget_category_id : budgets.Expenses.budget_category_id
               )
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
         displayWarning={Object.keys(dirtyFields).length > 0}
         onClose={onClose}
         open={open}
         sx={{ width: { xs: "95%", sm: "80%", md: "60%", lg: "50%" }, p: { xs: 2, sm: 3 } }}
      >
         <ModalSection title="Transaction">
            <Box sx={{ mt: 2 }}>
               <form onSubmit={handleSubmit(onSubmit)}>
                  <Stack direction="column" spacing={1}>
                     <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                     >
                        <Controller
                           control={control}
                           name="amount"
                           render={
                              ({ field }) => (
                                 <FormControl
                                    error={Boolean(errors.amount)}
                                    fullWidth={true}
                                 >
                                    <InputLabel
                                       htmlFor="amount"
                                       variant="outlined"
                                    >
                                       Amount
                                    </InputLabel>
                                    <OutlinedInput
                                       {...field}
                                       autoComplete="off"
                                       id="amount"
                                       inputProps={{ step: 0.01 }}
                                       label="Amount"
                                       type="number"
                                       value={field.value || ""}
                                    />
                                    <FormHelperText>
                                       {errors.amount?.message}
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                        <Controller
                           control={control}
                           name="date"
                           render={
                              ({ field }) => (
                                 <FormControl
                                    error={Boolean(errors.date)}
                                    fullWidth={true}
                                 >
                                    <TextField
                                       {...field}
                                       error={Boolean(errors.date)}
                                       id="date"
                                       label="Date"
                                       size="medium"
                                       slotProps={
                                          {
                                             inputLabel: {
                                                shrink: true
                                             }
                                          }
                                       }
                                       sx={{ "& .MuiOutlinedInput-input": { color: errors.date ? "red" : "inherit" } }}
                                       type="date"
                                       value={field.value || ""}
                                    />
                                    <FormHelperText>
                                       {errors.date?.message}
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                     </Stack>
                     <Controller
                        control={control}
                        name="description"
                        render={
                           ({ field }) => (
                              <FormControl
                                 error={Boolean(errors.description)}
                                 fullWidth={true}
                              >
                                 <TextField
                                    {...field}
                                    id="description"
                                    label="Description"
                                    minRows={3}
                                    multiline={true}
                                    placeholder="Add details"
                                    variant="outlined"
                                 />
                                 <FormHelperText>
                                    {errors.description?.message}
                                 </FormHelperText>
                              </FormControl>
                           )
                        }
                     />
                     <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                     >
                        <Controller
                           control={control}
                           name="account_id"
                           render={
                              ({ field }) => (
                                 <FormControl
                                    error={Boolean(errors.account_id)}
                                    fullWidth={true}
                                 >
                                    <InputLabel
                                       htmlFor="account_id"
                                       variant="outlined"
                                    >
                                       Account
                                    </InputLabel>
                                    <Select
                                       {...field}
                                       label="Account"
                                       variant="outlined"
                                       value={field.value || ""}
                                       defaultValue={budgets.Income.budget_category_id}
                                       slotProps = {
                                          {
                                             input: {
                                                id: "account_id"
                                             }
                                          }
                                       }
                                    >
                                       <MenuItem
                                          value=""
                                       >
                                          -- Select Account --
                                       </MenuItem>
                                       {
                                          accountOptions.map((account) => (
                                             <MenuItem
                                                key={`account-option-${account.account_id}`}
                                                value={account.account_id}
                                             >
                                                {account.name}
                                             </MenuItem>
                                          ))
                                       }
                                    </Select>
                                    <FormHelperText>
                                       {errors.account_id?.message}
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                        <Controller
                           control={control}
                           name="budget_category_id"
                           defaultValue={budgets.Income.budget_category_id}
                           render={
                              ({ field }) => (
                                 <FormControl
                                    error={Boolean(errors.budget_category_id)}
                                    fullWidth={true}
                                 >
                                    <InputLabel
                                       htmlFor="budget_category_id"
                                       variant="outlined"
                                    >
                                       Category
                                    </InputLabel>
                                    <Select
                                       {...field}
                                       label="Category"
                                       value={field.value || ""}
                                       slotProps = {
                                          {
                                             input: {
                                                id: "budget_category_id"
                                             }
                                          }
                                       }
                                    >
                                       <MenuItem
                                          disabled={disableIncome}
                                          sx={{ fontWeight: "bold" }}
                                          value={budgets.Income.budget_category_id}
                                       >
                                          Income
                                       </MenuItem>
                                       {
                                          incomeCategoryOptions.map((category) => (
                                             <MenuItem
                                                disabled={disableIncome}
                                                key={`income-category-${category.budget_category_id}`}
                                                sx={{ pl: 3.5 }}
                                                value={category.budget_category_id}
                                             >
                                                {category.name}
                                             </MenuItem>
                                          ))
                                       }
                                       <MenuItem
                                          disabled={disableExpenses}
                                          sx={{ fontWeight: "bold" }}
                                          value={budgets.Expenses.budget_category_id}
                                       >
                                          Expenses
                                       </MenuItem>
                                       {
                                          expenseCategoryOptions.map((category) => (
                                             <MenuItem
                                                disabled={disableExpenses}
                                                key={`expense-category-${category.budget_category_id}`}
                                                sx={{ pl: 3.5 }}
                                                value={category.budget_category_id}
                                             >
                                                {category.name}
                                             </MenuItem>
                                          ))
                                       }
                                    </Select>
                                    <FormHelperText>
                                       {errors.budget_category_id?.message}
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                     </Stack>
                     <Button
                        className="btn-primary"
                        color="primary"
                        disabled={isSubmitting}
                        fullWidth={true}
                        startIcon={<FontAwesomeIcon icon={updating ? faFloppyDisk : faPlus} />}
                        sx={{ mt: 2, py: 1.2 }}
                        type="submit"
                        variant="contained"
                     >
                        {updating ? "Update" : "Create"}
                     </Button>
                  </Stack>
               </form>
            </Box>
         </ModalSection>
      </Modal>
   );
}