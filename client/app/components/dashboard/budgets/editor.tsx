import {
   Collapse,
   FormControl,
   FormHelperText,
   InputLabel,
   MenuItem,
   OutlinedInput,
   Select,
   Stack
} from "@mui/material";
import { type Budget, type BudgetCategory, budgetCategorySchema, budgetSchema } from "capital/budgets";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import SubmitButton from "@/components/global/submit";
import { sendApiRequest } from "@/lib/api";
import { compareBudgetPeriods } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { updateBudget, updateBudgetCategory } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

/**
 * The props for the EditCategory component
 *
 * @interface EditCategoryProps
 * @property {BudgetCategory} category - The category to edit
 * @property {boolean} visible - Whether the form is visible
 * @property {() => void} onCancel - The function to call when the form is cancelled
 * @property {(_fields: object, _field: string) => void} updateDirtyFields - The function to call to update the dirty fields
 */
interface EditCategoryProps {
   visible: boolean;
   category: BudgetCategory;
   onCancel: () => void;
   updateDirtyFields: (_fields: object, _field: string) => void;
}

/**
 * The schema for updating a budget category
 */
const updateCategorySchema = budgetCategorySchema.partial().pick({ name: true, type: true });

/**
 * The schema for updating a budget goal
 */
const updateBudgetGoalSchema = budgetSchema.innerType().pick({ goal: true });

/**
 * The EditCategory component to edit an existing budget category
 *
 * @param {EditCategoryProps} props - The props for the EditCategory component
 * @returns {React.ReactNode} The EditCategory component
 */
export default function EditCategory({ visible, category, onCancel, updateDirtyFields }: EditCategoryProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);

   // Initialize form with default values from the provided category
   const {
      control,
      handleSubmit,
      setError,
      reset,
      formState: { errors, dirtyFields, isSubmitting } } = useForm({
      defaultValues: {
         name: category.name,
         type: category.type,
         goal: String(category.goals[category.goalIndex].goal)
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
            // Invalid category fields
            handleValidationErrors(categoryFields, setError);
            return;
         }

         // Normalize the updated fields via Zod schema parsing
         if (dirtyFields["name"]) categoryPayload.name = categoryFields.data?.name;
         if (dirtyFields["type"]) categoryPayload.type = categoryFields.data?.type;

         const budgetPayload: Partial<Budget> = {
            budget_category_id: category.budget_category_id,
            month,
            year
         };
         if (dirtyFields["goal"]) budgetPayload.goal = Number(data.goal);

         const budgetUpdates = budgetPayload.goal !== undefined;
         const budgetFields = updateBudgetGoalSchema.safeParse(budgetPayload);

         if (budgetUpdates && !budgetFields.success) {
            // Invalid budget fields
            handleValidationErrors(budgetFields, setError);
            return;
         }

         // Normalize the updated goal via Zod schema parsing
         if (dirtyFields["goal"]) budgetPayload.goal = Number(budgetFields.data?.goal);

         // Determine if we're updating the current period or creating a new one (PUT vs. POST)
         const isCurrentPeriod = compareBudgetPeriods(
            { month: category.goals[category.goalIndex].month, year: category.goals[category.goalIndex].year },
            { month, year }
         ) === 0;
         const method: string = isCurrentPeriod ? "PUT" : "POST";

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
         const budgetSuccess = !budgetUpdates || budgetResponse === 204 || (budgetResponse instanceof Object && budgetResponse.success);

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

         if (categorySuccess && budgetSuccess) {
            // Update the budget in Redux store
            dispatch(updateBudget({
               goal: Number(data.goal),
               type: data.type || category.type,
               budget_category_id: category.budget_category_id
            }));

            // Reset the form with the new default values
            reset({
               name: categoryPayload.name || category.name,
               goal: String(budgetPayload.goal || category.goals[category.goalIndex].goal),
               type: categoryPayload.type || category.type
            }, { keepDirty: false });

            // Clear the dirty fields before closing
            updateDirtyFields({}, "editor");

            onCancel();
         }
      } catch (error) {
         console.error(`Error updating category: ${error}`);
      }
   };

   return (
      <Collapse
         in = { visible }
         mountOnEnter = { true }
         style = { { transformOrigin: "center top" } }
         timeout = { 350 }
      >
         <form
            onChange = { () => updateDirtyFields(dirtyFields, "editor") }
            onSubmit = { handleSubmit(onSubmit) }
         >
            <Stack
               direction = "column"
               spacing = { 1.5 }
               sx = { { mt: 1 } }
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
                        >
                           <InputLabel
                              htmlFor = "editor-type"
                              variant = "outlined"
                           >
                              Type
                           </InputLabel>
                           <Select
                              { ...field }
                              label = "Type"
                              slotProps = {
                                 {
                                    input: {
                                       id: "editor-type"
                                    }
                                 }
                              }
                           >
                              <MenuItem value = "Income">
                                 Income
                              </MenuItem>
                              <MenuItem value = "Expenses">
                                 Expenses
                              </MenuItem>
                           </Select>
                        </FormControl>
                     )
                  }
               />
               <SubmitButton
                  isSubmitting = { isSubmitting }
                  onCancel = { onCancel }
                  type = "Update"
                  visible = { true }
               />
            </Stack>
         </form>
      </Collapse>
   );
}