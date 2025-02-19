import Modal from "@/components/global/modal";
import { faPencil } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, Card, CardContent, Fab, Stack, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { Account } from "capital-types/accounts";
import { userSchema } from "capital-types/user";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface AccountCardProps {
   account: Account;
}

export default function AccountCard(props: AccountCardProps) {
   const { account } = props;
   const {
      control,
      handleSubmit,
      setError,
      formState: { isSubmitting, errors }
   } = useForm({
      resolver: zodResolver(userSchema)
   });
   const [open, setOpen] = useState<boolean>(false);

   return (
      <Grid
         size = { { xs: 12, md: 4, lg: 3 } }
      >
         <Card
            elevation = { 9 }
            sx = { { p: 0, position: "relative", textAlign: "left", borderRadius: 2 } }
            variant = { undefined }
         >
            <Typography
               component = "a"
               href = "/"
            >
               <Avatar
                  src = { account.image }
                  sx = {
                     {
                        height: 250,
                        width: "100%"
                     }
                  }
                  variant = "square"
               />
            </Typography>
            <Tooltip
               onClick = { () => setOpen(true) }
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
               <Typography variant = "h5">
                  { account.name }
               </Typography>
               <Stack
                  direction = "column"
                  sx = { { width: "100%", alignItems: "flex-start" } }
               >
                  <Typography
                     sx = { { maxWidth: "95%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }
                     variant = "h6"
                  >
                     ${ new Intl.NumberFormat().format(Number(account.history?.[0].amount ?? 0)) }
                  </Typography>
                  <Typography
                     fontStyle = "italic"
                     variant = "subtitle2"
                  >
                     { new Date(account.history?.[0].last_updated).toLocaleDateString() }
                  </Typography>
               </Stack>
            </CardContent>
         </Card>
         <Modal 
            open = { open } 
            onClose = { () => setOpen(false) }
            sx = {{ width: {xs: "90%", md: "60%", lg: "30%"}, maxWidth: "90%" }}
         >
            <Typography className = "modal-title" variant = "h4">
               Edit Account
            </Typography>
         </Modal>
      </Grid>
   );
};