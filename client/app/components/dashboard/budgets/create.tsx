import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   FormControl,
   FormHelperText,
   InputLabel,
   OutlinedInput,
   Stack,
   Typography
} from "@mui/material";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { displayCurrency } from "@/lib/display";

// Props for the create category component
interface CreateCategoryProps {
   parentType: "Income" | "Expenses";
   onSave: (data: { name: string; goal: number }) => void;
   onCancel: () => void;
}

// Component for creating a new budget category
export function CreateCategory({ parentType, onSave, onCancel }: CreateCategoryProps) {
   // Form state management
   const { control, handleSubmit, formState: { errors } } = useForm({
      defaultValues: {
         name: "",
         goal: 0,
      }
   });

   // State to track submission status
   const [isSubmitting, setIsSubmitting] = useState(false);

   // Handle form submission
   const onSubmit = async (data: { name: string; goal: number }) => {
      setIsSubmitting(true);
      try {
         await onSave(data);
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <Box sx={{ p: 2, border: "1px dashed", borderColor: "divider", borderRadius: 2, mt: 2 }}>
         <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">New {parentType} Category</Typography>
            <FontAwesomeIcon
               icon={faXmark}
               onClick={onCancel}
               style={{ cursor: "pointer" }}
            />
         </Stack>

         <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
               {/* Category Name Input */}
               <Controller
                  control={control}
                  name="name"
                  rules={{ required: "Category name is required" }}
                  render={({ field }) => (
                     <FormControl error={!!errors.name} fullWidth>
                        <InputLabel htmlFor="category-name">Category Name</InputLabel>
                        <OutlinedInput
                           id="category-name"
                           label="Category Name"
                           {...field}
                        />
                        {errors.name && (
                           <FormHelperText>{errors.name.message}</FormHelperText>
                        )}
                     </FormControl>
                  )}
               />

               {/* Goal Amount Input */}
               <Controller
                  control={control}
                  name="goal"
                  rules={{ 
                     required: "Goal amount is required",
                     min: { value: 0, message: "Goal must be a positive number" }
                  }}
                  render={({ field }) => (
                     <FormControl error={!!errors.goal} fullWidth>
                        <InputLabel htmlFor="category-goal">Goal Amount</InputLabel>
                        <OutlinedInput
                           id="category-goal"
                           label="Goal Amount"
                           type="number"
                           startAdornment="$"
                           {...field}
                           onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                        {errors.goal && (
                           <FormHelperText>{errors.goal.message}</FormHelperText>
                        )}
                     </FormControl>
                  )}
               />

               {/* Action Buttons */}
               <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                     color="error"
                     onClick={onCancel}
                     variant="outlined"
                  >
                     Cancel
                  </Button>
                  <Button
                     color="primary"
                     disabled={isSubmitting}
                     type="submit"
                     variant="contained"
                  >
                     Save
                  </Button>
               </Stack>
            </Stack>
         </form>
      </Box>
   );
}

// Button component to trigger category creation
interface CreateCategoryButtonProps {
   onClick: () => void;
   type: "Income" | "Expenses";
}

export function CreateCategoryButton({ onClick, type }: CreateCategoryButtonProps) {
   return (
      <Button
         color="primary"
         onClick={onClick}
         startIcon={<FontAwesomeIcon icon={faPlus} />}
         sx={{ mt: 1 }}
         variant="outlined"
      >
         Add {type} Category
      </Button>
   );
} 