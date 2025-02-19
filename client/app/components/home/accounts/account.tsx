import { faBank, faPencil, faPlus, faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, Box, Button, Card, CardContent, Fab, FormControl, FormHelperText, InputLabel, OutlinedInput, Stack, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { type Account, accountSchema } from "capital-types/accounts";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import Modal from "@/components/global/modal";

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
      resolver: zodResolver(accountSchema)
   });
   const onSubmit = async (data: any) => {
      console.log(data);
   };

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
               onClick={() => setOpen(true)}
               title="Edit Account"
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
                     ${new Intl.NumberFormat().format(account.balance)}
                  </Typography>
                  <Typography
                     fontStyle="italic"
                     variant="subtitle2"
                  >
                     {new Date(account.history?.[0].last_updated).toLocaleDateString()}
                  </Typography>
               </Stack>
            </CardContent>
         </Card>
         <Modal
            onClose={() => setOpen(false)}
            open={open}
            sx={{ width: { xs: "90%", md: "60%", lg: "30%" }, maxWidth: "90%" }}
         >
            <form onSubmit={handleSubmit(onSubmit)}>
               <Stack sx={{ alignItems: "center", justifyContent: "center" }}>
                  <Typography
                     sx={{ fontWeight: "bold" }}
                     variant="h3"
                  >
                     Edit Account
                  </Typography>
                  <Box
                     alt="Account"
                     component="img"
                     src="/svg/account.svg"
                     sx={{ width: 250, height: "auto", mx: "auto", justifySelf: "center", mt: -5 }}
                  />
               </Stack>
               <Stack
                  direction="column"
                  spacing={2}
                  sx={{ mt: -5 }}
               >
                  <Controller
                     control={control}
                     name="name"
                     render={
                        ({ field }) => (
                           <FormControl error={Boolean(errors.name)}>
                              <InputLabel htmlFor="name">
                                 Name
                              </InputLabel>
                              <OutlinedInput
                                 {...field}
                                 aria-label="Name"
                                 autoFocus={true}
                                 disabled={isSubmitting}
                                 id="name"
                                 label="Name"
                                 type="text"
                                 value={field.value || ""}
                              />
                              {
                                 errors.name && (
                                    <FormHelperText>
                                       {errors.name?.message?.toString()}
                                    </FormHelperText>
                                 )
                              }
                           </FormControl>
                        )
                     }
                  />
                  <Controller
                     control={control}
                     name="balance"
                     render={
                        ({ field }) => (
                           <FormControl error={Boolean(errors.balance)}>
                              <InputLabel htmlFor="balance">
                                 Balance
                              </InputLabel>
                              <OutlinedInput
                                 {...field}
                                 aria-label="Balance"
                                 autoFocus={true}
                                 disabled={isSubmitting}
                                 id="balance"
                                 label="Balance"
                                 type="number"
                                 value={field.value || ""}
                              />
                              {
                                 errors.balance && (
                                    <FormHelperText>
                                       {errors.balance?.message?.toString()}
                                    </FormHelperText>
                                 )
                              }
                           </FormControl>
                        )
                     }
                  />
                  <Button
                     className="btn-primary"
                     color="primary"
                     fullWidth={true}
                     loading={isSubmitting}
                     loadingPosition="start"
                     startIcon={<FontAwesomeIcon icon={faPlus} />}
                     type="submit"
                     variant="contained"
                  >
                     Create
                  </Button>
               </Stack>
            </form>
         </Modal>
      </Grid>
   );
};