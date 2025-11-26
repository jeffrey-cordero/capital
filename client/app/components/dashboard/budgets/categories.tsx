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
import { faGripVertical, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   List,
   ListItemButton,
   ListItemIcon,
   ListItemText,
   Stack,
   useTheme
} from "@mui/material";
import { type BudgetCategory, type OrganizedBudget } from "capital/budgets";
import { HTTP_STATUS } from "capital/server";
import { useCallback, useMemo, useState } from "react";
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
 * Props for the BudgetCategories component
 *
 * @property {"Income" | "Expenses"} type - Budget type to display
 * @property {Function} updateDirtyFields - Dirty fields tracker function
 */
interface BudgetCategoriesProps {
   type: "Income" | "Expenses";
   updateDirtyFields: (fields: object, field: string) => void;
}

/**
 * Props for the CategoryItem component
 *
 * @property {BudgetCategory} category - Budget category to display
 */
interface CategoryItemProps extends BudgetCategoriesProps {
   category: BudgetCategory;
}

/**
 * Draggable budget category item with edit/delete controls
 *
 * @param {CategoryItemProps} props - The props for the CategoryItem component
 * @returns {React.ReactNode} The CategoryItem component
 */
const CategoryItem = function CategoryItem({ category, type, updateDirtyFields }: CategoryItemProps): React.ReactNode {
   const theme = useTheme();
   const [isEditing, setIsEditing] = useState(false);
   const goal = category.goals[category.goalIndex].goal;

   // Drag and drop configuration
   const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: category.budget_category_id || "",
      disabled: isEditing
   });

   const style = {
      transform: CSS.Transform.toString(transform),
      transition
   };

   // Edit category handlers
   const editCategory = useCallback(() => {
      setIsEditing(true);
   }, []);

   const cancelEditCategory = useCallback(() => {
      setIsEditing(false);
      updateDirtyFields({}, "editor");
   }, [updateDirtyFields]);

   return (
      <Box
         data-testid = { `budget-category-item-${category.budget_category_id}` }
         key = { category.budget_category_id }
         ref = { setNodeRef }
         style = { style }
      >
         <EditCategory
            category = { category }
            onCancel = { cancelEditCategory }
            updateDirtyFields = { updateDirtyFields }
            visible = { isEditing }
         />
         <Stack
            direction = "row"
            spacing = { 1 }
            sx = { { alignItems: "center", px: 1, display: isEditing ? "none" : "flex" } }
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
                        data-testid = { `budget-category-drag-${category.budget_category_id}` }
                     />
                  </ListItemIcon>
                  <ListItemText
                     data-testid = { `budget-category-view-${category.budget_category_id}` }
                     primary = { category.name }
                     secondary = { displayCurrency(goal) }
                     sx = { { ...horizontalScroll(theme), maxWidth: "calc(100% - 5rem)", mr: "auto", userSelect: "text", cursor: "text", pl: 0.5, fontWeight: "600" } }
                  />
                  <Stack
                     direction = "row"
                     spacing = { 1 }
                  >
                     <FontAwesomeIcon
                        className = "primary"
                        data-testid = { `budget-category-edit-btn-${category.budget_category_id}` }
                        icon = { faPenToSquare }
                        onClick = { editCategory }
                        size = "lg"
                        style = { { cursor: "pointer" } }
                     />
                     <DeleteBudget
                        budget_category_id = { category.budget_category_id }
                        type = { type }
                     />
                  </Stack>
               </ListItemButton>
            </List>
         </Stack>
      </Box>
   );
};

/**
 * Sortable budget categories container with drag-and-drop functionality
 *
 * @param {BudgetCategoriesProps} props - The props for the BudgetCategories component
 * @returns {React.ReactNode} The BudgetCategories component
 */
export default function BudgetCategories({ type, updateDirtyFields }: BudgetCategoriesProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);
   const [displayNewCategoryForm, setDisplayNewCategoryForm] = useState(false);

   // Memoize category IDs and their respective components
   const [categoryIds, categories] = useMemo(() => {
      return budget.categories.reduce((acc, record) => {
         acc[0].push(record.budget_category_id);
         acc[1].push(
            <CategoryItem
               category = { record }
               key = { record.budget_category_id }
               type = { type }
               updateDirtyFields = { updateDirtyFields }
            />
         );
         return acc;
      }, [[], []] as [string[], React.ReactNode[]]);
   }, [budget.categories, type, updateDirtyFields]);

   // New category form handlers
   const openCreateNewCategoryForm = useCallback(() => {
      setDisplayNewCategoryForm(true);
   }, []);

   const closeCreateNewCategoryForm = useCallback(() => {
      setDisplayNewCategoryForm(false);
      updateDirtyFields({}, "constructor");
   }, [updateDirtyFields]);

   // Configure drag and drop sensors with touch, pointer and keyboard support
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

   // Handle category reordering with optimistic updates and server synchronization
   const handleDragEnd = useCallback(async(event: DragEndEvent) => {
      const { active, over } = event;

      if (active.id !== over?.id && over) {
         let oldIndex: number | undefined;
         let newIndex: number | undefined;

         // Find indices of dragged and target categories
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

         // Update category ordering optimistically with potential backup measures
         if (oldIndex !== undefined && newIndex !== undefined) {
            const oldCategories = categories.map(category => ({ ...category }));
            const newCategories = arrayMove(categories, oldIndex, newIndex).map(
               (category, index) => ({ ...category, category_order: index })
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

               if (result !== HTTP_STATUS.NO_CONTENT) {
                  throw new Error("Failed to update category order");
               }
            } catch (error) {
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
         spacing = { 1 }
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
               <Box data-testid = "budget-categories-list">
                  { categories }
               </Box>
            </SortableContext>
         </DndContext>
         <ConstructCategory
            onClose = { closeCreateNewCategoryForm }
            onOpen = { openCreateNewCategoryForm }
            type = { type }
            updateDirtyFields = { updateDirtyFields }
            visible = { displayNewCategoryForm }
         />
      </Stack>
   );
}