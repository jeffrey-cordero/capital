
import { Avatar, Card, CardContent, Fab, Stack, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { Account } from "capital-types/accounts";
import { useState } from "react";

interface AccountCardProps {
   account: Account;
}

export default function AccountCard(props: AccountCardProps) {
   const { account } = props;
   const [open, setOpen] = useState<boolean>(false);

   return (
      <Grid
         container = { true }
         spacing = { 3 }
      >
         {
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
                  <Tooltip title = "Edit Account">
                     <Fab
                        color = "primary"
                        size = "small"
                        sx = { { bottom: "75px", right: "15px", position: "absolute" } }
                     >
                     </Fab>
                  </Tooltip>
                  <CardContent sx = { { p: 3, pt: 2 } }>
                     <Typography variant = "h5">
                        { account.name }
                     </Typography>
                     <Stack
                        direction = "column"
                        sx = { { width:"100%", alignItems: "flex-start" } }
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
                           { new Date(account.lastUpdated).toDateString() }
                        </Typography>
                     </Stack>
                  </CardContent>
               </Card>
            </Grid>

         }
      </Grid>
   );
};