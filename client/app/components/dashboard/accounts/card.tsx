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
   Tooltip,
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
 * The props for the AccountCard component
 *
 * @interface AccountCardProps
 * @property {Account | undefined} account - The account to display, where undefined implies new account creation
 */
interface AccountCardProps {
   account: Account | undefined;
}

/**
 * The state of the account card (viewing, creating, updating)
 *
 * @type AccountState
 */
type AccountState = "view" | "create" | "update";

/**
 * The AccountCard component to display the account card in the dashboard
 *
 * @param {AccountCardProps} props - The props for the AccountCard component
 * @returns {React.ReactNode} The AccountCard component
 */
export default function AccountCard({ account }: AccountCardProps): React.ReactNode {
   const dispatch = useDispatch(), theme = useTheme();
   const [state, setState] = useState<AccountState>("view");
   const [isResourceError, setIsResourceError] = useState<boolean>(false);
   const previousImageRef = useRef(account?.image);

   const openAccountModal = useCallback(() => {
      setState(account?.account_id ? "update" : "create");
   }, [account?.account_id]);

   const closeAccountModal = useCallback(() => {
      setState("view");
   }, []);

   // Configure drag and drop attributes
   const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: account?.account_id || "",
      disabled: state !== "view"
   });

   const style = {
      transform: CSS.Transform.toString(transform),
      transition
   };

   useEffect(() => {
      if (previousImageRef.current !== account?.image) {
         // Retry image fetch for new account images
         setIsResourceError(false);
         previousImageRef.current = account?.image;
      }
   }, [account?.image]);

   const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
      setIsResourceError(true);
      dispatch(addNotification({
         type: "error",
         message: `There was an issue fetching the image for ${account?.name}`
      }));

      e.currentTarget.src = "/svg/error.svg";
   }, [dispatch, account?.name]);

   const getImageSource = useCallback(() => {
      if (!account?.image) {
         return "/svg/logo.svg";
      } else if (images.has(account.image)) {
         return `/images/${account.image}.png`;
      } else if (!isResourceError) {
         return account.image;
      } else {
         return "/svg/error.svg";
      }
   }, [account?.image, isResourceError]);

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
               elevation = { 9 }

               sx = { { p: 0, position: "relative", textAlign: "left", borderRadius: 2 } }
               variant = { undefined }
            >
               <Typography
                  className = { isResourceError ? "error" : "primary" }
                  component = "a"
                  onClick = { openAccountModal }
               >
                  <Avatar
                     id = { account.account_id }
                     onError = { handleImageError }
                     src = { getImageSource() }
                     sx = {
                        {
                           height: { xs: 215, sm: 200 },
                           width: "100%",
                           cursor: "pointer",
                           background: isResourceError ? theme.palette.error.main : theme.palette.primary.main
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
                     <Tooltip
                        placement = "top"
                        title = "Last updated"
                     >
                        <Typography variant = "caption">
                           { displayDate(account.last_updated) }
                        </Typography>
                     </Tooltip>
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