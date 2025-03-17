import { faPlus, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
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
import { budgetCategorySchema, budgetSchema } from "capital/budgets";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { sendApiRequest } from "@/lib/api";
import { handleValidationErrors } from "@/lib/validation";
import { addBudgetCategory } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

// Combining category and budget validations for a single form
const constructSchema = budgetCategorySchema
   .omit({ budget_category_id: true, user_id: true, category_order: true })
   .merge(budgetSchema.innerType().pick({ goal: true }));

interface ConstructCategoryProps {
   onClose: () => void;
   isSubmitting: boolean;
   parentType: "Income" | "Expenses";
}

export default function ConstructCategory({ onClose, isSubmitting, parentType }: ConstructCategoryProps) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);
   const parentCategories = useSelector((state: RootState) => state.budgets.value[parentType].categories);

   // Initialize form with typed values and defaults
   const { control, handleSubmit, setError, reset, formState: { errors } } = useForm({
      defaultValues: {
         name: "",
         goal: 0,
         type: parentType
      }
   });

   // Handle form submission to create a new budget category
   const onSubmit = async(data: FieldValues) => {
      try {
         // Validate form data against our combined schema
         const fields = constructSchema.safeParse(data);

         if (!fields.success) {
            handleValidationErrors(fields, setError as any);
            return;
         }

         // Prepare the payload for the API request
         const payload = {
            name: data.name.trim(),
            type: data.type,
            goal: Number(data.goal),
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
               type: data.type,
               category: {
                  budget_category_id: result.budget_category_id,
                  name: data.name.trim(),
                  type: data.type,
                  goalIndex: 0,
                  goals: [{
                     month,
                     year,
                     goal: Number(data.goal)
                  }],
                  category_order: parentCategories.length
               }
            }));

            // Reset and close the form after successful creation
            reset();
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
            spacing = { 2 }
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
                           disabled = { isSubmitting }
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
                           disabled = { isSubmitting }
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
            <Controller
               control = { control }
               defaultValue = { parentType }
               name = "type"
               render = {
                  ({ field }) => (
                     <FormControl
                        disabled = { isSubmitting }
                        error = { Boolean(errors.type) }
                        sx = { { px: 0.75 } }
                     >
                        <InputLabel
                           htmlFor = "constructor-type"
                           sx = { { px: 0.75 } }
                           variant = "standard"
                        >
                           Type
                        </InputLabel>
                        <NativeSelect
                           { ...field }
                           id = "constructor-type"
                        >
                           <option value = "Income">Income</option>
                           <option value = "Expenses">Expenses</option>
                        </NativeSelect>
                     </FormControl>
                  )
               }
            />
            <Stack
               direction = "column"
               spacing = { 1 }
            >
               <Button
                  color = "primary"
                  disabled = { isSubmitting }
                  fullWidth = { true }
                  loading = { isSubmitting }
                  startIcon = { <FontAwesomeIcon icon = { faPlus } /> }
                  type = "submit"
                  variant = "contained"
               >
                  Create
               </Button>
               <Button
                  color = "inherit"
                  disabled = { isSubmitting }
                  fullWidth = { true }
                  onClick = { onClose }
                  startIcon = { <FontAwesomeIcon icon = { faRotateLeft } /> }
                  variant = "outlined"
               >
                  Cancel
               </Button>
            </Stack>
         </Stack>
      </form>
   );
}