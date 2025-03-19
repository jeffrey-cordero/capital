import { faClockRotateLeft, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Button,
   FormControl,
   FormHelperText,
   InputLabel,
   NativeSelect,
   OutlinedInput,
   Stack
} from "@mui/material";
import { type BudgetCategory, budgetCategorySchema, budgetSchema } from "capital/budgets";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { handleValidationErrors } from "@/lib/validation";
import { updateBudget, updateBudgetCategory } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

interface EditCategoryProps {
   category: BudgetCategory;
   onCancel: () => void;
   isSubmitting: boolean;
}

// Create a dedicated schema for updates - partial to allow partial updates
const updateCategorySchema = budgetCategorySchema.partial().pick({ name: true, type: true });

const updateBudgetGoalSchema = budgetSchema.innerType().pick({ goal: true });

// Component for editing an existing budget category
export default function EditCategory({ category, onCancel, isSubmitting }: EditCategoryProps) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);

   // Initialize form with current category values
   const { control, handleSubmit, setError, formState: { errors, dirtyFields } } = useForm({
      defaultValues: {
         name: category.name,
         goal: category.goals[category.goalIndex].goal,
         type: category.type as "Income" | "Expenses"
      }
   });

   const onSubmit = async(data: FieldValues) => {
      try {
         // Identify which fields have actually changed
         // If nothing changed, just cancel
         if (Object.keys(dirtyFields).length === 0) {
            onCancel();
            return;
         }

         // Track update operations for rollback if needed
         const updates = { category: false, budget: false };

         // Handle category updates (name and/or type)
         if ("name" in data || "type" in data) {
            // Extract and validate only the category fields
            const categoryUpdates = {
               ...(data.name !== undefined && { name: data.name }),
               ...(data.type !== undefined && { type: data.type })
            };

            // Validate category-specific fields
            const categoryFields = updateCategorySchema.safeParse(categoryUpdates);

            if (!categoryFields.success) {
               handleValidationErrors(categoryFields, setError as any);
               return;
            }

            const payload = {
               name: data.name ?? undefined,
               type: data.type ?? undefined
            };

            // Send API request to update category
            const categoryResponse = await sendApiRequest(
               `dashboard/budgets/category/${category.budget_category_id}`, "PUT", payload, dispatch, navigate, setError
            );

            // Handle successful response
            if (categoryResponse === 204) {
               // Update the category in Redux store
               dispatch(updateBudgetCategory({
                  type: category.type,
                  updates: {
                     ...payload,
                     budget_category_id: category.budget_category_id
                  }
               }));
               updates.category = true;
            } else {
               setError("name", { message: "Failed to update category" });
            }
         }

         // Handle budget goal update
         if ("goal" in data) {
            // Validate goal value
            const goalField = updateBudgetGoalSchema.safeParse({
               goal: Number(data.goal)
            });

            if (!goalField.success) {
               handleValidationErrors(goalField, setError as any);
               return;
            }

            // Create payload for budget update
            const payload = {
               budget_category_id: category.budget_category_id,
               goal: Number(data.goal),
               month,
               year
            };

            // Send API request to update budget
            const budgetResponse = await sendApiRequest(
               `dashboard/budgets/budget/${category.budget_category_id}`, "PUT", payload, dispatch, navigate, setError
            );

            // Handle successful response
            if (budgetResponse === 204) {
               // Update the budget in Redux store
               dispatch(updateBudget({
                  type: data.type || category.type,
                  budget_category_id: category.budget_category_id,
                  goal: Number(data.goal)
               }));

               updates.budget = true;
            } else {
               setError("goal", { message: "Failed to update budget goal" });
            }
         }

         // Only close form if all attempted updates succeeded
         const allUpdatesSucceeded =
            (updates.category || !("name" in data || "type" in data)) &&
            (updates.budget || !("goal" in data));

         if (allUpdatesSucceeded) {
            onCancel();
         }
      } catch (error) {
         console.error(`Error updating category: ${error}`);
      }
   };

   return (
      <form onSubmit = { handleSubmit(onSubmit) }>
         <Stack
            direction = "column"
            spacing = { 2 }
         >
            <Controller
               control = { control }
               name = "name"
               render = {
                  ({ field }) => (
                     <FormControl error = { Boolean(errors.name) }>
                        <InputLabel htmlFor = "editor-name">
                           Name
                        </InputLabel>
                        <OutlinedInput
                           { ...field }
                           aria-label = "Name"
                           autoComplete = "none"
                           disabled = { isSubmitting }
                           id = "editor-name"
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
               name = "goal"
               render = {
                  ({ field }) => (
                     <FormControl error = { Boolean(errors.goal) }>
                        <InputLabel htmlFor = "editor-goal">
                           Goal
                        </InputLabel>
                        <OutlinedInput
                           { ...field }
                           aria-label = "Goal"
                           disabled = { isSubmitting }
                           id = "editor-goal"
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
            <Controller
               control = { control }
               defaultValue = { category.type }
               name = "type"
               render = {
                  ({ field }) => (
                     <FormControl
                        disabled = { isSubmitting }
                        error = { Boolean(errors.type) }
                        sx = { { px: 0.75 } }
                     >
                        <InputLabel
                           htmlFor = "editor-type"
                           sx = { { px: 0.75 } }
                           variant = "standard"
                        >
                           Type
                        </InputLabel>
                        <NativeSelect
                           { ...field }
                           id = "editor-type"
                        >
                           <option value = "Income">Income</option>
                           <option value = "Expenses">Expenses</option>
                        </NativeSelect>
                     </FormControl>
                  )
               }
            />
            <Stack
               direction = "row"
               spacing = { 1 }
            >
               <Button
                  color = "primary"
                  disabled = { isSubmitting }
                  fullWidth = { true }
                  loading = { isSubmitting }
                  startIcon = { <FontAwesomeIcon icon = { faPenToSquare } /> }
                  type = "submit"
                  variant = "contained"
               >
                  Save
               </Button>
               <Button
                  color = "inherit"
                  disabled = { isSubmitting }
                  fullWidth = { true }
                  onClick = { onCancel }
                  startIcon = { <FontAwesomeIcon icon = { faClockRotateLeft } /> }
                  variant = "outlined"
               >
                  Cancel
               </Button>
            </Stack>
         </Stack>
      </form>
   );
}