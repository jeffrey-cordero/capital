import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   Collapse,
   FormControl,
   FormHelperText,
   InputLabel,
   OutlinedInput,
   Stack
} from "@mui/material";
import { budgetCategorySchema, budgetSchema } from "capital/budgets";
import { useCallback } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import SubmitButton from "@/components/global/submit";
import { sendApiRequest } from "@/lib/api";
import { handleValidationErrors } from "@/lib/validation";
import { addBudgetCategory } from "@/redux/slices/budgets";
import { type RootState } from "@/redux/store";

/**
 * Combined schema for category creation with budget goals
 */
const constructSchema = budgetCategorySchema.pick({
   name: true
}).merge(budgetSchema.innerType().pick({
   goal: true
}));

/**
 * Props for the ConstructCategory component
 *
 * @property {boolean} visible - Form visibility state
 * @property {() => void} onClose - Close handler
 * @property {() => void} onOpen - Open handler
 * @property {"Income" | "Expenses"} type - Budget category type
 * @property {(fields: object, field: string) => void} updateDirtyFields - Dirty fields tracker
 */
interface ConstructCategoryProps {
   visible: boolean;
   onClose: () => void;
   onOpen: () => void;
   type: "Income" | "Expenses";
   updateDirtyFields: (fields: object, field: string) => void;
}

/**
 * Form to create new budget categories
 *
 * @param {ConstructCategoryProps} props - The props for the ConstructCategory component
 * @returns {React.ReactNode} The ConstructCategory component
 */
export default function ConstructCategory({ visible, onOpen, onClose, type, updateDirtyFields }: ConstructCategoryProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);
   const parentCategory = useSelector((state: RootState) => state.budgets.value[type]);

   // Form setup with react-hook-form
   const {
      control,
      handleSubmit,
      setError,
      reset,
      formState: { errors, isSubmitting, dirtyFields } } = useForm({
      defaultValues: {
         name: "",
         goal: ""
      }
   });

   // Close the form and reset the dirty fields
   const closeForm = useCallback(() => {
      updateDirtyFields({}, "constructor");

      reset({ name: "", goal: "" }, { keepDirty: false });
      onClose();
   }, [reset, updateDirtyFields, onClose]);

   const onSubmit = async(data: FieldValues) => {
      try {
         const fields = constructSchema.safeParse(data);

         if (!fields.success) {
            // Invalid budget category inputs
            handleValidationErrors(fields, setError);
            return;
         }

         // Prepare the payload for the API request
         const payload = {
            budget_category_id: parentCategory.budget_category_id,
            name: fields.data.name,
            type,
            goal: fields.data.goal,
            category_order: parentCategory.categories.length,
            month,
            year
         };

         // Send API request to create new category
         const result = await sendApiRequest<{ budget_category_id: string }>(
            "dashboard/budgets/category", "POST", payload, dispatch, navigate, setError
         );

         if (typeof result === "object" && result?.budget_category_id) {
            // Add the new category to Redux store and close the form
            dispatch(addBudgetCategory({
               type,
               category: {
                  ...payload,
                  goalIndex: 0,
                  goals: [{
                     month,
                     year,
                     goal: fields.data.goal
                  }],
                  budget_category_id: result.budget_category_id
               }
            }));

            closeForm();
         }
      } catch (error) {
         console.error("Failed to create budget category:", error);
      }
   };

   return (
      <Box>
         <Collapse
            in = { !visible }
            mountOnEnter = { true }
            style = { { transformOrigin: "center top" } }
            timeout = { 350 }
         >
            <Button
               className = "btn-primary"
               color = "primary"
               data-testid = { `budget-category-add-${type}` }
               fullWidth = { true }
               onClick = { onOpen }
               startIcon = { <FontAwesomeIcon icon = { faPlus } /> }
               sx = { { display: visible ? "none" : "" } }
               variant = "contained"
            >
               Add Category
            </Button>
         </Collapse>
         <Collapse
            in = { visible }
            mountOnEnter = { true }
            style = { { transformOrigin: "center top" } }
            timeout = { 350 }
         >
            <form
               noValidate = { true }
               onChange = { () => updateDirtyFields(dirtyFields, "constructor") }
               onSubmit = { handleSubmit(onSubmit) }
            >
               <Stack
                  direction = "column"
                  spacing = { 1 }
                  sx = { { mt: parentCategory.categories.length > 0 ? 1 : -1 } }
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
                                 inputProps = { { "data-testid": "budget-category-name-input" } }
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
                                 inputProps = { { step: 0.01, min: 0, "data-testid": "budget-category-goal-input" } }
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
                     dataTestId = { "budget-category-new" }
                     isSubmitting = { isSubmitting }
                     onCancel = { closeForm }
                     type = "Create"
                     unmountOnExit = { false }
                     visible = { true }
                  />
               </Stack>
            </form>
         </Collapse>
      </Box>
   );
}