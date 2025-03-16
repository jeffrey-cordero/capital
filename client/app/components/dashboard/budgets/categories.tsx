import { faPenToSquare, faPlus, faRotateLeft, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   Divider,
   FormControl,
   FormHelperText,
   InputLabel,
   NativeSelect,
   OutlinedInput,
   Stack,
   Typography
} from "@mui/material";
import { type BudgetCategory, budgetSchema, type OrganizedBudget } from "capital/budgets";
import { useEffect, useState } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import Transactions from "@/components/dashboard/accounts/transactions";
import BudgetDeletion from "@/components/dashboard/budgets/delete";
import { Modal, ModalSection } from "@/components/global/modal";
import { sendApiRequest } from "@/lib/api";
import { displayCurrency } from "@/lib/display";
import { handleValidationErrors } from "@/lib/validation";
import { addBudgetCategory, updateBudget, updateBudgetCategory } from "@/redux/slices/budgets";
import type { RootState } from "@/redux/store";


interface CategoryFormProps {
   category: BudgetCategory & { goals: any[] };
   onCancel: () => void;
   isSubmitting: boolean;
}

// Component for editing a single category
function CategoryEditor({ category, onCancel, isSubmitting }: CategoryFormProps) {
   const { control, handleSubmit, formState: { errors } } = useForm({
      defaultValues: {
         name: category.name,
         goal: category.goals[0]?.goal || 0,
         type: (category.type)
      }
   });

   const onSubmit = async (data: FieldValues) => {
      // Handles form submission for both create and update operations
      
   };

   return (
      <form onSubmit = { handleSubmit(onSave) }>
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
                        <InputLabel htmlFor = "name">
                           Name
                        </InputLabel>
                        <OutlinedInput
                           { ...field }
                           aria-label = "Name"
                           disabled = { isSubmitting }
                           id = "name"
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
                           htmlFor = "type"
                           sx = { { px: 0.75 } }
                           variant = "standard"
                        >
                           Type
                        </InputLabel>
                        <NativeSelect
                           { ...field }
                           id = "type"
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


interface BudgetCategoriesProps {
   budget: OrganizedBudget;
   isSubmitting: boolean;
   type: "Income" | "Expenses";
}

export default function BudgetCategories({ budget, type, isSubmitting }: BudgetCategoriesProps) {
   // Handle form submission for creating and updating budget subcategories
   const [editingCategory, setEditingCategory] = useState<string | null>(null);
   const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);

   // Edit/create form setup with react-hook-form
   

   return (
      <ModalSection title = "Categories">
         <Stack
            direction = "column"
            spacing = { 2 }
            sx = { { mt: 2 } }
         >
            { /* Existing sub categories */ }
            {
               budget.categories && budget.categories.map((category) => {
                  const isEditing = editingCategory === category.budget_category_id;
                  const currentAmount = 0; // Placeholder until transactions are implemented
                  const goal = category.goals[category.goalIndex]?.goal || 0;

                  return (
                     <Box key = { category.budget_category_id }>
                        {
                           isEditing ? (
                              <CategoryEditor
                                 category = { category }
                                 isSubmitting = { isSubmitting }
                                 onCancel = { () => setEditingCategory(null) }
                              />
                           ) : (
                              <Stack
                                 direction = "column"
                                 spacing = { 1 }
                              >
                                 <Stack
                                    direction = "row"
                                    sx = { { justifyContent: "space-between", alignItems: "center" } }
                                 >
                                    <Typography
                                       fontWeight = "semibold"
                                       variant = "subtitle1"
                                    >
                                       { displayCurrency(currentAmount) } / { displayCurrency(goalAmount) }
                                    </Typography>
                                    <Stack
                                       direction = "row"
                                       spacing = { 1 }
                                       sx = { { alignItems: "center" } }
                                    >
                                       <Typography variant = "subtitle1">
                                          { category.name }
                                       </Typography>
                                       <FontAwesomeIcon
                                          className = "primary"
                                          icon = { faPenToSquare }
                                          onClick = { () => setEditingCategory(category.budget_category_id) }
                                          size = "lg"
                                          style = { { cursor: "pointer" } }
                                       />
                                       <BudgetDeletion
                                          category = { category }
                                          disabled = { isSubmitting }
                                          type = { type }
                                       />
                                    </Stack>
                                 </Stack>
                              </Stack>
                           )
                        }
                     </Box>
                  );
               })
            }
            { /* New category */ }
            <Box sx = { { mb: 2 } }>
               {
                  !showNewCategoryForm ? (
                     <Button
                        color = "primary"
                        disabled = { isSubmitting }
                        fullWidth = { true }
                        onClick = { () => setShowNewCategoryForm(true) }
                        startIcon = { <FontAwesomeIcon icon = { faPlus } /> }
                        variant = "outlined"
                     >
                        Add Category
                     </Button>
                  ) : (
                     <NewCategoryForm
                        isSubmitting = { isSubmitting }
                        onCancel = { () => setShowNewCategoryForm(false) }
                        onSave = { handleCreateCategory }
                        parentType = { type }
                     />
                  )
               }
            </Box>
         </Stack>
      </ModalSection>
   )
}