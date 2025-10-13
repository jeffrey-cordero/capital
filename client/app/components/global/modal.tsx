import {
   Box,
   Button,
   css,
   Dialog,
   DialogActions,
   DialogContent,
   DialogContentText,
   Fade,
   Modal as MuiModal,
   Stack,
   styled,
   type SxProps
} from "@mui/material";
import { useCallback, useState } from "react";

import { gray } from "@/styles/mui/colors";

/**
 * Styled container for modal content
 *
 * @returns {StyledComponent} The ModalContent component
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
 * Props for the Warning component
 *
 * @property {boolean} open - Dialog open state
 * @property {() => void} onClose - Confirm close handler
 * @property {() => void} onCancel - Cancel close handler
 */
interface WarningProps {
   open: boolean;
   onClose: () => void;
   onCancel: () => void;
}

/**
 * Confirmation dialog for unsaved changes within forms
 *
 * @param {WarningProps} props - Warning component props
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
 * Props for the Modal component
 *
 * @property {boolean} open - Modal open state
 * @property {(_force?: boolean) => void} onClose - Close handler
 * @property {React.ReactNode} children - Modal content
 * @property {SxProps<any>} [sx] - Optional styles
 * @property {boolean} [displayWarning] - Whether to show the unsaved changes warning dialog
 */
interface ModalProps {
   open: boolean;
   onClose: (_force?: boolean) => void;
   children: React.ReactNode;
   sx?: SxProps<any>;
   displayWarning?: boolean;
}

/**
 * Customizable modal with optional unsaved changes warning dialog
 *
 * @param {ModalProps} props - Modal component props
 * @returns {React.ReactNode} The Modal component
 */
export default function Modal({ open, onClose, children, sx, displayWarning = false }: ModalProps): React.ReactNode {
   const [isWarningOpen, setIsWarningOpen] = useState<boolean>(false);

   // Modal handlers
   const closeModal = useCallback(() => {
      if (displayWarning) {
         setIsWarningOpen(true);
      } else {
         onClose();
      }
   }, [displayWarning, onClose]);

   const confirmCloseModal = useCallback((force: boolean) => {
      setIsWarningOpen(false);

      if (force) {
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
            timeout = { 250 }
            unmountOnExit = { true }
         >
            <ModalContent sx = { sx }>
               <Box sx = { { position: "relative", overflowY: "auto", maxHeight: "90vh", "&::-webkit-scrollbar": { display: "none" }, msOverflowStyle: "none", scrollbarWidth: "none" } }>
                  { children }
                  <Warning
                     onCancel = { () => confirmCloseModal(false) }
                     onClose = { () => confirmCloseModal(true) }
                     open = { isWarningOpen }
                  />
               </Box>
            </ModalContent>
         </Fade>
      </MuiModal>
   );
}