import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { faGripVertical, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Avatar,
   Box,
   Button,
   Card,
   CardContent,
   Fab,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { type Account, images } from "capital/accounts";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";

import AccountForm from "@/components/dashboard/accounts/form";
import { displayCurrency, displayDate, horizontalScroll } from "@/lib/display";
import { addNotification } from "@/redux/slices/notifications";

/**
 * Props for the AccountCard component
 *
 * @property {Account | undefined} account - The account to display, or undefined for new account creation
 */
interface AccountCardProps {
   account: Account | undefined;
}

/**
 * Represents card state: viewing, creating, or updating an account
 */
type AccountState = "view" | "create" | "update";

/**
 * Draggable account card displaying account details with image preview, which handles
 * account creation when account prop is undefined
 *
 * @param {AccountCardProps} props - The props for the AccountCard component
 * @returns {React.ReactNode} Account card component with draggable functionality
 */
export default function AccountCard({ account }: AccountCardProps): React.ReactNode {
   const dispatch = useDispatch(), theme = useTheme();
   const [state, setState] = useState<AccountState>("view");
   const [isImageResourceError, setIsImageResourceError] = useState<boolean>(false);
   const previousImageRef = useRef(account?.image);

   // Modal visibility handlers
   const openAccountModal = useCallback(() => {
      setState(account?.account_id ? "update" : "create");
   }, [account?.account_id]);

   const closeAccountModal = useCallback(() => {
      setState("view");
   }, []);

   // Configure drag and drop functionality
   const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: account?.account_id || "",
      disabled: state !== "view"
   });

   const style = {
      transform: CSS.Transform.toString(transform),
      transition
   };

   useEffect(() => {
      // Reset image error state when account image changes
      if (previousImageRef.current !== account?.image) {
         setIsImageResourceError(false);
         previousImageRef.current = account?.image;
      }
   }, [account?.image]);

   // Handle image loading errors
   const setImageResourceError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
      setIsImageResourceError(true);
      dispatch(addNotification({
         type: "error",
         message: `There was an issue fetching the account image for ${account?.name}`
      }));

      // Switch to fallback error image
      e.currentTarget.src = "/svg/error.svg";
   }, [dispatch, account?.name]);

   // Determine appropriate image source based on account data and error states
   const getImageSource = useCallback(() => {
      if (!account?.image) {
         return "/svg/logo.svg";
      } else if (images.has(account.image)) {
         return `/images/${account.image}.png`;
      } else if (!isImageResourceError) {
         return account.image;
      } else {
         return "/svg/error.svg";
      }
   }, [account?.image, isImageResourceError]);

   if (!account) {
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
      return (
         <div
            ref = { setNodeRef }
            style = { style }
         >
            <Card
               elevation = { 3 }
               sx = { { p: 0, position: "relative", textAlign: "left", borderRadius: 2 } }
               variant = { undefined }
            >
               <Typography
                  className = { isImageResourceError ? "error" : "primary" }
                  component = "a"
                  onClick = { openAccountModal }
               >
                  <Avatar
                     alt = { account.name }
                     id = { account.account_id }
                     onError = { setImageResourceError }
                     src = { getImageSource() }
                     sx = {
                        {
                           height: 200,
                           width: "100%",
                           cursor: "pointer",
                           background: isImageResourceError ? theme.palette.error.main : theme.palette.primary.main
                        }
                     }
                     variant = "square"
                  />
               </Typography>
               <Fab
                  color = "primary"
                  size = "small"
                  sx = { { bottom: "75px", right: "15px", position: "absolute", cursor: "grab", touchAction: "none" } }
                  { ...attributes }
                  { ...listeners }
               >
                  <FontAwesomeIcon icon = { faGripVertical } />
               </Fab>
               <CardContent sx = { { p: 3, pt: 2 } }>
                  <Stack
                     direction = "column"
                     sx = { { width: "100%", alignItems: "flex-start" } }
                  >
                     <Typography
                        sx = { { ...horizontalScroll(theme), maxWidth: "calc(100% - 2.5rem)" } }
                        variant = "h6"
                     >
                        { account.name }
                     </Typography>
                     <Typography
                        sx = { { ...horizontalScroll(theme), maxWidth: "calc(100% - 2.5rem)" } }
                        variant = "subtitle2"
                     >
                        { displayCurrency(account.balance) }
                     </Typography>
                     <Typography variant = "caption">
                        { account.type }
                     </Typography>
                     <Typography
                        sx = { { ...horizontalScroll(theme), maxWidth: "100%" } }
                        variant = "caption"
                     >
                        Updated { displayDate(account.last_updated) }
                     </Typography>
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