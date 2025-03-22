import {
   closestCenter,
   DndContext,
   type DragEndEvent,
   KeyboardSensor,
   PointerSensor,
   TouchSensor,
   useSensor,
   useSensors
} from "@dnd-kit/core";
import {
   arrayMove,
   SortableContext,
   sortableKeyboardCoordinates,
   useSortable,
   verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { faBars, faFeatherPointed, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Stack, Typography } from "@mui/material";
import { type BudgetCategory, type OrganizedBudget } from "capital/budgets";
import { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import ConstructCategory from "@/components/dashboard/budgets/constructor";
import DeleteBudget from "@/components/dashboard/budgets/delete";
import EditCategory from "@/components/dashboard/budgets/editor";
import { sendApiRequest } from "@/lib/api";
import { displayCurrency, ellipsis } from "@/lib/display";
import { updateBudgetCategoryOrder } from "@/redux/slices/budgets";
import type { RootState } from "@/redux/store";

interface BudgetCategoriesProps {
   type: "Income" | "Expenses";
}

interface CategoryItemProps {
   category: BudgetCategory;
   editingCategory: string | null;
   setEditingCategory: (_id: string | null) => void;
   type: "Income" | "Expenses";
}

function CategoryItem({ category, editingCategory, setEditingCategory, type }: CategoryItemProps) {
   const isEditing = editingCategory === category.budget_category_id;
   const goal = category.goals[category.goalIndex].goal;

   // Configure drag and drop functionality
   const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: category.budget_category_id || "",
      disabled: isEditing // Disable dragging when editing
   });

   const style = {
      transform: CSS.Transform.toString(transform),
      transition
   };

   return (
      <Box
         key = { category.budget_category_id }
         ref = { setNodeRef }
         style = { style }
      >
         {
            isEditing ? (
               <EditCategory
                  category = { category }
                  onCancel = { () => setEditingCategory(null) }
               />
            ) : (
               <Stack
                  direction = "row"
                  spacing = { 1 }
                  sx = { { alignItems: "center", px: 1 } }
               >
                  <FontAwesomeIcon
                     icon = { faBars }
                     { ...listeners }
                     { ...attributes }
                     style = { { cursor: "grab", outline: "none" } }
                  />
                  <Stack
                     direction = "row"
                     sx = { { width: "100%", justifyContent: { xs: "center", sm: "space-between" }, alignItems: "center" } }
                  >
                     <Stack
                        direction = "row"
                        spacing = { 1 }
                        sx = { { alignItems: "center" } }
                     >
                        <Typography
                           sx = { { ...ellipsis, maxWidth: "320px", pr: 1 } }
                           variant = "h6"
                        >
                           { category.name }
                        </Typography>
                     </Stack>
                     <Stack
                        direction = "row"
                        spacing = { 1 }
                        sx = { { alignItems: "center" } }
                     >
                        <Typography
                           sx = { { ...ellipsis, fontWeight: "600" } }
                           variant = "subtitle1"
                        >
                           { displayCurrency(goal) }
                        </Typography>
                        <FontAwesomeIcon
                           className = "primary"
                           icon = { faPenToSquare }
                           onClick = { () => setEditingCategory(category.budget_category_id) }
                           size = "lg"
                           style = { { cursor: "pointer" } }
                        />
                        <DeleteBudget
                           budget_category_id = { category.budget_category_id }
                           type = { type }
                        />
                     </Stack>
                  </Stack>
               </Stack>
            )
         }
      </Box>
   );
}

export default function BudgetCategories({ type }: BudgetCategoriesProps) {
   // Handle form submission for creating and updating budget subcategories
   const dispatch = useDispatch(), navigate = useNavigate();
   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);

   const [editingCategory, setEditingCategory] = useState<string | null>(null);
   const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);

   const categoryIds = useMemo(() => {
      return budget.categories.map(category => category.budget_category_id ?? "");
   }, [budget]);

   const displayNewCategoryForm = useCallback((show: boolean) => {
      setShowNewCategoryForm(show);
   }, []);

   // Handler for when a new category is successfully created
   const handleCloseConstructCategory = useCallback(() => {
      // Close the form after successful creation
      displayNewCategoryForm(false);
   }, [displayNewCategoryForm]);

   // Configure drag and drop sensors
   const sensors = useSensors(
      useSensor(TouchSensor),
      useSensor(PointerSensor, {
         activationConstraint: {
            distance: 8
         }
      }),
      useSensor(KeyboardSensor, {
         coordinateGetter: sortableKeyboardCoordinates
      })
   );

   const handleDragEnd = useCallback(async(event: DragEndEvent) => {
      // Handles the end of a drag operation
      const { active, over } = event;

      // Only proceed if dropping on a different position
      if (active.id !== over?.id) {
         let oldIndex: number | undefined;
         let newIndex: number | undefined;

         // Find the indices of the dragged and target categories
         const categories = budget.categories;
         for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            if (category.budget_category_id === active.id) {
               oldIndex = i;
            }
            if (category.budget_category_id === over?.id) {
               newIndex = i;
            }
         }

         // Update category order if both indices are found
         if (oldIndex !== undefined && newIndex !== undefined) {
            // Create backup of current order in case of failure on the server
            const oldCategories = categories.map(category => ({ ...category }));

            // Optimistically update category order
            const newCategories = arrayMove(categories, oldIndex, newIndex).map(
               (category, index) => ({ ...category, budget_category_order: index })
            );
            const ordering: string[] = newCategories.map(category => category.budget_category_id);

            dispatch(updateBudgetCategoryOrder({
               type,
               categories: newCategories
            }));

            // Sync new order with server
            sendApiRequest(
               "dashboard/budgets/category/ordering", "PUT", { categories: ordering }, dispatch, navigate
            ).then((result) => {
               if (result !== 204) {
                  throw new Error("Failed to update category order");
               }
            }).catch((error) => {
               // Revert optimistic update if server request fails
               console.error("Failed to update category order:", error);
               dispatch(updateBudgetCategoryOrder({
                  type,
                  categories: oldCategories
               }));
            });
         }
      }
   }, [budget, dispatch, navigate, type]);

   return (
      <Stack
         direction = "column"
         spacing = { 2 }
         sx = { { mt: 1 } }
      >
         { /* Existing sub categories */ }
         <DndContext
            collisionDetection = { closestCenter }
            onDragEnd = { handleDragEnd }
            sensors = { sensors }
         >
            <SortableContext
               items = { categoryIds }
               strategy = { verticalListSortingStrategy }
            >
               {
                  budget.categories.map((category) => {

                     return (
                        <CategoryItem
                           category = { category }
                           editingCategory = { editingCategory }
                           key = { category.budget_category_id }
                           setEditingCategory = { setEditingCategory }
                           type = { type }
                        />
                     );
                  })
               }
            </SortableContext>
         </DndContext>
         { /* New category */ }
         <Box sx = { { mt: 12 } }>
            {
               !showNewCategoryForm ? (
                  <Button
                     className = "btn-primary"
                     color = "primary"
                     fullWidth = { true }
                     onClick = { () => displayNewCategoryForm(true) }
                     startIcon = { <FontAwesomeIcon icon = { faFeatherPointed } /> }
                     variant = "contained"
                  >
                     Add Category
                  </Button>
               ) : (
                  <ConstructCategory
                     onClose = { handleCloseConstructCategory }
                     type = { type }
                  />
               )
            }
         </Box>
      </Stack>
   );
}