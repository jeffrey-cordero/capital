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
 * Props for the Confirmation component
 *
 * @property {string} type - Type of confirmation display ("button" or "icon")
 * @property {string} message - Message to display in the confirmation dialog
 * @property {() => void} onConfirmation - Function called when user confirms the action
 * @property {string} [fontSize] - Icon font size
 * @property {string} [title] - Button title text
 * @property {IconDefinition} [startIcon] - Button start icon
 * @property {string} [color] - MUI Button color variant
 * @property {string} [dataTestId] - Data test ID for the button or icon
 */
interface ConfirmationProps {
   type: "button" | "icon";
   message: string;
   onConfirmation: () => void;
   title?: string;
   startIcon?: IconDefinition;
   color?: "primary" | "secondary" | "error" | "warning" | "info" | "success";
   fontSize?: string;
   dataTestId?: string
}

/**
 * Confirmation dialog component displayed as a button or icon
 *
 * @param {ConfirmationProps} props - Confirmation component props
 * @returns {React.ReactNode} The Confirmation component
 */
export default function Confirmation({ message, onConfirmation, type, fontSize, title, startIcon, color, dataTestId }: ConfirmationProps): React.ReactNode {
   const [open, setOpen] = useState<boolean>(false);
   const { handleSubmit, formState: { isSubmitting } } = useForm();

   // Dialog handlers
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
                  data-testid = { dataTestId }
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
                  data-testid = { dataTestId }
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
                           data-testid = { dataTestId ? `${dataTestId}-cancel` : undefined }
                           onClick = { closeDialog }
                        >
                           No
                        </Button>
                        <Button
                           autoFocus = { true }
                           color = "error"
                           data-testid = { dataTestId ? `${dataTestId}-confirm` : undefined }
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