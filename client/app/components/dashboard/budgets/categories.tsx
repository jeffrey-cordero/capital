import { faPenToSquare, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Stack, Typography } from "@mui/material";
import { type OrganizedBudget } from "capital/budgets";
import { useCallback, useState } from "react";

import ConstructCategory from "@/components/dashboard/budgets/constructor";
import DeleteBudget from "@/components/dashboard/budgets/delete";
import EditCategory from "@/components/dashboard/budgets/editor";
import { ModalSection } from "@/components/global/modal";
import { displayCurrency } from "@/lib/display";

interface BudgetCategoriesProps {
   budget: OrganizedBudget;
   isSubmitting: boolean;
   type: "Income" | "Expenses";
}

export default function BudgetCategories({ budget, type, isSubmitting }: BudgetCategoriesProps) {
   // Handle form submission for creating and updating budget subcategories
   const [editingCategory, setEditingCategory] = useState<string | null>(null);
   const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);

   const displayNewCategoryForm = useCallback((show: boolean) => {
      setShowNewCategoryForm(show);
   }, []);

   // Handler for when a new category is successfully created
   const handleCloseConstructCategory = useCallback(() => {
      // Close the form after successful creation
      displayNewCategoryForm(false);
   }, [displayNewCategoryForm]);

   return (
      <ModalSection title = "Categories">
         <Stack
            direction = "column"
            spacing = { 2 }
            sx = { { mt: 2 } }
         >
            { /* Existing sub categories */ }
            {
               budget.categories.map((category) => {
                  const isEditing = editingCategory === category.budget_category_id;
                  const amount = 0; // Placeholder until transactions are implemented
                  const goal = category.goals[category.goalIndex].goal;

                  return (
                     <Box key = { category.budget_category_id }>
                        {
                           isEditing ? (
                              <EditCategory
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
                                       { displayCurrency(amount) } / { displayCurrency(goal) }
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
                                       <DeleteBudget
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
                        onClick = { () => displayNewCategoryForm(true) }
                        startIcon = { <FontAwesomeIcon icon = { faPlus } /> }
                        variant = "outlined"
                     >
                        Add Category
                     </Button>
                  ) : (
                     <ConstructCategory
                        isSubmitting = { isSubmitting }
                        onClose = { handleCloseConstructCategory }
                        parentType = { type }
                     />
                  )
               }
            </Box>
         </Stack>
      </ModalSection>
   );
}