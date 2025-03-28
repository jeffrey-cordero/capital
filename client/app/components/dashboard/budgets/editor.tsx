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
import { type Budget, type BudgetCategory, budgetCategorySchema, budgetSchema } from "capital/budgets";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { compareBudgetPeriods } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { updateBudget, updateBudgetCategory } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

interface EditCategoryProps {
   category: BudgetCategory;
   onCancel: () => void;
   updateDirtyFields: (_fields: object, _field: string) => void;
}

// Create a dedicated schema for updates - partial to allow partial updates
const updateCategorySchema = budgetCategorySchema.partial().pick({ name: true, type: true });
const updateBudgetGoalSchema = budgetSchema.innerType().pick({ goal: true });

// Component for editing an existing budget category
export default function EditCategory({ category, onCancel, updateDirtyFields }: EditCategoryProps) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);

   // Initialize form with current category values
   const { control, handleSubmit, setError, reset, formState: { errors, dirtyFields, isSubmitting } } = useForm({
      defaultValues: {
         name: category.name,
         goal: String(category.goals[category.goalIndex].goal),
         type: category.type
      }
   });

   const onSubmit = async(data: FieldValues) => {
      try {
         // If no fields changed, just close the form
         if (Object.keys(dirtyFields).length === 0) {
            onCancel();
            return;
         }

         // Prepare payloads for parallel requests
         const categoryPayload: Partial<BudgetCategory> = {};

         if (dirtyFields["name"]) categoryPayload.name = data.name;
         if (dirtyFields["type"]) categoryPayload.type = data.type;

         const categoryUpdates = Object.keys(categoryPayload).length > 0;
         const categoryFields = updateCategorySchema.safeParse(categoryPayload);
         if (categoryUpdates && !categoryFields.success) {
            // Invalid category updates
            handleValidationErrors(categoryFields, setError);
            return;
         }

         const budgetPayload: Partial<Budget> = { budget_category_id: category.budget_category_id, month, year };

         if (dirtyFields["goal"]) budgetPayload.goal = Number(data.goal);

         const budgetUpdates = budgetPayload.goal !== undefined;
         const budgetFields = updateBudgetGoalSchema.safeParse(budgetPayload);

         if (budgetUpdates && !budgetFields.success) {
            // Invalid budget updates
            handleValidationErrors(budgetFields, setError);
            return;
         }

         // Determine if we're updating the current period or creating a new one
         const isCurrentPeriod = compareBudgetPeriods(
            { month: category.goals[category.goalIndex].month, year: category.goals[category.goalIndex].year },
            { month, year }
         ) === 0;
         const method = isCurrentPeriod ? "PUT" : "POST";

         // Send potential updates in parallel requests
         const [categoryResponse, budgetResponse] = await Promise.all([
            categoryUpdates ? sendApiRequest<number>(
               `dashboard/budgets/category/${category.budget_category_id}`, "PUT", categoryPayload, dispatch, navigate, setError
            ) : Promise.resolve(null),
            budgetUpdates ? sendApiRequest<number | { success: boolean }>(
               `dashboard/budgets/budget/${category.budget_category_id}`, method, budgetPayload, dispatch, navigate, setError
            ) : Promise.resolve(null)
         ]);

         const categorySuccess = !categoryUpdates || categoryResponse === 204;
         const budgetSuccess = !budgetUpdates || (budgetResponse instanceof Object && budgetResponse.success) || budgetResponse === 204;

         // Handle successful responses
         if (categoryUpdates && categorySuccess) {
            // Update the category in Redux store
            dispatch(updateBudgetCategory({
               type: category.type,
               updates: {
                  ...categoryPayload,
                  budget_category_id: category.budget_category_id
               }
            }));
         }

         // Close the form if both updates were successful
         if (categorySuccess && budgetSuccess) {
            // Update the budget in Redux store
            dispatch(updateBudget({
               type: data.type || category.type,
               budget_category_id: category.budget_category_id,
               goal: Number(data.goal)
            }));

            // Clear the form with the new values
            reset({
               name: categoryPayload.name || category.name,
               goal: String(budgetPayload.goal || category.goals[category.goalIndex].goal),
               type: categoryPayload.type || category.type
            }, { keepDirty: false });

            // Clear dirty fields before closing
            updateDirtyFields({}, "editor");

            // Close the form
            onCancel();
         }
      } catch (error) {
         console.error(`Error updating category: ${error}`);
      }
   };

   return (
      <form
         onChange = { () => updateDirtyFields(dirtyFields, "editor") }
         onSubmit = { handleSubmit(onSubmit) }
      >
         <Stack
            direction = "column"
            spacing = { 2 }
            sx = { { mt: 1 } }
         >
            <Controller
               control = { control }
               name = "name"
               render = {
                  ({ field }) => (
                     <FormControl error = { Boolean(errors.name) }>
                        <InputLabel htmlFor = "editor-name">Name</InputLabel>
                        <OutlinedInput
                           { ...field }
                           aria-label = "Name"
                           autoComplete = "none"
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
                        <InputLabel htmlFor = "editor-goal">Goal</InputLabel>
                        <OutlinedInput
                           { ...field }
                           aria-label = "Goal"
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
               direction = { { xs: "column", sm: "row" } }
               spacing = { 1 }
            >
               <Button
                  className = "btn-primary"
                  color = "secondary"
                  disabled = { isSubmitting }
                  fullWidth = { true }
                  onClick = { onCancel }
                  startIcon = { <FontAwesomeIcon icon = { faClockRotateLeft } /> }
                  variant = "contained"
               >
                  Cancel
               </Button>
               <Button
                  className = "btn-primary"
                  color = "primary"
                  fullWidth = { true }
                  loading = { isSubmitting }
                  startIcon = { <FontAwesomeIcon icon = { faPenToSquare } /> }
                  type = "submit"
                  variant = "contained"
               >
                  Save
               </Button>
            </Stack>
         </Stack>
      </form>
   );
}