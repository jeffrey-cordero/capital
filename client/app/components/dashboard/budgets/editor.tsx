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
import { comparePeriods, updateBudget, updateBudgetCategory } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

interface EditCategoryProps {
   category: BudgetCategory;
   onCancel: () => void;
}

// Create a dedicated schema for updates - partial to allow partial updates
const updateCategorySchema = budgetCategorySchema.partial().pick({ name: true, type: true });

const updateBudgetGoalSchema = budgetSchema.innerType().pick({ goal: true });

// Component for editing an existing budget category
export default function EditCategory({ category, onCancel }: EditCategoryProps) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);

   // Initialize form with current category values
   const { control, handleSubmit, setError, formState: { errors, dirtyFields, isSubmitting } } = useForm({
      defaultValues: {
         name: category.name,
         goal: category.goals[category.goalIndex].goal,
         type: category.type as "Income" | "Expenses"
      }
   });

   const onSubmit = async(data: FieldValues) => {
      try {
         if (Object.keys(dirtyFields).length === 0) {
            onCancel(); // No changes
            return;
         }

         // Prepare payloads for updates
         const categoryPayload = {
            name: data.name ?? undefined,
            type: data.type ?? undefined
         };
         const categoryFields = updateCategorySchema.safeParse(categoryPayload);
         const categoryUpdates = Boolean(categoryPayload.name || categoryPayload.type);

         if (!categoryFields.success) {
            // Invalid category updates
            handleValidationErrors(categoryFields, setError);
            return;
         }

         // Prepare payload for budget update, which may be a update or create request based on the current period
         const budgetPayload = {
            goal: data.goal ? Number(data.goal) : undefined,
            budget_category_id: category.budget_category_id,
            month,
            year
         };
         const budgetFields = updateBudgetGoalSchema.safeParse(budgetPayload);
         const budgetUpdates = Boolean(budgetPayload.goal);

         if (!budgetFields.success) {
            // Invalid budget updates
            handleValidationErrors(budgetFields, setError);
            return;
         }

         const isCurrentPeriod = comparePeriods(category.goals[category.goalIndex], { month, year }) === 0;
         const method = isCurrentPeriod ? "PUT" : "POST";

         // Send potential  updates in parallel requests
         const [categoryResponse, budgetResponse] = await Promise.all([
            categoryUpdates ? sendApiRequest<number>(
               `dashboard/budgets/category/${category.budget_category_id}`, "PUT", categoryPayload, dispatch, navigate, setError
            ) : Promise.resolve(null),
            budgetUpdates ? sendApiRequest<{ success: boolean } | number>(
               `dashboard/budgets/budget/${category.budget_category_id}`, method, budgetPayload, dispatch, navigate, setError
            ) : Promise.resolve(null)
         ]);

         const categorySuccess = !categoryUpdates || categoryResponse === 204;
         const budgetSuccess = !budgetUpdates || (budgetResponse instanceof Object && budgetResponse.success) || budgetResponse === 204;

         // Handle successful responses
         if (categoryUpdates && categorySuccess) {
            // Update the category on a successful request
            dispatch(updateBudgetCategory({
               type: category.type,
               updates: {
                  ...categoryPayload,
                  budget_category_id: category.budget_category_id
               }
            }));
         }

         if (budgetUpdates && budgetSuccess) {
            // Update the budget on a successful request
            dispatch(updateBudget({
               type: data.type || category.type,
               budget_category_id: category.budget_category_id,
               goal: Number(data.goal)
            }));
         }

         if (categorySuccess && budgetSuccess) {
            // sendApiRequest will handle errors through setError or notification
            onCancel();
         }
      } catch (error) {
         console.error(`Error updating category: ${error}`);
      }
   };

   return (
      <form
         data-dirty = { Object.keys(dirtyFields).length > 0 }
         id = "editor-form"
         onSubmit = { handleSubmit(onSubmit) }
      >
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
                  color = "info"
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