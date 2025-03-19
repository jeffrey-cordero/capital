import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { faPencil, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Avatar,
   Box,
   Button,
   Card,
   CardContent,
   Fab,
   Stack,
   Tooltip,
   Typography,
   useTheme
} from "@mui/material";
import { type Account, images } from "capital/accounts";
import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import AccountForm from "@/components/dashboard/accounts/form";
import { displayCurrency, displayDate, ellipsis } from "@/lib/display";
import { addNotification } from "@/redux/slices/notifications";

interface AccountCardProps {
   account: Account | undefined;
}

type AccountState = "view" | "create" | "update";

export default function AccountCard({ account }: AccountCardProps) {
   const dispatch = useDispatch();
   const theme = useTheme();
   const [state, setState] = useState<AccountState>("view");
   const [isResourceError, setIsResourceError] = useState<boolean>(false);

   // Configure drag and drop functionality
   const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: account?.account_id || "",
      disabled: state !== "view" // Disable dragging when editing
   });

   const style = {
      transform: CSS.Transform.toString(transform),
      transition
   };

   // Reset image error state when account image changes
   useEffect(() => {
      setIsResourceError(false);
   }, [account?.image]);

   // Modal control handlers
   const openAccountModal = useCallback(() => {
      setState(account?.account_id ? "update" : "create");
   }, [account?.account_id]);

   const closeAccountModal = useCallback(() => {
      setState("view");
   }, []);

   const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
      //  Handles image loading errors and displays notification
      setIsResourceError(true);
      dispatch(addNotification({
         type: "error",
         message: `There was an issue fetching the image for ${account?.name}`
      }));

      e.currentTarget.src = "/svg/logo.svg";
   }, [dispatch, account?.name]);

   const getImageSource = useCallback(() => {
      // Determines the appropriate image source based on account data and error state
      if (!account?.image) {
         return "/svg/logo.svg";
      } else if (images.has(account.image)) {
         return `/images/${account.image}.png`;
      } else if (!isResourceError) {
         return account.image;
      } else {
         return "/svg/logo.svg";
      }
   }, [account?.image, isResourceError]);

   if (!account) {
      // Render empty state for account creation
      return (
         <Box>
            <Button
               className = "btn-primary"
               color = "primary"
               onClick = { openAccountModal }
               startIcon = { <FontAwesomeIcon icon = { faPlus } /> }
               sx = { { p: 2.8 } }
               variant = "contained"
            >
               Add Account
            </Button>
            <AccountForm
               account = { account }
               onClose = { closeAccountModal }
               open = { state === "create" }
            />
         </Box>
      );
   } else {
      // Render account card with details
      return (
         <div
            ref = { setNodeRef }
            style = { style }
         >
            <Card
               elevation = { 9 }
               sx = { { p: 0, position: "relative", textAlign: "left", borderRadius: 2 } }
               variant = { undefined }
            >
               { /* Account image with drag handle */ }
               <Typography
                  className = { isResourceError ? "error" : "primary" }
                  component = "a"
                  onClick = { openAccountModal }
               >
                  <Avatar
                     onError = { handleImageError }
                     src = { getImageSource() }
                     sx = {
                        {
                           height: { xs: 250, sm: 215 },
                           width: "100%",
                           cursor: "grab",
                           background: isResourceError ? theme.palette.error.main : theme.palette.primary.main
                        }
                     }
                     variant = "square"
                     { ...attributes }
                     { ...listeners }
                  />
               </Typography>
               { /* Edit button */ }
               <Tooltip
                  onClick = { openAccountModal }
                  title = "Edit Account"
               >
                  <Fab
                     color = "primary"
                     size = "small"
                     sx = { { bottom: "75px", right: "15px", position: "absolute" } }
                  >
                     <FontAwesomeIcon icon = { faPencil } />
                  </Fab>
               </Tooltip>
               { /* Account details */ }
               <CardContent sx = { { p: 3, pt: 2 } }>
                  <Typography
                     sx = { { ...ellipsis, pr: 4 } }
                     variant = "h6"
                  >
                     { account.name }
                  </Typography>
                  <Stack
                     direction = "column"
                     sx = { { width: "100%", alignItems: "flex-start" } }
                  >
                     <Typography
                        sx = { { ...ellipsis, maxWidth: "95%", pr: 3 } }
                        variant = "subtitle2"
                     >
                        { displayCurrency(account.balance) }
                     </Typography>
                     <Typography variant = "caption">
                        { account.type }
                     </Typography>
                     <Typography variant = "caption">
                        { displayDate(account.history[0]?.last_updated) }
                     </Typography>
                     { /* Account edit form modal */ }
                     <AccountForm
                        account = { account }
                        onClose = { closeAccountModal }
                        open = { state === "update" }
                     />
                  </Stack>
               </CardContent>
            </Card>
         </div>
      );
   }
}