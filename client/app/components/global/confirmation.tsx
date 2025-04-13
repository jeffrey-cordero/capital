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

/**
 * The props for the Confirmation component.
 *
 * @interface ConfirmationProps
 * @property {string} type - The type of confirmation to display
 * @property {string} message - The message to display within the confirmation dialog
 * @property {() => void} onConfirmation - The function to call when the user confirms the action
 * @property {string} [fontSize] - The font size of the icon
 * @property {string} [title] - The title of the deletion button
 */
interface ConfirmationProps {
   type: "button" | "icon";
   message: string;
   onConfirmation: () => void;
   fontSize?: string;
   title?: string;
}

/**
 * The Confirmation component across the application.
 *
 * @param {ConfirmationProps} props - The props for the Confirmation component
 * @returns {React.ReactNode} The Confirmation component
 */
export default function Confirmation({ message, onConfirmation, type, fontSize, title }: ConfirmationProps): React.ReactNode {
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
         {
            type === "button" ? (
               <Button
                  className = "btn-primary"
                  color = "error"
                  fullWidth = { true }
                  loading = { isSubmitting }
                  onClick = { openDialog }
                  startIcon = { <FontAwesomeIcon icon = { faTrashCan } /> }
                  type = "button"
                  variant = "contained"
               >
                  { title || "Delete" }
               </Button>
            ) : (
               <FontAwesomeIcon
                  className = "primary"
                  icon = { faTrashCan }
                  onClick = { openDialog }
                  style = { { cursor: "pointer", color: "red", fontSize: fontSize || "1.1rem" } }
               />
            )
         }
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
                        onClick = { closeDialog }
                     >
                        No
                     </Button>
                     <Button
                        autoFocus = { true }
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