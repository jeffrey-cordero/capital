import { faImages, faPencil, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, Box, Button, Card, CardContent, Fab, FormControl, FormHelperText, InputLabel, MenuItem, OutlinedInput, Select, Stack, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { type Account, accountSchema, images, types } from "capital-types/accounts";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Modal from "@/components/global/modal";
import { sendApiRequest } from "@/lib/api";

interface ImageSelectModalProps {
   open: boolean;
   onClose: () => void;
   selectImage: (_image: string) => void;
   selectedImage?: string;
}

function ImageSelectModal({ open, onClose, selectImage, selectedImage }: ImageSelectModalProps) {
   const [selected, setSelected] = useState<string>(selectedImage || "");

   const handleSaveImage = () => {
      selectImage(selected);
      onClose();
   };

   return (
      <Modal
         onClose={onClose}
         open={open}
         sx={{ width: "80%", maxWidth: "90%", p: 4 }}
      >
         <Stack spacing={3}>
            <Stack
               direction="row"
               spacing={4}
               sx={{ flexWrap: "wrap", justifyContent: "center", alignItems: "center", alignContent: "center" }}
            >
               {
                  images.map((image) => (
                     <Avatar
                        key={`account-image-${image}`}
                        onClick={() => setSelected(image)}
                        src={`/images/${image}.png`}
                        sx={
                           {
                              width: 225,
                              height: 225,
                              cursor: "pointer",
                              border: selected === image ? "2px solid" : "none",
                              borderColor: "primary.main"
                           }
                        }
                        variant="square"
                     />
                  ))
               }
            </Stack>
            <FormControl>
               <InputLabel htmlFor="custom-image">Custom Image URL</InputLabel>
               <OutlinedInput
                  id="custom-image"
                  label="Custom Image URL"
                  onChange={(e) => setSelected(e.target.value)}
                  value={selected}
               />
            </FormControl>
            <Button
               color="primary"
               onClick={handleSaveImage}
               startIcon={<FontAwesomeIcon icon={faImages} />}
               variant="contained"
            >
               Save Selection
            </Button>
         </Stack>
      </Modal>
   );
}

interface AccountModalProps {
   account: Account | undefined;
   open: boolean;
   onClose: () => void;
}

function AccountModal({ account, open, onClose }: AccountModalProps) {
   const dispatch = useDispatch();
   const navigate = useNavigate();
   const [imageOpen, setImageOpen] = useState<boolean>(false);
   const [selectedImage, setSelectedImage] = useState<string>(account?.image || "");
   const isUpdate = account !== undefined;

   const {
      control,
      handleSubmit,
      setError,
      formState: { isSubmitting, errors, dirtyFields }
   } = useForm({
      resolver: zodResolver(accountSchema),
      defaultValues: account || {}
   });

   const handleImageSelect = (image: string) => {
      setSelectedImage(image);
   };

   const onSubmit = async (data: any) => {
      try {
         // Determine if this is an update or create operation
         if (isUpdate) {
            // Send dirty fields for updates to minimize data sent
            const updatedFields = Object.keys(dirtyFields).reduce((acc: any, key) => {
               acc[key] = data[key];
               return acc;
            }, {});

            // Add image if it changed as it relies on local state
            if (selectedImage !== account.image) {
               updatedFields.image = selectedImage;
            }

            // Only send request if there are changes
            if (Object.keys(updatedFields).length > 0) {
               updatedFields.account_id = account.account_id;

               // Send API request
               const response = sendApiRequest("accounts/update", "POST", updatedFields, dispatch, navigate);

               console.log(response);

               // Close modal on success
               onClose();
            }
         } else {
            const creation = {
               ...data,
               image: selectedImage || "/images/default.png"
            };

            // Send API request
            const response = await sendApiRequest("accounts", "POST", creation, dispatch, navigate);

            console.log(response);

            // Close modal on success
            onClose();
         }
      } catch (error) {
         console.error("Error:", error);
         setError("root", {
            type: "manual",
            message: isUpdate ? "Failed to update account" : "Failed to create account"
         });
      }
   };

   return (
      <Modal
         onClose={onClose}
         open={open}
         sx={{ position: "relative", width: { xs: "90%", md: "60%", lg: "40%" }, maxWidth: "90%" }}
      >
         <form onSubmit={handleSubmit(onSubmit)}>
            <Stack sx={{ alignItems: "center", justifyContent: "center" }}>
               <Box
                  alt="Account"
                  component="img"
                  src="/svg/account.svg"
                  sx={{ width: 300, height: "auto", mx: "auto", justifySelf: "center", mt: -5 }}
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
               <Controller
                  control={control}
                  name="type"
                  render={
                     ({ field }) => (
                        <FormControl>
                           <InputLabel
                              htmlFor="type"
                           >
                              Type
                           </InputLabel>
                           <Select
                              {...field}
                              id="type"
                              variant="outlined"
                           >
                              {
                                 types.map((type) => (
                                    <MenuItem
                                       key={`account-type-${type}`}
                                       value={type}
                                    >
                                       {type}
                                    </MenuItem>
                                 ))
                              }
                           </Select>
                        </FormControl>
                     )
                  }
               />
               <Button
                  className="btn-primary"
                  color="info"
                  fullWidth={true}
                  onClick={() => setImageOpen(true)}
                  startIcon={<FontAwesomeIcon icon={faImages} />}
                  variant="contained"
               >
                  Select Image
               </Button>
               <ImageSelectModal
                  onClose={() => setImageOpen(false)}
                  selectImage={handleImageSelect}
                  open={imageOpen}
                  selectedImage={selectedImage}
               />
               <Button
                  className="btn-primary"
                  color="primary"
                  disabled={isSubmitting}
                  fullWidth={true}
                  startIcon={<FontAwesomeIcon icon={isUpdate ? faPencil : faPlus} />}
                  type="submit"
                  variant="contained"
               >
                  {isUpdate ? "Update" : "Create"}
               </Button>
            </Stack>
         </form>
      </Modal>
   );
}

export default function AccountCard({ account }: { account: Account | undefined }) {
   const [open, setOpen] = useState<boolean>(false);

   return (
      account ? (
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
                  href="#"
                  onClick={() => setOpen(true)}
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
                        {new Date(account.history[0].last_updated).toLocaleDateString()}
                     </Typography>
                     <AccountModal
                        account={account}
                        onClose={() => setOpen(false)}
                        open={open}
                     />
                  </Stack>
               </CardContent>
            </Card>
         </Grid>
      ) : (
         <Box>
            <Button
               className="btn-primary"
               color="primary"
               onClick={() => setOpen(true)}
               startIcon={<FontAwesomeIcon icon={faPlus} />}
               variant="contained"
            >
               Add Account
            </Button>
            <AccountModal
               account={account}
               onClose={() => setOpen(false)}
               open={open}
            />
         </Box>
      )
   );
};