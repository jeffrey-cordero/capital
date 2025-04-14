import { type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Collapse, Stack } from "@mui/material";

/**
 * Props for the SubmitButton component
 *
 * @interface SubmitButtonProps
 * @property {boolean} visible - Whether the button should be visible
 * @property {"Create" | "Update"} type - The type of the button
 * @property {boolean} isSubmitting - Whether the form is being submitted
 * @property {IconDefinition} icon - The icon to display on the button
 * @property {() => void} onCancel - The function to call when the form action is cancelled
 * @property {() => void} onSubmit - The function to call when the form action is submitted
 */
interface SubmitButtonProps {
   visible: boolean;
   type: "Create" | "Update";
   isSubmitting: boolean;
   icon: IconDefinition;
   onCancel: () => void;
   onSubmit?: () => void;
}

/**
 * The SubmitButton component to handle conditional rendering of the submit/cancel buttons
 * for the various forms across the application.
 *
 * @param {SubmitButtonProps} props - The props for the SubmitButton component
 * @returns {React.ReactNode} The SubmitButton component
 */
export default function SubmitButton(props: SubmitButtonProps): React.ReactNode {
   const { visible, type, isSubmitting, icon, onCancel, onSubmit } = props;

   return (
      <Collapse
         in = { visible }
         mountOnEnter = { true }
         style = { { transformOrigin: "center top" } }
         sx = { { zIndex: 1000 } }
         timeout = { 350 }
         unmountOnExit = { true }
      >
         <Stack
            direction = "row"
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
               fullWidth = { true }
               loading = { isSubmitting }
               onClick = { onSubmit || undefined }
               startIcon = { <FontAwesomeIcon icon = { icon } /> }
               type = { onSubmit ? "button" : "submit" }
               variant = "contained"
            >
               { type }
            </Button>
         </Stack>
      </Collapse>
   );
}