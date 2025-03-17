import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   FormControl,
   FormHelperText,
   InputLabel,
   OutlinedInput,
   Stack
} from "@mui/material";
import { budgetSchema, type OrganizedBudget } from "capital/budgets";
import { useEffect } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import Transactions from "@/components/dashboard/accounts/transactions";
import BudgetCategories from "@/components/dashboard/budgets/categories";
import { Modal, ModalSection } from "@/components/global/modal";
import { sendApiRequest } from "@/lib/api";
import { handleValidationErrors } from "@/lib/validation";
import { updateBudget } from "@/redux/slices/budgets";
import type { RootState } from "@/redux/store";

// Create a dedicated schema for budget goal updates
const updateBudgetGoalSchema = budgetSchema.innerType().pick({ goal: true });

interface BudgetFormProps {
   budget: OrganizedBudget;
   type: "Income" | "Expenses";
   open: boolean;
   onClose: () => void;
}

export default function BudgetForm({ budget, type, open, onClose }: BudgetFormProps) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { period } = useSelector((state: RootState) => state.budgets.value) as { period: { month: number, year: number } };

   // Setup form with react-hook-form
   const {
      control,
      setError,
      handleSubmit,
      reset,
      formState: { isSubmitting, errors, dirtyFields }
   } = useForm();

   // Reset form when modal opens/closes or budget changes
   useEffect(() => {
      if (open) {
         reset({
            goal: budget.goals[budget.goalIndex].goal
         });
      } else {
         reset();
      }
   }, [budget, reset, open]);

   // Handle budget goal updates with proper validation
   const onSubmit = async(data: FieldValues) => {
      try {
         // Check if any changes were made
         if (Object.keys(dirtyFields).length === 0) return;

         // Validate the goal data using Zod schema
         const validationResult = updateBudgetGoalSchema.safeParse({
            goal: parseFloat(data.goal.toString())
         });

         if (!validationResult.success) {
            handleValidationErrors(validationResult, setError);
            return;
         }

         // Prepare validated payload
         const payload = {
            goal: validationResult.data.goal,
            year: period.year,
            month: period.month
         };

         // Determine if we need to create or update a budget entry
         const currentGoal = budget.goals[budget.goalIndex];
         const isCurrentPeriod = currentGoal.month === period.month && currentGoal.year === period.year;
         const method = isCurrentPeriod ? "PUT" : "POST";

         // Send API request
         const result = await sendApiRequest(
            `dashboard/budgets/budget/${budget.budget_category_id}`, method, payload, dispatch, navigate, setError
         );

         // Handle successful response
         if (result === 201 || result === 204) {
            // Update Redux store
            dispatch(updateBudget({
               type,
               budget_category_id: budget.budget_category_id,
               goal: validationResult.data.goal
            }));

            // Close modal on success
            onClose();
         }
      } catch (error) {
         console.error("Failed to update budget:", error);
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
            <ModalSection title = "Goal">
               <Box>
                  <form onSubmit = { handleSubmit(onSubmit) }>
                     <Stack
                        direction = "column"
                        spacing = { 2 }
                        sx = { { mt: 3 } }
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
                                       disabled = { isSubmitting }
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
                        <Stack
                           direction = "column"
                           spacing = { 1 }
                        >
                           <Button
                              className = "btn-primary"
                              color = "primary"
                              disabled = { isSubmitting }
                              fullWidth = { true }
                              loading = { isSubmitting }
                              startIcon = { <FontAwesomeIcon icon = { faPenToSquare } /> }
                              type = "submit"
                              variant = "contained"
                           >
                              Update
                           </Button>
                        </Stack>
                     </Stack>
                  </form>
               </Box>
            </ModalSection>
            <BudgetCategories
               budget = { budget }
               isSubmitting = { isSubmitting }
               type = { type }
            />
            <ModalSection title = "Transactions">
               <Transactions
                  filter = "budget"
                  identifier = { budget.budget_category_id }
               />
            </ModalSection>
         </Stack>
      </Modal>
   );
}