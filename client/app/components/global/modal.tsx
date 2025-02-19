import { Box, Modal as MuiModal, type SxProps } from "@mui/material";
import { css, styled } from "@mui/material";

import { gray } from "@/styles/mui/colors";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


const ModalContent = styled("div")(
   ({ theme }) => css`
     font-family: 'IBM Plex Sans', sans-serif;
     font-weight: 500;
     text-align: start;
     position: relative;
     display: flex;
     top: 50%;
     left: 50%;
     transform: translate(-50%, 50%) !important;
     flex-direction: column;
     gap: 8px;
     overflow: hidden;
     background-color: ${theme.palette.mode === "dark" ? gray[800] : "#fff"};
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

export default function Modal(props: ModalProps) {
   const { open, onClose, children, sx } = props;

   return (
      <MuiModal
         open={open}
         onClose={onClose}
      >
         <ModalContent sx={sx}>
            <Box sx = {{position: "relative"}}>
               <FontAwesomeIcon
                  icon={faXmark}
                  size="xl"
                  onClick={onClose}
                  style={{ position: "absolute", top: -16, right: -12, cursor: "pointer", color: "red" }}
               />
               { children }
            </Box>
         </ModalContent>

      </MuiModal>
   );
}