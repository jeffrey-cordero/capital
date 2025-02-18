import { faPencil } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Card, CardContent, css, Fab, Grow, Modal, Stack, styled, Tooltip, Typography, Zoom } from "@mui/material";
import { gray } from "@/styles/mui/colors";
import Grid from "@mui/material/Grid2";
import type { Account } from "capital-types/accounts";
import { useState } from "react";

interface AccountCardProps {
   account: Account;
}

const ModalContent = styled('div')(
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
     background-color: ${theme.palette.mode === 'dark' ? gray[900] : '#fff'};
     border-radius: 8px;
     border: 1px solid ${theme.palette.mode === 'dark' ? gray[700] : gray[200]};
     box-shadow: 0 4px 12px
       ${theme.palette.mode === 'dark' ? 'rgb(0 0 0 / 0.5)' : 'rgb(0 0 0 / 0.2)'};
     padding: 24px;
     color: ${theme.palette.mode === 'dark' ? gray[50] : gray[900]};
 
     & .modal-title {
       margin: 0;
       line-height: 1.5rem;
       margin-bottom: 8px;
     }
 
     & .modal-description {
       margin: 0;
       line-height: 1.5rem;
       font-weight: 400;
       color: ${theme.palette.mode === 'dark' ? gray[400] : gray[800]};
       margin-bottom: 4px;
     }
   `,
);

export default function AccountCard(props: AccountCardProps) {
   const { account } = props;
   const [open, setOpen] = useState<boolean>(false);

   return (
      <Grid
         size={{ xs: 12, md: 4, lg: 3 }}
      >
         <Card
            elevation={9}
            sx={{ p: 0, position: "relative", textAlign: "left", borderRadius: 2 }}
            variant={undefined}
         >
            <Typography
               component="a"
               href="/"
            >
               <Avatar
                  src={account.image}
                  sx={
                     {
                        height: 250,
                        width: "100%"
                     }
                  }
                  variant="square"
               />
            </Typography>
            <Tooltip 
               title="Edit Account"
               onClick={() => setOpen(true)}
            >
               <Fab
                  color="primary"
                  size="small"
                  sx={{ bottom: "75px", right: "15px", position: "absolute" }}
               >
                  <FontAwesomeIcon
                     icon={faPencil}
                  />
               </Fab>
            </Tooltip>
            <CardContent sx={{ p: 3, pt: 2 }}>
               <Typography variant="h5">
                  {account.name}
               </Typography>
               <Stack
                  direction="column"
                  sx={{ width: "100%", alignItems: "flex-start" }}
               >
                  <Typography
                     sx={{ maxWidth: "95%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                     variant="h6"
                  >
                     ${new Intl.NumberFormat().format(Number(account.history?.[0].amount ?? 0))}
                  </Typography>
                  <Typography
                     fontStyle="italic"
                     variant="subtitle2"
                  >
                     {new Date(account.lastUpdated).toDateString()}
                  </Typography>
               </Stack>
            </CardContent>
         </Card>
         <Modal
            open={open}
            onClose={() => setOpen(false)}
         >
            <Zoom in={open} style={{ transitionDelay: open ? '50ms' : '0ms' }}>
               <ModalContent sx={{ width: 400 }}>
                  <h1>Hello</h1>
               </ModalContent>
            </Zoom>
         </Modal>
      </Grid>
   );
};