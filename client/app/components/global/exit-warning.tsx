import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack } from "@mui/material";

interface ExitWarningProps {
   open: boolean;
   onClose: () => void;
   onCancel: () => void;
}

export default function ExitWarning({ open, onClose, onCancel }: ExitWarningProps) {
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