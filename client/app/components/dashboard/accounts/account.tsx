import { faImages, faPencil, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Box, Button, Card, CardContent, Fab, FormControl, FormHelperText, InputLabel, NativeSelect, OutlinedInput, Stack, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { type Account, accountSchema, images, types } from "capital-types/accounts";
import { useEffect, useState } from "react";
import { type Control, Controller, type FieldErrors, type FieldValues, useForm, type UseFormSetError, type UseFormSetValue } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Modal from "@/components/global/modal";
import { sendApiRequest } from "@/lib/api";
import { handleValidationErrors } from "@/lib/validation";
import { addAccount, updateAccount } from "@/redux/slices/accounts";

interface ImageSelectModalProps {
   open: boolean;
   onClose: () => void;
   value: string;
   errors: FieldErrors<FieldValues>;
   setError: UseFormSetError<FieldValues>;
   setValue: UseFormSetValue<FieldValues>;
   control: Control<FieldValues>;
}

function ImageSelectModal({ open, onClose, control, errors, setError, value, setValue }: ImageSelectModalProps) {
   const imageSchema = accountSchema.shape.image;

   const handleSaveImage = () => {
      const fields = imageSchema.safeParse(value);

      if (!fields.success) {
         handleValidationErrors(fields, setError);
      } else {
         onClose();
      }
   };

   return (
      <Modal
         onClose = { onClose }
         open = { open }
         sx = { { width: "80%", maxWidth: "90%", p: 4 } }
      >
         <Stack spacing = { 3 }>
            <Stack
               direction = "row"
               spacing = { 4 }
               sx = { { flexWrap: "wrap", justifyContent: "center", alignItems: "center", alignContent: "center" } }
            >
               {
                  Array.from(images).map((image) => (
                     <Avatar
                        key = { `account-image-${image}` }
                        onClick = { () => setValue("image", image) }
                        src = { `/images/${image}.png` }
                        sx = {
                           {
                              width: 225,
                              height: 225,
                              cursor: "pointer",
                              border: value === image ? "2px solid" : "none",
                              borderColor: "primary.main"
                           }
                        }
                        variant = "square"
                     />
                  ))
               }
            </Stack>
            <Controller
               control = { control }
               name = "image"
               render = {
                  ({ field }) => (
                     <FormControl error = { Boolean(errors.image) }>
                        <InputLabel htmlFor = "url">
                           URL
                        </InputLabel>
                        <OutlinedInput
                           { ...field }
                           aria-label = "URL"
                           autoFocus
                           id = "image"
                           label = "URL"
                           type = "text"
                           value = { field.value }
                        />
                        {
                           errors.image && (
                              <FormHelperText>
                                 { errors.image?.message?.toString() }
                              </FormHelperText>
                           )
                        }
                     </FormControl>
                  )
               }
            />
            <Button
               color = "primary"
               onClick = { handleSaveImage }
               startIcon = { <FontAwesomeIcon icon = { faImages } /> }
               variant = "contained"
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
   const dispatch = useDispatch(), navigate = useNavigate();
   const [imageOpen, setImageOpen] = useState<boolean>(false);
   const updating = account !== undefined;

   const {
      control,
      setError,
      setValue,
      handleSubmit,
      reset,
      watch,
      formState: { isSubmitting, errors, dirtyFields }
   } = useForm();

   useEffect(() => {
      if (open) {
         reset(account);
      } else {
         reset();
      }
   }, [open])

   const onSubmit = async(data: any) => {
      try {
         const fields = accountSchema.safeParse(data);

         if (!fields.success) {
            handleValidationErrors(fields, setError);
         } else {
            // Determine if this is an update or create operation
            if (updating) {
               // Send dirty fields for updates to minimize data sent
               const updatedFields = Object.keys(dirtyFields).reduce((acc: any, key) => {
                  acc[key] = data[key];

                  return acc;
               }, {});

               // Add image if it changed as it relies on local state
               if (data.image && data.image !== account.image) {
                  updatedFields.image = data.image;
               }

               console.log(updatedFields);

               // Only send request if there are changes
               if (Object.keys(updatedFields).length > 0) {
                  updatedFields.account_id = account.account_id;

                  const response = await sendApiRequest(
                     `dashboard/accounts/${account.account_id}`, "POST", updatedFields, dispatch, navigate
                  );

                  console.log(response);

                  // onClose();
               }
            } else {
               const creation = {
                  name: data.name.trim(),
                  balance: data.balance,
                  type: data.type,
                  image: data.image !== "" ? data.image : undefined
               };

               // Send API request
               const response = await sendApiRequest(
                  "dashboard/accounts", "POST", creation, dispatch, navigate
               ) as Record<string, string>;

               if (response.account_id) {
                  dispatch(addAccount({
                     ...creation,
                     account_id: response.account_id,
                     history: [{
                        balance: creation.balance,
                        last_updated: new Date()
                     }]
                  } as Account));

                  onClose();
               }

            }
         }
      } catch (error) {
         console.error(error);
      }
   };

   return (
      <Modal
         onClose = { onClose }
         open = { open }
         sx = { { position: "relative", width: { xs: "90%", md: "60%", lg: "40%" }, maxWidth: "90%" } }
      >
         <form onSubmit = { handleSubmit(onSubmit) }>
            <Stack sx = { { alignItems: "center", justifyContent: "center" } }>
               <Box
                  alt = "Account"
                  component = "img"
                  src = "/svg/account.svg"
                  sx = { { width: 400, height: "auto", mx: "auto", justifySelf: "center", mt: -5 } }
               />
            </Stack>
            <Stack
               direction = "column"
               spacing = { 2 }
               sx = { { mt: -5 } }
            >
               <Controller
                  control = { control }
                  name = "name"
                  render = {
                     ({ field }) => (
                        <FormControl error = { Boolean(errors.name) }>
                           <InputLabel htmlFor = "name">
                              Name
                           </InputLabel>
                           <OutlinedInput
                              { ...field }
                              aria-label = "Name"
                              autoFocus = { true }
                              autoComplete="none"
                              disabled = { isSubmitting }
                              id = "name"
                              label = "Name"
                              type = "text"
                              value = { field.value || "" }
                           />
                           {
                              errors.name && (
                                 <FormHelperText>
                                    { errors.name?.message?.toString() }
                                 </FormHelperText>
                              )
                           }
                        </FormControl>
                     )
                  }
               />
               <Controller
                  control = { control }
                  name = "balance"
                  render = {
                     ({ field }) => (
                        <FormControl error = { Boolean(errors.balance) }>
                           <InputLabel htmlFor = "balance">
                              Balance
                           </InputLabel>
                           <OutlinedInput
                              { ...field }
                              aria-label = "Balance"
                              autoFocus = { true }
                              disabled = { isSubmitting }
                              id = "balance"
                              label = "Balance"
                              type = "number"
                              value = { field.value || "" }
                           />
                           {
                              errors.balance && (
                                 <FormHelperText>
                                    { errors.balance?.message?.toString() }
                                 </FormHelperText>
                              )
                           }
                        </FormControl>
                     )
                  }
               />
               <Controller
                  control = { control }
                  name = "type"
                  defaultValue = "Other"
                  render = {
                     ({ field }) => (
                        <FormControl
                           error = { Boolean(errors.type) }
                           sx = { { px: 0.75 } }
                        >
                           <InputLabel
                              htmlFor = "type"
                              sx = { { px: 0.75 } }
                              variant = "standard"
                           >
                              Type
                           </InputLabel>
                           <NativeSelect
                              { ...field }
                              id = "type"
                           >
                              {
                                 Array.from(types).map((key) => (
                                    <option
                                       key = { key }
                                       value = { key }
                                    >
                                       { key }
                                    </option>
                                 ))
                              }
                           </NativeSelect>
                        </FormControl>
                     )

                  }
               />
               <Button
                  className = "btn-primary"
                  color = "info"
                  fullWidth = { true }
                  onClick = { () => setImageOpen(true) }
                  startIcon = { <FontAwesomeIcon icon = { faImages } /> }
                  variant = "contained"
               >
                  Select Image
               </Button>
               <ImageSelectModal
                  control = { control }
                  errors = { errors }
                  onClose = { () => setImageOpen(false) }
                  open = { imageOpen }
                  setError = { setError }
                  setValue={ setValue }
                  value = { watch("image") }
               />
               <Button
                  className = "btn-primary"
                  color = "primary"
                  disabled = { isSubmitting }
                  fullWidth = { true }
                  loading = { isSubmitting }
                  startIcon = { <FontAwesomeIcon icon = { updating ? faPencil : faPlus } /> }
                  type = "submit"
                  variant = "contained"
               >
                  { updating ? "Update" : "Create" }
               </Button>
            </Stack>
         </form>
      </Modal>
   );
}

export default function AccountCard({ account }: { account: Account | undefined }) {
   const [state, setState] = useState<"view" | "create" | "update">("view");

   return (
      account ? (
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
                  href = "#"
                  onClick = { () => setState("update") }
               >
                  <Avatar
                     src = {images.has(account.image) ?  `/images/${account.image}.png` : account.image}
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
                        ${ new Intl.NumberFormat().format(account.balance) }
                     </Typography>
                     <Typography
                        fontStyle = "italic"
                        variant = "subtitle2"
                     >
                        { new Date(account.history[0].last_updated).toLocaleDateString() }
                     </Typography>
                     <AccountModal
                        account = { account }
                        onClose = { () => setState("view") }
                        open = { state === "update" }
                     />
                  </Stack>
               </CardContent>
            </Card>
         </Grid>
      ) : (
         <Box>
            <Button
               className = "btn-primary"
               color = "primary"
               onClick = { () => setState("create") }
               startIcon = { <FontAwesomeIcon icon = { faPlus } /> }
               variant = "contained"
            >
               Add Account
            </Button>
            <AccountModal
               account = { account }
               onClose = { () => setState("view") }
               open = { state === "create" }
            />
         </Box>
      )
   );
};