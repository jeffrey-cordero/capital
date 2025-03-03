import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { type Account } from "capital-types/accounts";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { removeAccount } from "@/redux/slices/accounts";

export default function AccountDeletion({ account, disabled }: { account: Account, disabled: boolean }) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const [open, setOpen] = useState<boolean>(false);

   const { handleSubmit, formState: { isSubmitting } } = useForm();

   const onSubmit = async() => {
      try {
         const result = await sendApiRequest(
            `dashboard/accounts/${account?.account_id}`, "DELETE", undefined, dispatch, navigate
         );

         if (result === 204) {
            dispatch(removeAccount(account?.account_id ?? ""));
         }
      } catch (error) {
         console.error(error);
      }
   };

   return (
      <Box>
         <Button
            className = "btn-primary"
            color = "error"
            disabled = { isSubmitting || disabled }
            fullWidth = { true }
            loading = { isSubmitting }
            onClick = { () => setOpen(true) }
            startIcon = { <FontAwesomeIcon icon = { faTrashCan } /> }
            type = "button"
            variant = "contained"
         >
            Delete
         </Button>
         <Dialog
            aria-describedby = "alert-dialog-description"
            aria-labelledby = "alert-dialog-title"
            onClose = { () => setOpen(false) }
            open = { open }
            sx = {{ 
               width: { xs: "80%", md: "60%", lg: "50%" }, 
               maxWidth: "80%", 
               mx: "auto"
            }}
         >
            <DialogTitle id = "alert-dialog-title">
               Delete Account?
            </DialogTitle>
            <DialogContent>
               <DialogContentText id = "alert-dialog-description">
                  Are you sure you want to delete your account? This action will permanently erase all your account history.
                  However, any transactions linked to your account will be detached, but not deleted.
                  Once deleted, this action cannot be undone.
               </DialogContentText>
            </DialogContent>
            <DialogActions>
               <form onSubmit={handleSubmit(onSubmit)}>
                  <Button onClick = { () => setOpen(false) } disabled = { isSubmitting || disabled }>
                     No
                  </Button>
                  <Button
                     autoFocus = { true }
                     disabled = { isSubmitting || disabled }
                     loading={isSubmitting}
                     type="submit"
                  >
                     Yes
                  </Button>
               </form>
            </DialogActions>
         </Dialog>
      </Box>
   );
}