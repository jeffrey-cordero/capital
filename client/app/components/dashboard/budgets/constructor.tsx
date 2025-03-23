import { faClockRotateLeft, faFeatherPointed } from "@fortawesome/free-solid-svg-icons";
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

// Combining category and budget validations for a single form
const constructSchema = budgetCategorySchema.omit(
   { budget_category_id: true, user_id: true, category_order: true, type: true } // Current type is based on the parent type
).merge(budgetSchema.innerType().pick(
   { goal: true })
);

interface ConstructCategoryProps {
   onClose: () => void;
   type: "Income" | "Expenses";
}

export default function ConstructCategory({ onClose, type }: ConstructCategoryProps) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);
   const parentCategory = useSelector((state: RootState) => state.budgets.value[type]);

   // Initialize form with typed values and defaults
   const { control, handleSubmit, setError, formState: { errors, isSubmitting, dirtyFields } } = useForm();

   // Handle form submission to create a new budget category
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
            name: data.name,
            type,
            goal: Number(data.goal),
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
                     goal: Number(data.goal)
                  }]
               }
            }));

            // Close the form after successful creation
            onClose();
         }
      } catch (error) {
         console.error("Failed to create budget category:", error);
      }
   };

   return (
      <form onSubmit = { handleSubmit(onSubmit) }>
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
                           data-dirty = { field.value !== undefined }
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
                  color = "info"
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
                  startIcon = { <FontAwesomeIcon icon = { faFeatherPointed } /> }
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