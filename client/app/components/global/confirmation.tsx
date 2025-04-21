import { faTrashCan, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   Dialog,
   DialogActions,
   DialogContent,
   DialogContentText,
   Stack
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
 * @property {IconDefinition} [startIcon] - The icon to display for the button
 * @property {string} [color] - The color of the button
 */
interface ConfirmationProps {
   type: "button" | "icon";
   message: string;
   onConfirmation: () => void;
   startIcon?: IconDefinition;
   color?: "primary" | "secondary" | "error" | "warning" | "info" | "success";
   fontSize?: string;
   title?: string;
}

/**
 * The Confirmation component across the application.
 *
 * @param {ConfirmationProps} props - The props for the Confirmation component
 * @returns {React.ReactNode} The Confirmation component
 */
export default function Confirmation({ message, onConfirmation, type, fontSize, title, startIcon, color }: ConfirmationProps): React.ReactNode {
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
                  color = { color || "error" }
                  fullWidth = { true }
                  loading = { isSubmitting }
                  onClick = { openDialog }
                  startIcon = { <FontAwesomeIcon icon = { startIcon || faTrashCan } /> }
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
                  width: { xs: "95%", md: "65%", lg: "60%" },
                  mx: "auto",
                  textAlign: { xs: "center", md: "left" }
               }
            }
         >
            <Box sx = { { py: 1, px: 0.5 } }>
               <DialogContent sx = { { pb: 0 } }>
                  <DialogContentText>
                     { message }
                  </DialogContentText>
               </DialogContent>
               <DialogActions sx = { { justifyContent: { xs: "center", md: "flex-end" }, pt: 0.5 } }>
                  <form onSubmit = { handleSubmit(onConfirmation) }>
                     <Stack
                        direction = "row"
                     >
                        <Button
                           onClick = { closeDialog }
                        >
                           No
                        </Button>
                        <Button
                           autoFocus = { true }
                           color = "error"
                           loading = { isSubmitting }
                           type = "submit"
                        >
                           Yes
                        </Button>
                     </Stack>
                  </form>
               </DialogActions>
            </Box>
         </Dialog>
      </Box>
   );
}