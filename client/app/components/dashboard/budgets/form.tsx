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

interface BudgetFormProps {
   budget: OrganizedBudget;
   type: "Income" | "Expenses";
   open: boolean;
   onClose: () => void;
}

interface CategoryFormProps {
   category: BudgetCategory & { goals: any[] };
   onSave: (_data: any) => void;
   onCancel: () => void;
   isSubmitting: boolean;
}

// Component for editing a single category
function CategoryEditor({ category, onSave, onCancel, isSubmitting }: CategoryFormProps) {
   const { control, handleSubmit, formState: { errors } } = useForm({
      defaultValues: {
         name: category.name,
         goal: category.goals[0]?.goal || 0,
         type: (category.type)
      }
   });

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

interface NewCategoryFormProps {
   onSave: (_data: any) => void;
   onCancel: () => void;
   isSubmitting: boolean;
   parentType: "Income" | "Expenses";
}

// Component for creating a new category
function NewCategoryForm({ onSave, onCancel, isSubmitting, parentType }: NewCategoryFormProps) {
   const { control, handleSubmit, formState: { errors } } = useForm({
      defaultValues: {
         name: "",
         goal: 0,
         type: parentType
      }
   });

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
                  startIcon = { <FontAwesomeIcon icon = { faPlus } /> }
                  type = "submit"
                  variant = "contained"
               >
                  Create
               </Button>
               <Button
                  color = "secondary"
                  disabled = { isSubmitting }
                  fullWidth = { true }
                  onClick = { onCancel }
                  variant = "outlined"
               >
                  Cancel
               </Button>
            </Stack>
         </Stack>
      </form>
   );
}

export default function BudgetForm({ budget, type, open, onClose }: BudgetFormProps) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { period } = useSelector((state: RootState) => state.budgets.value) as { period: { month: number, year: number } };
   const [editingCategory, setEditingCategory] = useState<string | null>(null);
   const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);

   // Form setup with react-hook-form
   const {
      control,
      setError,
      handleSubmit,
      reset,
      formState: { isSubmitting, errors, dirtyFields }
   } = useForm();

   // Reset form when modal opens/closes or budget changes
   useEffect(() => {
      if (open) {
         reset({
            goal: budget.goals[0]?.goal || 0
         });
         setEditingCategory(null);
         setShowNewCategoryForm(false);
      } else {
         reset();
      }
   }, [budget, reset, open]);

   // Handle main budget goal update
   const onSubmit = async(data: FieldValues) => {
      try {
         // Validate the data
         const fields = budgetSchema.innerType().partial().safeParse(data);

         if (!fields.success) {
            handleValidationErrors(fields, setError);
         }

         if (Object.keys(dirtyFields).length === 0) {
            // No changes made, just close the modal
            onClose();
            return;
         }

         // Update the main budget goal
         const update = {
            goal: parseFloat(data.goal),
            year: period.year,
            month: period.month
         };

         const result = await sendApiRequest(
            `dashboard/budgets/budget/${budget.budget_category_id}`,
            "PUT",
            update,
            dispatch,
            navigate,
            setError
         );

         if (result === 204) {
            // Update Redux store with the new goal
            dispatch(updateBudget({
               type,
               budget_category_id: budget.budget_category_id,
               goal: parseFloat(data.goal)
            }));

            // Close modal on success
            onClose();
         }
      } catch (error) {
         console.error("Failed to update budget:", error);
      }
   };

   // Handle category update
   const handleCategoryUpdate = async(data: FieldValues) => {
      if (!editingCategory) return;

      try {
         // Prepare update data
         const update = {
            name: data.name ?? undefined,
            goal: data.goal ? parseFloat(data.goal) : undefined,
            type: data.type ?? undefined
         };

         // Send API request to update the category
         const result = await sendApiRequest(
            `dashboard/budgets/category/${editingCategory}`,
            "PUT",
            update,
            dispatch,
            navigate,
            setError
         );

         if (result === 204) {
            // Update Redux store with the updated category
            dispatch(updateBudgetCategory({
               type,
               updates: {
                  budget_category_id: editingCategory,
                  ...update
               }
            }));

            // Reset editing state
            setEditingCategory(null);
         }
      } catch (error) {
         console.error("Failed to update category:", error);
      }
   };

   // Handle new category creation
   const handleCreateCategory = async(data: FieldValues) => {
      try {
         // Prepare creation data
         const creation = {
            name: data.name,
            type: data.type,
            parent_id: budget.budget_category_id,
            goal: parseFloat(data.goal),
            year: period.year,
            month: period.month
         };

         // Send API request to create the category
         const result = await sendApiRequest<{ budget_category_id: string }>(
            "dashboard/budgets/category",
            "POST",
            creation,
            dispatch,
            navigate,
            setError
         );

         if (result && typeof result === "object" && "budget_category_id" in result) {
            // Add the new category to Redux store
            dispatch(addBudgetCategory({
               type: data.type,
               category: {
                  budget_category_id: result.budget_category_id,
                  name: data.name,
                  type: data.type,
                  category_order: budget.categories.length - 1,
                  goalIndex: 0,
                  goals: [{
                     year: period.year,
                     month: period.month,
                     goal: parseFloat(data.goal)
                  }]
               }
            }));

            // Reset form state
            setShowNewCategoryForm(false);
         }
      } catch (error) {
         console.error("Failed to create category:", error);
      }
   };

   return (
      <Modal
         displayWarning = { Object.keys(dirtyFields).length > 0 }
         onClose = { onClose }
         open = { open }
         sx = { { position: "relative", width: { xs: "90%", md: "70%", lg: "60%", xl: "45%" }, p: { xs: 2, sm: 3 }, maxWidth: "90%" } }
      >
         <Stack
            direction = "column"
            spacing = { 3 }
         >
            <ModalSection title = "Goal">
               <Box>
                  <form onSubmit = { handleSubmit(onSubmit) }>
                     <Stack
                        direction = "column"
                        spacing = { 2 }
                        sx = { { mt: 3 } }
                     >
                        { /* Main category goal input */ }
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
                        { /* Form actions */ }
                        <Stack
                           direction = "column"
                           spacing = { 1 }
                        >
                           <Button
                              className = "btn-primary"
                              color = "primary"
                              disabled = { isSubmitting }
                              fullWidth = { true }
                              loading = { isSubmitting }
                              startIcon = { <FontAwesomeIcon icon = { faPenToSquare } /> }
                              type = "submit"
                              variant = "contained"
                           >
                              Update
                           </Button>
                        </Stack>
                     </Stack>
                  </form>
               </Box>
            </ModalSection>
            { /* Categories section */ }
            <ModalSection title = "Categories">
               <Stack
                  direction = "column"
                  spacing = { 2 }
                  sx = { { mt: 2 } }
               >
                  { /* List of existing categories */ }
                  {
                     budget.categories && budget.categories.map((category) => {
                        const isEditing = editingCategory === category.budget_category_id;
                        const currentAmount = 0; // Replace with actual data
                        const goalAmount = category.goals[0]?.goal || 0;

                        return (
                           <Box key = { category.budget_category_id }>
                              {
                                 isEditing ? (
                                    <CategoryEditor
                                       category = { category }
                                       isSubmitting = { isSubmitting }
                                       onCancel = { () => setEditingCategory(null) }
                                       onSave = { handleCategoryUpdate }
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
                                             variant = "subtitle2"
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

            { /* Transactions section for the budget */ }
            <ModalSection title = "Transactions">
               <Transactions
                  filter = "budget"
                  identifier = { budget.budget_category_id }
               />
            </ModalSection>
         </Stack>
      </Modal>
   );
}