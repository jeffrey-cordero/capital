import {
   Box,
   Button,
   Chip,
   css,
   Dialog,
   DialogActions,
   DialogContent,
   DialogContentText,
   Divider,
   Fade,
   Modal as MuiModal,
   Stack,
   styled,
   type SxProps
} from "@mui/material";
import { useCallback, useState } from "react";

import { gray } from "@/styles/mui/colors";

/**
 * The global ModalContent component to wrap the modal children components.
 *
 * @returns {React.ReactNode} The ModalContent component
 */
const ModalContent = styled("div")(
   ({ theme }) => css`
     font-family: 'IBM Plex Sans', sans-serif;
     font-weight: 500;
     text-align: start;
     position: fixed;
     display: flex;
     top: 50%;
     left: 50%;
     transform: translate(-50%, -50%);
     flex-direction: column;
     gap: 8px;
     overflow: none;
     background-color: ${theme.palette.mode === "dark" ? "#2B2B2B" : "#ffffff"};
     border-radius: 8px;
     border: 1px solid ${theme.palette.mode === "dark" ? gray[700] : gray[200]};
     box-shadow: 0 4px 12px
      ${theme.palette.mode === "dark" ? "rgb(0 0 0 / 0.5)" : "rgb(0 0 0 / 0.2)"};
     padding: 24px;
     color: ${theme.palette.mode === "dark" ? gray[50] : gray[900]};
   `
);

/**
 * The props for the Warning component.
 *
 * @interface WarningProps
 * @property {boolean} open - Whether the warning is open
 * @property {() => void} onClose - The function to call when the warning is closed
 * @property {() => void} onCancel - The function to call when the warning is cancelled
 */
interface WarningProps {
   open: boolean;
   onClose: () => void;
   onCancel: () => void;
}

/**
 * The Warning component to confirm the user's action before closing the modal for potential data loss.
 *
 * @param {WarningProps} props - The props for the Warning component
 * @returns {React.ReactNode} The Warning component
 */
function Warning({ open, onClose, onCancel }: WarningProps): React.ReactNode {
   return (
      <Dialog
         onClose = { onCancel }
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
                  Are you sure you want to exit? Any unsaved changes will be lost.
               </DialogContentText>
            </DialogContent>
            <DialogActions>
               <Stack
                  direction = "row"
                  spacing = { 1 }
               >
                  <Button
                     onClick = { onCancel }
                  >
                     No
                  </Button>
                  <Button
                     autoFocus = { true }
                     onClick = { onClose }
                     type = "submit"
                  >
                     Yes
                  </Button>
               </Stack>
            </DialogActions>
         </Box>
      </Dialog>
   );
}

/**
 * The props for the Modal component.
 *
 * @interface ModalProps
 * @property {boolean} open - Whether the modal is open
 * @property {() => void} onClose - The function to call when the modal is closed with a potential force-close
 * @property {React.ReactNode} children - The children components to render within the modal
 * @property {SxProps<any>} sx - The style props for the modal
 * @property {boolean} displayWarning - Whether to display the warning component
 */
interface ModalProps {
   open: boolean;
   onClose: (_force?: boolean) => void;
   children: React.ReactNode;
   sx?: SxProps<any>;
   displayWarning?: boolean;
}

/**
 * The props for the ModalSection component.
 *
 * @interface ModalSectionProps
 * @property {string} title - The title of the modal section
 * @property {React.ReactNode} children - The children components to render within the modal section
 */
interface ModalSectionProps {
   title: string;
   children: React.ReactNode;
}

/**
 * The ModalSection component to render the modal section title and children components.
 *
 * @param {ModalSectionProps} props - The props for the ModalSection component
 * @returns {React.ReactNode} The ModalSection component
 */
export function ModalSection({ title, children }: ModalSectionProps): React.ReactNode {
   return (
      <Box>
         <Divider>
            <Chip
               color = "success"
               label = { title }
            />
         </Divider>
         { children }
      </Box>
   );
}

/**
 * The Modal component to render the modal with the modal content and children components.
 *
 * @param {ModalProps} props - The props for the Modal component
 * @returns {React.ReactNode} The Modal component
 */
export function Modal({ open, onClose, children, sx, displayWarning = false }: ModalProps): React.ReactNode {
   const [warningOpen, setWarningOpen] = useState<boolean>(false);

   const closeModal = useCallback(() => {
      if (displayWarning) {
         setWarningOpen(true);
      } else {
         onClose();
      }
   }, [displayWarning, onClose]);

   const confirmCloseModal = useCallback((confirmed: boolean) => {
      setWarningOpen(false);

      if (confirmed) {
         // Force-close the modal, regardless of dirty fields checkpoints
         onClose(true);
      }
   }, [onClose]);

   return (
      <MuiModal
         onClose = { closeModal }
         open = { open }
      >
         <Fade
            in = { open }
            mountOnEnter = { true }
            timeout = { 350 }
            unmountOnExit = { true }
         >
            <ModalContent sx = { sx }>
               <Box sx = { { position: "relative", overflowY: "auto", maxHeight: "90vh", "&::-webkit-scrollbar": { display: "none" }, msOverflowStyle: "none", scrollbarWidth: "none" } }>
                  { children }
                  <Warning
                     onCancel = { () => confirmCloseModal(false) }
                     onClose = { () => confirmCloseModal(true) }
                     open = { warningOpen }
                  />
               </Box>
            </ModalContent>
         </Fade>
      </MuiModal>
   );
}