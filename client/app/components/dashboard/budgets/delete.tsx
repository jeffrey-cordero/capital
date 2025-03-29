import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Confirmation from "@/components/global/confirmation";
import { sendApiRequest } from "@/lib/api";
import { removeBudgetCategory } from "@/redux/slices/budgets";

/**
 * The props for the DeleteBudget component
 *
 * @interface DeleteBudgetProps
 * @property {string} budget_category_id - The ID of the budget category to delete
 * @property {"Income" | "Expenses"} type - The type of the budget category
 */
interface DeleteBudgetProps {
   budget_category_id: string;
   type: "Income" | "Expenses";
}

/**
 * The message for the dialog to confirm the deletion of a budget category
 */
const message: string = "Are you sure you want to delete this category? This action will permanently erase this budget category and all its goals. Any transactions linked to this category will be detached, but not deleted. Once deleted, this action cannot be undone.";

/**
 * The DeleteBudget component to delete a budget category with confirmation
 *
 * @param {DeleteBudgetProps} props - The props for the DeleteBudget component
 * @returns {React.ReactNode} The DeleteBudget component
 */
export default function DeleteBudget({ budget_category_id, type }: DeleteBudgetProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();

   const onSubmit = async() => {
      try {
         // Send delete request to the API
         const result = await sendApiRequest<number>(
            `dashboard/budgets/category/${budget_category_id}`, "DELETE", undefined, dispatch, navigate
         );

         // Remove the budget category from the Redux store
         if (result === 204) {
            dispatch(removeBudgetCategory({
               type,
               budget_category_id
            }));
         }
      } catch (error) {
         console.error("Failed to delete budget category:", error);
      }
   };

   return (
      <Confirmation
         message = { message }
         onConfirmation = { onSubmit }
         type = "icon"
      />
   );
}