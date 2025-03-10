import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   Dialog,
   DialogActions,
   DialogContent,
   DialogContentText
} from "@mui/material";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";

interface ConfirmationProps {
   message: string;
   disabled: boolean;
   onConfirmation: () => void;
}
export default function Confirmation({ message, disabled, onConfirmation }: ConfirmationProps) {
   const [open, setOpen] = useState<boolean>(false);
   const { handleSubmit, formState: { isSubmitting } } = useForm();

   const openDialog = useCallback(() => {
      setOpen(true);
   }, []);

   const closeDialog = useCallback(() => {
      setOpen(false);
   }, []);

   return (
      <Box>
         <Button
            className = "btn-primary"
            color = "error"
            disabled = { disabled || isSubmitting }
            fullWidth = { true }
            loading = { isSubmitting }
            onClick = { openDialog }
            startIcon = { <FontAwesomeIcon icon = { faTrashCan } /> }
            type = "button"
            variant = "contained"
         >
            Delete
         </Button>
         <Dialog
            onClose = { closeDialog }
            open = { open }
            sx = {
               {
                  width: { xs: "85%", md: "65%", lg: "60%" },
                  maxWidth: "85%",
                  mx: "auto"
               }
            }
         >
            <Box sx = { { p: 1 } }>
               <DialogContent sx = { { pb: 0 } }>
                  <DialogContentText>
                     { message }
                  </DialogContentText>
               </DialogContent>
               <DialogActions>
                  <form onSubmit = { handleSubmit(onConfirmation) }>
                     <Button
                        disabled = { disabled || isSubmitting }
                        onClick = { closeDialog }
                     >
                        No
                     </Button>
                     <Button
                        autoFocus = { true }
                        disabled = { disabled || isSubmitting }
                        loading = { isSubmitting }
                        type = "submit"
                     >
                        Yes
                     </Button>
                  </form>
               </DialogActions>
            </Box>
         </Dialog>
      </Box>
   );
}