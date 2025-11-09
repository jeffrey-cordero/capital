import { faClockRotateLeft, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Collapse, Stack, useMediaQuery } from "@mui/material";

/**
 * Props for the SubmitButton component
 *
 * @property {boolean} visible - Controls component visibility
 * @property {"Create" | "Update"} type - Button action type
 * @property {boolean} isSubmitting - Form submission state
 * @property {() => void} onCancel - Cancel action handler
 * @property {() => void} [onSubmit] - Optional submission handler
 * @property {boolean} [unmountOnExit] - Whether to unmount on exit for rendering purposes
 */
interface SubmitButtonProps {
   visible: boolean;
   type: "Create" | "Update";
   isSubmitting: boolean;
   onCancel: () => void;
   onSubmit?: () => void;
   unmountOnExit?: boolean;
}

/**
 * Collapsible form submit/cancel button group
 *
 * @param {SubmitButtonProps} props - Submit button component props
 * @returns {React.ReactNode} The SubmitButton component
 */
export default function SubmitButton({ visible, type, isSubmitting, onCancel, onSubmit, unmountOnExit = true }: SubmitButtonProps): React.ReactNode {
   const xs = useMediaQuery("(max-width: 320px)");

   return (
      <Collapse
         in = { visible }
         mountOnEnter = { true }
         style = { { transformOrigin: "center top" } }
         sx = { { zIndex: 1000, width: "100%" } }
         timeout = { 350 }
         unmountOnExit = { unmountOnExit }
      >
         <Stack
            direction = { xs ? "column" : "row" }
            spacing = { 1 }
            sx = { { width: "100%" } }
         >
            <Button
               className = "btn-secondary"
               color = "secondary"
               disabled = { isSubmitting }
               fullWidth = { true }
               onClick = { onCancel }
               startIcon = { <FontAwesomeIcon icon = { faClockRotateLeft } /> }
               type = "button"
               variant = "contained"
            >
               Cancel
            </Button>
            <Button
               className = "btn-primary"
               color = "primary"
               data-testid = "submit-button"
               fullWidth = { true }
               loading = { isSubmitting }
               onClick = { onSubmit || undefined }
               startIcon = { <FontAwesomeIcon icon = { faPenToSquare } /> }
               type = { onSubmit ? "button" : "submit" }
               variant = "contained"
            >
               { type }
            </Button>
         </Stack>
      </Collapse>
   );
}