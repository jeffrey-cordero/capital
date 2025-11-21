import { faListCheck, faMoneyBill1Wave, faMoneyBillTransfer } from "@fortawesome/free-solid-svg-icons";
import {
   Box,
   FormControl,
   FormHelperText,
   InputLabel,
   OutlinedInput,
   Stack
} from "@mui/material";
import { budgetSchema, type OrganizedBudget } from "capital/budgets";
import { HTTP_STATUS } from "capital/server";
import { useCallback, useEffect } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import BudgetCategories from "@/components/dashboard/budgets/categories";
import Transactions from "@/components/dashboard/transactions/transactions";
import Modal from "@/components/global/modal";
import Section from "@/components/global/section";
import SubmitButton from "@/components/global/submit";
import { sendApiRequest } from "@/lib/api";
import { compareBudgetPeriods } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { updateBudget } from "@/redux/slices/budgets";
import type { RootState } from "@/redux/store";

/**
 * Schema for budget goal validation
 */
const updateBudgetGoalSchema = budgetSchema.innerType().pick({ goal: true });

/**
 * Props for the BudgetForm component
 *
 * @property {"Income" | "Expenses"} type - Budget type
 * @property {(fields: object, field: string) => void} updateDirtyFields - Dirty fields tracker
 * @property {boolean} displayWarning - Warning display flag
 * @property {boolean} open - Modal visibility state
 * @property {() => void} onClose - Modal close handler
 */
interface BudgetFormProps {
   type: "Income" | "Expenses";
   updateDirtyFields: (fields: object, field: string) => void;
   displayWarning: boolean;
   open: boolean;
   onClose: () => void;
}

/**
 * Budget management modal with main goal and categories construction/editing functionality
 *
 * @param {BudgetFormProps} props - The props for the BudgetForm component
 * @returns {React.ReactNode} The BudgetForm component
 */
export default function BudgetForm({ type, displayWarning, open, onClose, updateDirtyFields }: BudgetFormProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);
   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);

   // Form setup with react-hook-form
   const {
      control,
      setError,
      handleSubmit,
      reset,
      formState: { isSubmitting, errors, dirtyFields } } = useForm({
      defaultValues: {
         goal: String(budget.goals[budget.goalIndex].goal)
      }
   });

   // Reset form when modal visibility changes
   useEffect(() => {
      if (open) {
         reset({ goal: String(budget.goals[budget.goalIndex].goal) }, { keepDirty: false });
      }
   }, [open, reset, budget.goals, budget.goalIndex]);

   // Reset form when changes are cancelled
   const onCancel = useCallback(() => {
      updateDirtyFields({}, "main");
      reset({ goal: String(budget.goals[budget.goalIndex].goal) }, { keepDirty: false });
   }, [reset, updateDirtyFields, budget.goals, budget.goalIndex]);

   const onSubmit = async(data: FieldValues) => {
      try {
         // Ignore empty updates
         if (Object.keys(dirtyFields).length === 0) return;

         const budgetFields = updateBudgetGoalSchema.safeParse({
            goal: data.goal === "" ? undefined : Number(data.goal)
         });

         if (!budgetFields.success) {
            // Invalid budget goal input
            handleValidationErrors(budgetFields, setError);
            return;
         }

         // Prepare budget payload for API request
         const payload = {
            goal: budgetFields.data.goal,
            month,
            year
         };

         // Determine if creating new or updating existing budget (POST vs PUT)
         const isCurrentPeriod = compareBudgetPeriods(
            { month, year },
            { month: budget.goals[budget.goalIndex].month, year: budget.goals[budget.goalIndex].year }
         ) === "equal";
         const method = isCurrentPeriod ? "PUT" : "POST";

         // Submit API request
         const result = await sendApiRequest<number | { success: boolean }>(
            `dashboard/budgets/budget/${budget.budget_category_id}`, method, payload, dispatch, navigate, setError
         );

         if (result === HTTP_STATUS.NO_CONTENT || (typeof result === "object" && result?.success)) {
            // Update Redux store and reset form
            dispatch(updateBudget({
               type,
               budget_category_id: budget.budget_category_id,
               goal: payload.goal
            }));

            reset({ goal: String(payload.goal) }, { keepDirty: false });
            updateDirtyFields({}, "main");
         }
      } catch (error) {
         console.error("Failed to update budget:", error);
      }
   };

   return (
      <Modal
         dataTestId = { `budget-form-${type}` }
         displayWarning = { displayWarning }
         onClose = { onClose }
         open = { open }
         sx = { { position: "relative", width: { xs: "90%", md: "70%", lg: "60%", xl: "45%" }, px: { xs: 2, sm: 3 }, py: 3, maxWidth: "90%" } }
      >
         <Stack
            direction = "column"
            spacing = { 3 }
         >
            <Section icon = { faMoneyBill1Wave }>
               <Box>
                  <form
                     noValidate = { true }
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
                                       inputProps = { { step: 0.01, min: 0, "data-testid": "budget-goal-input" } }
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
            <Section icon = { faListCheck }>
               <BudgetCategories
                  type = { type }
                  updateDirtyFields = { updateDirtyFields }
               />
            </Section>
            <Section icon = { faMoneyBillTransfer }>
               <Transactions
                  filter = "budget"
                  identifier = { type }
               />
            </Section>
         </Stack>
      </Modal>
   );
}