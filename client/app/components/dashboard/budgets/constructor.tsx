import { faClockRotateLeft, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Button,
   FormControl,
   FormHelperText,
   InputLabel,
   OutlinedInput,
   Stack
} from "@mui/material";
import { budgetCategorySchema, budgetSchema } from "capital/budgets";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { sendApiRequest } from "@/lib/api";
import { handleValidationErrors } from "@/lib/validation";
import { addBudgetCategory } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

/**
 * Schema that combines category and budget validations for a single form
 */
const constructSchema = budgetCategorySchema.omit(
   { budget_category_id: true, user_id: true, category_order: true, type: true }
).merge(budgetSchema.innerType().pick(
   { goal: true })
);

/**
 * The ConstructCategory component to create a new budget category
 *
 * @interface ConstructCategoryProps
 * @property {() => void} onClose - The function to close the form
 * @property {"Income" | "Expenses"} type - The type of the budget category
 * @property {(_fields: object, _field: string) => void} updateDirtyFields - The function to update the dirty fields
 */
interface ConstructCategoryProps {
   onClose: () => void;
   type: "Income" | "Expenses";
   updateDirtyFields: (_fields: object, _field: string) => void;
}

/**
 * The ConstructCategory component to create a new budget category
 *
 * @param {ConstructCategoryProps} props - The props for the ConstructCategory component
 * @returns {React.ReactNode} The ConstructCategory component
 */
export default function ConstructCategory({ onClose, type, updateDirtyFields }: ConstructCategoryProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);
   const parentCategory = useSelector((state: RootState) => state.budgets.value[type]);

   // Initialize constructor form with defaults
   const {
      control,
      handleSubmit,
      setError,
      reset,
      formState: { errors, isSubmitting, dirtyFields }
   } = useForm({
      defaultValues: { name: "", goal: "" }
   });

   const onSubmit = async(data: FieldValues) => {
      try {
         // Validate form data against our combined schema
         const fields = constructSchema.safeParse(data);

         if (!fields.success) {
            handleValidationErrors(fields, setError);
            return;
         }

         // Prepare the payload for the API request
         const payload = {
            budget_category_id: parentCategory.budget_category_id,
            name: fields.data.name,
            type,
            goal: Number(fields.data.goal),
            category_order: parentCategory.categories.length,
            month,
            year
         };

         // Send API request to create new category
         const result = await sendApiRequest<{ budget_category_id: string }>(
            "dashboard/budgets/category", "POST", payload, dispatch, navigate, setError
         );

         // Handle successful category creation
         if (typeof result === "object" && result?.budget_category_id) {
            // Add the new category to Redux store
            dispatch(addBudgetCategory({
               type,
               category: {
                  ...payload,
                  budget_category_id: result.budget_category_id,
                  goalIndex: 0,
                  goals: [{
                     month,
                     year,
                     goal: Number(fields.data.goal)
                  }]
               }
            }));

            // Clear the form
            reset({ name: "", goal: "" }, { keepDirty: false });

            // Clear the form dirty fields
            updateDirtyFields({}, "constructor");

            // Close the form after successful creation
            onClose();
         }
      } catch (error) {
         console.error("Failed to create budget category:", error);
      }
   };

   return (
      <form
         onChange = { () => updateDirtyFields(dirtyFields, "constructor") }
         onSubmit = { handleSubmit(onSubmit) }
      >
         <Stack
            direction = "column"
            spacing = { 1 }
            sx = { { mt: 1 } }
         >
            <Controller
               control = { control }
               name = "name"
               render = {
                  ({ field }) => (
                     <FormControl error = { Boolean(errors.name) }>
                        <InputLabel htmlFor = "constructor-name">
                           Name
                        </InputLabel>
                        <OutlinedInput
                           { ...field }
                           aria-label = "Name"
                           autoComplete = "none"
                           id = "constructor-name"
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
                        <InputLabel htmlFor = "constructor-goal">
                           Goal
                        </InputLabel>
                        <OutlinedInput
                           { ...field }
                           aria-label = "Goal"
                           id = "constructor-goal"
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
               direction = { { xs: "column", sm: "row" } }
               spacing = { 1 }
            >
               <Button
                  className = "btn-primary"
                  color = "secondary"
                  disabled = { isSubmitting }
                  fullWidth = { true }
                  onClick = { onClose }
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
                  startIcon = { <FontAwesomeIcon icon = { faPlus } /> }
                  type = "submit"
                  variant = "contained"
               >
                  Create
               </Button>
            </Stack>
         </Stack>
      </form>
   );
}