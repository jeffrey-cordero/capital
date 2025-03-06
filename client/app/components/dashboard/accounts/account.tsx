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
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import AccountForm from "@/components/dashboard/accounts/form";
import { displayCurrency, displayDate, ellipsis } from "@/lib/display";
import { addNotification } from "@/redux/slices/notifications";

export default function AccountCard({ account }: { account: Account | undefined }) {
   const dispatch = useDispatch(), theme = useTheme();
   const [state, setState] = useState<"view" | "create" | "update">("view");
   const [isResourceError, setIsResourceError] = useState<boolean>(false);

   // Drag and drop identifier measures
   const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: account?.account_id || "",
      disabled: state !== "view"
   });

   const style = {
      transform: CSS.Transform.toString(transform),
      transition
   };

   useEffect(() => {
      setIsResourceError(false);
   }, [account?.image]);

   return (
      account ? (
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
                  href = "#"
                  onClick = { () => setState("update") }
               >
                  <Avatar
                     onError = {
                        (e) => {
                           setIsResourceError(true);
                           dispatch(addNotification({
                              type: "Error",
                              message: `There was an issue fetching the image for ${account.name}`
                           }));
                           (e.target as HTMLImageElement).src = "";
                        }
                     }
                     src = {
                        images.has(account.image) ? `/images/${account.image}.png`
                           : !isResourceError && account.image
                              ? account.image : "/images/empty.png"
                     }
                     sx = {
                        {
                           height: 225,
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
               <Tooltip
                  onClick = { () => setState("update") }
                  title = "Edit Account"
               >
                  <Fab
                     color = "primary"
                     size = "small"
                     sx = { { bottom: "75px", right: "15px", position: "absolute" } }
                  >
                     <FontAwesomeIcon
                        icon = { faPencil }
                     />
                  </Fab>
               </Tooltip>
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
                     <Typography
                        variant = "caption"
                     >
                        { displayDate(account.history[0].last_updated) }
                     </Typography>
                     <AccountForm
                        account = { account }
                        onClose = { () => setState("view") }
                        open = { state === "update" }
                     />
                  </Stack>
               </CardContent>
            </Card>
         </div>
      ) : (
         <Box>
            <Button
               className = "btn-primary"
               color = "primary"
               onClick = { () => setState("create") }
               startIcon = { <FontAwesomeIcon icon = { faPlus } /> }
               sx = { { p: 3 } }
               variant = "contained"
            >
               Add Account
            </Button>
            <AccountForm
               account = { account }
               onClose = { () => setState("view") }
               open = { state === "create" }
            />
         </Box>
      )
   );
};