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
import { HTTP_STATUS } from "capital/server";
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
const updateCategorySchema = budgetCategorySchema.partial().pick({
   name: true,
   type: true
});

/**
 * The schema for updating a budget goal
 */
const updateBudgetGoalSchema = budgetSchema.innerType().pick({
   goal: true
});

/**
 * The EditCategory component to edit an existing budget category
 *
 * @param {EditCategoryProps} props - The props for the EditCategory component
 * @returns {React.ReactNode} The EditCategory component
 */
export default function EditCategory({ visible, category, onCancel, updateDirtyFields }: EditCategoryProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);

   // Form setup with react-hook-form
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
         // Ignore requests for empty updates
         if (Object.keys(dirtyFields).length === 0) {
            onCancel();
            return;
         }

         // Prepare the respective payloads for parallel requests
         const categoryPayload: Partial<BudgetCategory> = {};
         const budgetPayload: Partial<Budget> = {
            budget_category_id: category.budget_category_id,
            month,
            year
         };

         // Normalize the dirty fields from the current form
         Object.keys(dirtyFields).forEach((record: string) => {
            if (record === "name" || record === "type") {
               categoryPayload[record] = data[record];
            } else if (record === "goal") {
               budgetPayload.goal = Number(data[record]);
            }
         });

         // Verify each payload through Zod schema parsing
         const categoryUpdates = Object.keys(categoryPayload).length > 0;
         const categoryFields = updateCategorySchema.safeParse(categoryPayload);

         if (categoryUpdates && !categoryFields.success) {
            // Invalid category inputs
            handleValidationErrors(categoryFields, setError);
            return;
         }

         const budgetUpdates = budgetPayload.goal !== undefined;
         const budgetFields = updateBudgetGoalSchema.safeParse(budgetPayload);

         if (budgetUpdates && !budgetFields.success) {
            // Invalid budget goal input
            handleValidationErrors(budgetFields, setError);
            return;
         }

         // Determine if we're updating the current period or creating a new one (PUT vs POST)
         const isCurrentPeriod = compareBudgetPeriods(
            { month, year },
            { month: category.goals[category.goalIndex].month, year: category.goals[category.goalIndex].year }
         ) === "equal";
         const method: string = isCurrentPeriod ? "PUT" : "POST";

         // Submit potential updates in parallel
         const [categoryResponse, budgetResponse] = await Promise.all([
            categoryUpdates ? sendApiRequest<number>(
               `dashboard/budgets/category/${category.budget_category_id}`, "PUT", categoryPayload, dispatch, navigate, setError
            ) : Promise.resolve(null),
            budgetUpdates ? sendApiRequest<number | { success: boolean }>(
               `dashboard/budgets/budget/${category.budget_category_id}`, method, budgetPayload, dispatch, navigate, setError
            ) : Promise.resolve(null)
         ]);

         const categorySuccess = (!categoryUpdates || categoryResponse === HTTP_STATUS.NO_CONTENT);
         const budgetSuccess = (!budgetUpdates || budgetResponse === HTTP_STATUS.NO_CONTENT || (typeof budgetResponse === "object" && budgetResponse?.success));

         // Only update the Redux store for successful requests
         if (categoryUpdates && categorySuccess) {
            dispatch(updateBudgetCategory({
               type: category.type,
               updates: {
                  ...categoryPayload,
                  budget_category_id: category.budget_category_id
               }
            }));
         }

         if (budgetUpdates && budgetSuccess) {
            dispatch(updateBudget({
               goal: Number(budgetFields.data?.goal || category.goals[category.goalIndex].goal),
               type: categoryFields.data?.type || category.type,
               budget_category_id: category.budget_category_id
            }));
         }

         // Only reset and close the form if both requests were successful
         if (categorySuccess && budgetSuccess) {
            reset({
               name: categoryFields.data?.name || category.name,
               goal: String(budgetFields.data?.goal || category.goals[category.goalIndex].goal),
               type: categoryFields.data?.type || category.type
            }, { keepDirty: false });

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
                  unmountOnExit = { false }
                  visible = { true }
               />
            </Stack>
         </form>
      </Collapse>
   );
}