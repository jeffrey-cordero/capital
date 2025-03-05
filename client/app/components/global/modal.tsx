import {
   Box,
   css,
   Fade,
   Modal as MuiModal,
   styled,
   type SxProps
} from "@mui/material";

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

interface ModalProps {
   open: boolean;
   onClose: () => void;
   children: React.ReactNode;
   sx?: SxProps<any>;
}

export default function Modal({ open, onClose, children, sx }: ModalProps) {
   return (
      <MuiModal
         onClose = { onClose }
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
               </Box>
            </ModalContent>
         </Fade>
      </MuiModal>
   );
}