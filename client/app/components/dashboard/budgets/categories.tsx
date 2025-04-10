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
import { faGripVertical, faPenToSquare, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   List,
   ListItemButton,
   ListItemIcon,
   ListItemText,
   Stack,
   useTheme
} from "@mui/material";
import { type BudgetCategory, type OrganizedBudget } from "capital/budgets";
import { memo, useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import ConstructCategory from "@/components/dashboard/budgets/constructor";
import DeleteBudget from "@/components/dashboard/budgets/delete";
import EditCategory from "@/components/dashboard/budgets/editor";
import { sendApiRequest } from "@/lib/api";
import { displayCurrency, horizontalScroll } from "@/lib/display";
import { updateBudgetCategoryOrder } from "@/redux/slices/budgets";
import type { RootState } from "@/redux/store";

/**
 * The props for the BudgetCategories component
 *
 * @interface BudgetCategoriesProps
 * @property {string} type - The type of budget to display
 * @property {Function} updateDirtyFields - The function to update the dirty fields
 */
interface BudgetCategoriesProps {
   type: "Income" | "Expenses";
   updateDirtyFields: (_fields: object, _field: string) => void;
}

/**
 * The props for the CategoryItem component
 *
 * @interface CategoryItemProps
 * @property {BudgetCategory} category - The category to display
 * @property {string} editingCategory - The ID of the category being edited
 * @property {Function} setEditingCategory - The function to set the editing category within the categories section
 */
interface CategoryItemProps extends BudgetCategoriesProps {
   category: BudgetCategory;
   editingCategory: string | null;
   setEditingCategory: (_id: string | null) => void;
}

/**
 * The CategoryItem component to display a category within the categories section
 *
 * @param {CategoryItemProps} props - The props for the CategoryItem component
 * @returns {React.ReactNode} The CategoryItem component
 */
const CategoryItem = memo(function CategoryItem({ category, editingCategory, setEditingCategory, type, updateDirtyFields }: CategoryItemProps) {
   const theme = useTheme();
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

   const editCategory = useCallback(() => {
      setEditingCategory(category.budget_category_id);
   }, [category.budget_category_id, setEditingCategory]);

   const cancelEditCategory = useCallback(() => {
      // Cancel editing the category and clear the form dirty fields
      setEditingCategory(null);
      updateDirtyFields({}, "editor");
   }, [setEditingCategory, updateDirtyFields]);

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
                  onCancel = { cancelEditCategory }
                  updateDirtyFields = { updateDirtyFields }
               />
            ) : (
               <Stack
                  direction = "row"
                  spacing = { 1 }
                  sx = { { alignItems: "center", px: 1 } }
               >
                  <List
                     component = "div"
                     disablePadding = { true }
                     sx = { { width: "100%" } }
                  >
                     <ListItemButton
                        disableRipple = { true }
                        disableTouchRipple = { true }
                        sx = { { justifyContent: "center", cursor: "default", "&:hover": { backgroundColor: "transparent" }, p: 0 } }
                     >
                        <ListItemIcon sx = { { mr: -3.5, color: "inherit" } }>
                           <FontAwesomeIcon
                              icon = { faGripVertical }
                              style = { { cursor: "grab", touchAction: "none", outline: "none", letterSpacing: "0px", height: "1.4rem", width: "1.4rem" } }
                              { ...listeners }
                              { ...attributes }
                           />
                        </ListItemIcon>
                        <ListItemText
                           primary = { category.name }
                           secondary = { displayCurrency(goal) }
                           sx = { { ...horizontalScroll(theme), maxWidth: "calc(100% - 5rem)", mr: "auto", userSelect: "text", cursor: "text", pl: 0.5 } }
                        />
                        <Stack
                           direction = "row"
                           spacing = { 1 }
                        >
                           <FontAwesomeIcon
                              className = "primary"
                              icon = { faPenToSquare }
                              onClick = { editCategory }
                              size = "lg"
                              style = { { cursor: "pointer", marginTop: "1px" } }
                           />
                           <DeleteBudget
                              budget_category_id = { category.budget_category_id }
                              type = { type }
                           />
                        </Stack>
                     </ListItemButton>
                  </List>
               </Stack>
            )
         }
      </Box>
   );
});

/**
 * The BudgetCategories component to display the categories section
 *
 * @param {BudgetCategoriesProps} props - The props for the BudgetCategories component
 * @returns {React.ReactNode} The BudgetCategories component
 */
export default function BudgetCategories({ type, updateDirtyFields }: BudgetCategoriesProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const [editingCategory, setEditingCategory] = useState<string | null>(null);
   const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);

   // Memoize category IDs for drag and drop
   const categoryIds = useMemo(() => {
      return budget.categories.map(category => category.budget_category_id ?? "");
   }, [budget.categories]);

   const createNewCategory = useCallback((show: boolean) => {
      setShowNewCategoryForm(show);
   }, []);

   // Handler for when a new category is successfully created
   const cancelCreateNewCategory = useCallback(() => {
      // Close the form and clear the form dirty fields
      createNewCategory(false);
      updateDirtyFields({}, "constructor");
   }, [createNewCategory, updateDirtyFields]);

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
      const { active, over } = event;

      // Only proceed if dropping on a different position and over is defined
      if (active.id !== over?.id && over) {
         let oldIndex: number | undefined;
         let newIndex: number | undefined;

         // Find the indices of the dragged and target categories
         const categories = budget.categories;
         for (let i = 0; i < categories.length; i++) {
            const category = categories[i];

            if (category.budget_category_id === active.id) {
               oldIndex = i;
            }

            if (category.budget_category_id === over.id) {
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

            dispatch(updateBudgetCategoryOrder({
               type,
               categories: newCategories
            }));

            // Sync new order with server after optimistic updates
            try {
               const categoryIds: string[] = newCategories.map(category => category.budget_category_id);
               const result = await sendApiRequest(
                  "dashboard/budgets/category/ordering", "PUT", { categoryIds }, dispatch, navigate
               );

               if (result !== 204) {
                  throw new Error("Failed to update category order");
               }
            } catch (error) {
               // Revert optimistic update if server request fails
               console.error("Failed to update category order:", error);
               dispatch(updateBudgetCategoryOrder({
                  type,
                  categories: oldCategories
               }));
            }
         }
      }
   }, [budget.categories, dispatch, navigate, type]);

   return (
      <Stack
         direction = "column"
         spacing = { 2 }
         sx = { { mt: 1 } }
      >
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
                  budget.categories.map((category) => (
                     <CategoryItem
                        category = { category }
                        editingCategory = { editingCategory }
                        key = { category.budget_category_id }
                        setEditingCategory = { setEditingCategory }
                        type = { type }
                        updateDirtyFields = { updateDirtyFields }
                     />
                  ))
               }
            </SortableContext>
         </DndContext>
         <Box>
            {
               !showNewCategoryForm ? (
                  <Button
                     className = "btn-primary"
                     color = "primary"
                     fullWidth = { true }
                     onClick = { () => createNewCategory(true) }
                     startIcon = { <FontAwesomeIcon icon = { faPlus } /> }
                     variant = "contained"
                  >
                     Add Category
                  </Button>
               ) : (
                  <ConstructCategory
                     onClose = { cancelCreateNewCategory }
                     type = { type }
                     updateDirtyFields = { updateDirtyFields }
                  />
               )
            }
         </Box>
      </Stack>
   );
}