import { faCommentsDollar, faListOl, faMoneyBillTransfer } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   FormControl,
   FormHelperText,
   InputLabel,
   OutlinedInput,
   Stack
} from "@mui/material";
import { type BudgetPeriod, budgetSchema, type OrganizedBudget } from "capital/budgets";
import { useCallback, useEffect } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import BudgetCategories from "@/components/dashboard/budgets/categories";
import Transactions from "@/components/dashboard/transactions/transactions";
import { Modal, Section } from "@/components/global/modal";
import SubmitButton from "@/components/global/submit";
import { sendApiRequest } from "@/lib/api";
import { compareBudgetPeriods } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { updateBudget } from "@/redux/slices/budgets";
import type { RootState } from "@/redux/store";
/**
 * The schema for validating budget goal updates
 */
const updateBudgetGoalSchema = budgetSchema.innerType().pick({ goal: true });

/**
 * The props for the BudgetForm component
 *
 * @interface BudgetFormProps
 * @property {string} type - The type of the budget
 * @property {(_fields: object, _field: string) => void} updateDirtyFields - The function to call to update the dirty fields
 * @property {boolean} displayWarning - Whether to display the warning component
 * @property {boolean} open - Whether the modal is open
 * @property {() => void} onClose - The function to call when the modal is closed
 */
interface BudgetFormProps {
   type: "Income" | "Expenses";
   updateDirtyFields: (_fields: object, _field: string) => void;
   displayWarning: boolean;
   open: boolean;
   onClose: () => void;
}

/**
 * The BudgetForm component to update a budget goal
 *
 * @param {BudgetFormProps} props - The props for the BudgetForm component
 * @returns {React.ReactNode} The BudgetForm component
 */
export default function BudgetForm({ type, displayWarning, open, onClose, updateDirtyFields }: BudgetFormProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();

   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);
   const period: BudgetPeriod = useSelector((state: RootState) => state.budgets.value.period);

   // Initialize form with default values from the budget
   const {
      control,
      setError,
      handleSubmit,
      reset,
      formState: { isSubmitting, errors, dirtyFields }
   } = useForm({
      defaultValues: { goal: String(budget.goals[budget.goalIndex].goal) }
   });

   useEffect(() => {
      if (open) {
         reset({ goal: String(budget.goals[budget.goalIndex].goal) }, { keepDirty: false });
      }
   }, [open, reset, budget.goals, budget.goalIndex]);

   const onCancel = useCallback(() => {
      updateDirtyFields({}, "main");
      reset({ goal: String(budget.goals[budget.goalIndex].goal) }, { keepDirty: false });
   }, [reset, updateDirtyFields, budget.goals, budget.goalIndex]);

   const onSubmit = async(data: FieldValues) => {
      try {
         // Check if any changes were made
         if (Object.keys(dirtyFields).length === 0) return;

         const budgetFields = updateBudgetGoalSchema.safeParse({
            goal: parseFloat(data.goal.toString())
         });

         if (!budgetFields.success) {
            handleValidationErrors(budgetFields, setError);
            return;
         }

         // Prepare budget payload for API request
         const payload = {
            goal: Number(budgetFields.data.goal),
            year: period.year,
            month: period.month
         };

         // Determine if we need to create or update a budget entry (PUT vs. POST)
         const currentGoal = budget.goals[budget.goalIndex];
         const isCurrentPeriod = compareBudgetPeriods(
            { month: currentGoal.month, year: currentGoal.year },
            { month: period.month, year: period.year }
         ) === 0;
         const method = isCurrentPeriod ? "PUT" : "POST";

         // Submit the API request
         const result = await sendApiRequest<number | { success: boolean }>(
            `dashboard/budgets/budget/${budget.budget_category_id}`, method, payload, dispatch, navigate, setError
         );

         if (result === 204 || (result instanceof Object && result?.success)) {
            // Update Redux store for a successful update or creation
            dispatch(updateBudget({
               type,
               budget_category_id: budget.budget_category_id,
               goal: payload.goal
            }));

            // Reset the form default values
            reset({ goal: String(payload.goal) }, { keepDirty: false });

            // Clear the dirty fields
            updateDirtyFields({}, "main");
         }
      } catch (error) {
         console.error("Failed to update budget:", error);
      }
   };

   return (
      <Modal
         displayWarning = { displayWarning }
         onClose = { onClose }
         open = { open }
         sx = { { position: "relative", width: { xs: "90%", md: "70%", lg: "60%", xl: "45%" }, px: { xs: 2, sm: 3 }, py: 3, maxWidth: "90%" } }
      >
         <Stack
            direction = "column"
            spacing = { 3 }
         >
            <Section
               title = {
                  <FontAwesomeIcon
                     icon = { faCommentsDollar }
                     size = "lg"
                  />
               }
            >
               <Box>
                  <form
                     onChange = { () => updateDirtyFields(dirtyFields, "main") }
                     onSubmit = { handleSubmit(onSubmit) }
                  >
                     <Stack
                        direction = "column"
                        spacing = { 1 }
                        sx = { { mt: 2 } }
                     >
                        <Controller
                           control = { control }
                           name = "goal"
                           render = {
                              ({ field }) => (
                                 <FormControl error = { Boolean(errors.goal) }>
                                    <InputLabel htmlFor = "goal">
                                       Goal
                                    </InputLabel>
                                    <OutlinedInput
                                       { ...field }
                                       aria-label = "Goal"
                                       id = "goal"
                                       inputProps = { { step: 0.01, min: 0 } }
                                       label = "Goal"
                                       type = "number"
                                       value = { field.value || "" }
                                    />
                                    <FormHelperText>
                                       { errors.goal?.message?.toString() }
                                    </FormHelperText>
                                 </FormControl>
                              )
                           }
                        />
                        <SubmitButton
                           isSubmitting = { isSubmitting }
                           onCancel = { onCancel }
                           type = "Update"
                           visible = { Object.keys(dirtyFields).length > 0 }
                        />
                     </Stack>
                  </form>
               </Box>
            </Section>
            <Section
               title = {
                  <FontAwesomeIcon
                     icon = { faListOl }
                     size = "lg"
                  />
               }
            >
               <BudgetCategories
                  type = { type }
                  updateDirtyFields = { updateDirtyFields }
               />
            </Section>
            <Section
               title = {
                  <FontAwesomeIcon
                     icon = { faMoneyBillTransfer }
                     size = "lg"
                  />
               }
            >
               <Transactions
                  filter = "budget"
                  identifier = { type }
               />
            </Section>
         </Stack>
      </Modal>
   );
}