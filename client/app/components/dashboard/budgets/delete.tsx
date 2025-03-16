import { type BudgetCategory } from "capital/budgets";
import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Confirmation from "@/components/global/confirmation";
import { sendApiRequest } from "@/lib/api";
import { removeBudgetCategory } from "@/redux/slices/budgets";

// Component for deleting a budget category with confirmation
interface BudgetDeletionProps {
   category: BudgetCategory;
   type: "Income" | "Expenses";
   disabled: boolean;
}
export default function BudgetDeletion({ category, type, disabled }: BudgetDeletionProps) {
   const dispatch = useDispatch(), navigate = useNavigate();

   // Handle the deletion process when confirmed
   const onSubmit = useCallback(async() => {
      try {
         // Send delete request to the API
         const result = await sendApiRequest<number>(
            `dashboard/budgets/category/${category.budget_category_id}`,
            "DELETE",
            undefined,
            dispatch,
            navigate
         );

         // If successful, update the Redux store
         if (result === 204) {
            dispatch(removeBudgetCategory({
               type,
               budget_category_id: category.budget_category_id
            }));
         }
      } catch (error) {
         console.error("Failed to delete budget category:", error);
      }
   }, [dispatch, navigate, category.budget_category_id, type]);

   return (
      <Confirmation
         disabled = { disabled }
         message = {
            `Are you sure you want to delete the "${category.name}" category? This action will permanently erase this budget category and all its goals. 
            Any transactions linked to this category will be detached, but not deleted. Once deleted, this action cannot be undone.`
         }
         onConfirmation = { onSubmit }
         type = "icon"
      />
   );
};