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
     max-height: 90%;
     overflow-x: hidden;
     overflow-y: scroll;
     background-color: ${theme.palette.mode === "dark" ? "#2B2B2B" : "#ffffff"};
     border-radius: 8px;
     border: 1px solid ${theme.palette.mode === "dark" ? gray[700] : gray[200]};
     box-shadow: 0 4px 12px
      ${theme.palette.mode === "dark" ? "rgb(0 0 0 / 0.5)" : "rgb(0 0 0 / 0.2)"};
     padding: 24px;
     color: ${theme.palette.mode === "dark" ? gray[50] : gray[900]};
 
     & .modal-title {
       margin: 0;
       line-height: 1.5rem;
       margin-bottom: 8px;
     }
 
     & .modal-description {
       margin: 0;
       line-height: 1.5rem;
       font-weight: 400;
       color: ${theme.palette.mode === "dark" ? gray[400] : gray[800]};
       margin-bottom: 4px;
     }
   `
);

interface WarningProps {
   open: boolean;
   onClose: () => void;
   onCancel: () => void;
}

function Warning({ open, onClose, onCancel }: WarningProps) {
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

export function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
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

interface ModalProps {
   open: boolean;
   onClose: () => void;
   children: React.ReactNode;
   sx?: SxProps<any>;
   displayWarning?: boolean;
}

export function Modal({ open, onClose, children, sx, displayWarning }: ModalProps) {
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
         onClose();
      }
   }, [onClose]);

   return (
      <MuiModal
         onClose = { closeModal }
         open = { open }
         slotProps = {
            {
               backdrop: {
                  timeout: 350
               }
            }
         }
      >
         <Fade
            in = { open }
            mountOnEnter = { true }
            timeout = { 350 }
            unmountOnExit = { true }
         >
            <ModalContent sx = { sx }>
               <Box sx = { { position: "relative" } }>
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