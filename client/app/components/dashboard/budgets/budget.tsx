import { Stack } from "@mui/material";
import { type BudgetCategory, type BudgetGoals } from "capital/budgets";
import { useState } from "react";

import { BudgetCategoryList } from "@/components/dashboard/budgets/categories";
import { CreateCategory, CreateCategoryButton } from "@/components/dashboard/budgets/create";

// Props for the budget component
interface BudgetProps {
   type: "Income" | "Expenses";
   data: {
      goals: BudgetGoals[];
      budget_category_id: string;
      categories: Array<BudgetCategory & { goals: BudgetGoals[] }>;
   };
   onEditClick: () => void;
}

// Component to render a budget with its categories and creation functionality
export default function Budget({ type, data, onEditClick }: BudgetProps) {
   // State to track if we're creating a new category
   const [isCreating, setIsCreating] = useState(false);

   // Toggle category creation mode
   const toggleCreating = () => {
      setIsCreating(!isCreating);
   };

   // Handle saving a new category
   const handleSaveCategory = async (categoryData: { name: string; goal: number }) => {
      // Here you would typically call an API or dispatch a Redux action
      console.log("Saving new category:", categoryData);
      
      // Close the creation form after saving
      setIsCreating(false);
   };

   return (
      <Stack
         direction="column"
         spacing={1}
      >
         {/* Render the category list */}
         <BudgetCategoryList 
            data={data} 
            onEditClick={onEditClick} 
            type={type} 
         />
         
         {/* Show either the create button or the create form */}
         {isCreating ? (
            <CreateCategory
               onCancel={toggleCreating}
               onSave={handleSaveCategory}
               parentType={type}
            />
         ) : (
            <CreateCategoryButton
               onClick={toggleCreating}
               type={type}
            />
         )}
      </Stack>
   );
}