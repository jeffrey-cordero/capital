import { HTTP_STATUS } from "capital/server";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Confirmation from "@/components/global/confirmation";
import { sendApiRequest } from "@/lib/api";
import { removeBudgetCategory } from "@/redux/slices/budgets";

/**
 * The props for the DeleteBudget component
 *
 * @interface DeleteBudgetProps
 * @property {string} budget_category_id - The budget category identifier
 * @property {"Income" | "Expenses"} type - The budget category type
 */
interface DeleteBudgetProps {
   budget_category_id: string;
   type: "Income" | "Expenses";
}

/**
 * Confirmation message for category deletion
 */
const message: string = "Are you sure you want to delete this category? This action will permanently erase this budget category and all its goals. Any transactions linked to this category will be detached, but not deleted. Once deleted, this action cannot be undone.";

/**
 * Budget category deletion component with confirmation dialog
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

         if (result === HTTP_STATUS.NO_CONTENT) {
            // Remove the budget category from the Redux store
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