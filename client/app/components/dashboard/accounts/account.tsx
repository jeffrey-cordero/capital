import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { faCircleLeft, faCircleRight, faClockRotateLeft, faImages, faPencil, faPenToSquare, faPlus, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Fab, FormControl, FormHelperText, InputLabel, MobileStepper, NativeSelect, OutlinedInput, Stack, TextField, Tooltip, Typography, useTheme } from "@mui/material";
import { type Account, type AccountHistory, accountHistorySchema, accountSchema, images, types } from "capital-types/accounts";
import { useEffect, useState } from "react";
import { type Control, Controller, type FieldErrors, type FieldValues, useForm, type UseFormSetError, type UseFormSetValue } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Modal from "@/components/global/modal";
import { sendApiRequest } from "@/lib/api";
import { constructDate } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { addAccount, removeAccount, updateAccount } from "@/redux/slices/accounts";
import { addNotification } from "@/redux/slices/notifications";

function AccountHistoryView({ account }: { account: Account }) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const {
      control,
      setError,
      handleSubmit,
      reset,
      formState: { isSubmitting, errors }
   } = useForm();

   const onSubmit = async(data: any) => {
      try {
         const fields = accountHistorySchema.safeParse(data);

         if (!fields.success) {
            handleValidationErrors(fields, setError);
         } else {
            const result = await sendApiRequest(
               `dashboard/accounts/${account.account_id}`, "POST", data, dispatch, navigate
            );

            if (result === 204) {
               let found: boolean = false;
               const update = constructDate(data.last_updated);

               const history = account.history.reduce((history: AccountHistory[], record) => {
                  const date = new Date(record.last_updated);

                  history.push({
                     balance: date.getDate() === update.getDate() ? data.balance : record.balance,
                     last_updated: date
                  });

                  if (!found && date.getDate() === update.getDate()) {
                     found = true;
                  }

                  return history;
               }, []);

               if (!found) {
                  history.push({
                     balance: data.balance,
                     last_updated: update
                  });
               }

               // Update history with proper ordering
               dispatch(updateAccount({
                  ...account,
                  balance: update.getDate() === new Date().getDate() ? data.balance : account.balance,
                  history: history.sort(
                     (a, b) => b.last_updated.getTime() - a.last_updated.getTime()
                  )
               }));

               reset({
                  balance: "",
                  last_updated: ""
               });
            }
         }
      } catch (error) {
         console.error(error);
      }
   };

   return (
      <Stack
         direction = "column"
         spacing = { 2 }
      >
         <Box>
            {
               account.history.map((history) =>
                  <p key = { `${account.account_id}-${history.last_updated}` }>
                     { history.balance } - { new Date(history.last_updated).toLocaleDateString() }
                  </p>
               )
            }
         </Box>
         <form onSubmit = { handleSubmit(onSubmit) }>
            <Stack
               direction = "column"
               spacing = { 2 }
            >

               <Controller
                  control = { control }
                  name = "balance"
                  render = {
                     ({ field }) => (
                        <FormControl error = { Boolean(errors.balance) }>
                           <InputLabel htmlFor = "history-balance">
                              Balance
                           </InputLabel>
                           <OutlinedInput
                              { ...field }
                              aria-label = "Balance"
                              autoFocus = { true }
                              disabled = { isSubmitting }
                              fullWidth = { true }
                              id = "history-balance"
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
                  name = "last_updated"
                  render = {
                     ({ field }) => (
                        <FormControl error = { Boolean(errors.last_updated) }>
                           <TextField
                              { ...field }
                              color = { errors.last_updated ? "error" : "info" }
                              error = { Boolean(errors.last_updated) }
                              fullWidth = { true }
                              id = "balance-date"
                              label = "Date"
                              size = "small"
                              slotProps = {
                                 {
                                    htmlInput: {
                                       max: new Date().toISOString().split("T")[0]
                                    },
                                    inputLabel: {
                                       shrink: true
                                    },
                                    input: {
                                       size: "medium"
                                    }
                                 }
                              }
                              type = "date"
                           />
                           {
                              errors.last_updated && (
                                 <FormHelperText>
                                    { errors.last_updated?.message?.toString() }
                                 </FormHelperText>
                              )
                           }
                        </FormControl>
                     )
                  }
               />
               <Button
                  color = "primary"
                  startIcon = { <FontAwesomeIcon icon = { faClockRotateLeft } /> }
                  type = "submit"
                  variant = "contained"
               >
                  Submit
               </Button>

            </Stack>
         </form>
      </Stack>
   );
}

interface DeleteAccountDialogProps {
   open: boolean;
   onClose: () => void;
   onDelete: () => void;
}

function DeleteAccountDialog({ open, onClose, onDelete }: DeleteAccountDialogProps) {
   return (
      <Dialog
         aria-describedby = "alert-dialog-description"
         aria-labelledby = "alert-dialog-title"
         onClose = { onClose }
         open = { open }
         sx = { { width: "90%", mx: "auto" } }
      >
         <DialogTitle id = "alert-dialog-title">
            Delete Account?
         </DialogTitle>
         <DialogContent>
            <DialogContentText id = "alert-dialog-description">
               Are you sure you want to delete your account? This action will permanently erase all your account history.
               However, any transactions linked to your account will be detached, but not deleted.
               Once deleted, this action cannot be undone.
            </DialogContentText>
         </DialogContent>
         <DialogActions>
            <Button onClick = { onClose }>NO</Button>
            <Button
               autoFocus = { true }
               onClick = { onDelete }
            >
               YES
            </Button>
         </DialogActions>
      </Dialog>
   );
}

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
   const imagesArray = Array.from(images);
   const [activeStep, setActiveStep] = useState<number>(Math.max(imagesArray.indexOf(value), 0));

   const saveImage = () => {
      const fields = imageSchema.safeParse(value);

      if (!fields.success) {
         setError("image", {
            type: "manual",
            message: "URL must be valid"
         });
      } else {
         onClose();
      }
   };

   return (
      <Modal
         onClose = { saveImage }
         open = { open }
         sx = { { width: "80%", maxWidth: "450px", p: 4 } }
      >
         <Stack spacing = { 1 }>
            <Stack
               direction = "column"
               sx = { { flexWrap: "wrap", justifyContent: "center", alignItems: "center", alignContent: "center" } }
            >
               <Avatar
                  onClick = { () => setValue("image", imagesArray[activeStep]) }
                  src = { `/images/${imagesArray[activeStep]}.png` }
                  sx = {
                     {
                        width: 250,
                        height: 250,
                        mt: 4,
                        mb: 2,
                        cursor: "pointer",
                        border: value === imagesArray[activeStep] ? "3px solid" : "none",
                        borderColor: "primary.main"
                     }
                  }
                  variant = "rounded"
               />
               <MobileStepper
                  activeStep = { activeStep }
                  backButton = {
                     <Button
                        disabled = { activeStep === 0 }
                        onClick = { () => setActiveStep(activeStep - 1) }
                        size = "small"
                     >
                        <FontAwesomeIcon
                           icon = { faCircleLeft }
                           size = "lg"
                        />
                     </Button>
                  }
                  nextButton = {
                     <Button
                        disabled = { activeStep === imagesArray.length - 1 }
                        onClick = { () => setActiveStep(activeStep + 1) }
                        size = "small"
                     >
                        <FontAwesomeIcon
                           icon = { faCircleRight }
                           size = "lg"
                        />
                     </Button>
                  }
                  position = "top"
                  steps = { imagesArray.length }
                  variant = "progress"
               />
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
                           id = "image"
                           label = "URL"
                           onFocus = { () => images.has(value) && setValue("image", "") }
                           type = "text"
                           value = { images.has(field.value) ? "" : field.value }
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
   const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
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
   }, [account, reset, open]);

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
               if (data.image !== account.image) {
                  updatedFields.image = data.image;
               }

               // Only send request if there are changes
               if (Object.keys(updatedFields).length > 0) {
                  updatedFields.account_id = account.account_id;

                  const result = await sendApiRequest(
                     `dashboard/accounts/${account.account_id}`, "POST", updatedFields, dispatch, navigate
                  );

                  if (result === 204) {
                     dispatch(updateAccount({
                        ...account,
                        ...updatedFields
                     } as Account));
                  }
               }
            } else {
               const creation = {
                  name: data.name.trim(),
                  balance: data.balance,
                  type: data.type,
                  image: data.image !== "" ? data.image : undefined
               };

               // Send API request
               const result = await sendApiRequest(
                  "dashboard/accounts", "POST", creation, dispatch, navigate
               ) as Record<string, string>;

               if (result.account_id) {
                  dispatch(addAccount({
                     ...creation,
                     account_id: result.account_id,
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

   const onDelete = async() => {
      try {
         const result = await sendApiRequest(
            `dashboard/accounts/${account?.account_id}`, "DELETE", undefined, dispatch, navigate
         );

         if (result === 204) {
            dispatch(removeAccount(account?.account_id ?? ""));
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
         <Divider>
            <Chip label = "Details" />
         </Divider>
         <form onSubmit = { handleSubmit(onSubmit) }>
            <Stack
               direction = "column"
               spacing = { 2 }
               sx = { { mt: 2 } }
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
                              autoComplete = "none"
                              autoFocus = { true }
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
                  defaultValue = "Other"
                  name = "type"
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
               <Stack
                  direction = "column"
                  spacing = { 1 }
               >
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
                     setValue = { setValue }
                     value = { watch("image") }
                  />
                  <Button
                     className = "btn-primary"
                     color = "primary"
                     disabled = { isSubmitting }
                     fullWidth = { true }
                     loading = { isSubmitting }
                     startIcon = { <FontAwesomeIcon icon = { updating ? faPenToSquare : faPlus } /> }
                     type = "submit"
                     variant = "contained"
                  >
                     { updating ? "Update" : "Create" }
                  </Button>
                  {
                     updating && (
                        <Box>
                           <Button
                              className = "btn-primary"
                              color = "error"
                              disabled = { isSubmitting }
                              fullWidth = { true }
                              loading = { isSubmitting }
                              onClick = { () => setDeleteOpen(true) }
                              startIcon = { <FontAwesomeIcon icon = { faTrashCan } /> }
                              type = "button"
                              variant = "contained"
                           >
                              Delete
                           </Button>
                           <DeleteAccountDialog
                              onClose = { () => setDeleteOpen(false) }
                              onDelete = { onDelete }
                              open = { deleteOpen }
                           />
                        </Box>
                     )
                  }
               </Stack>
            </Stack>
         </form>
         {
            updating && (
               <Stack
                  direction = "column"
                  spacing = { 2 }
                  sx = { { mt: 2, textAlign: "center" } }
               >
                  <Divider>
                     <Chip
                        label = "History"
                     />
                  </Divider>
                  <AccountHistoryView
                     account = { account }
                  />
                  <Divider>
                     <Chip
                        label = "Transactions"
                     />
                  </Divider>
                  <Typography
                     fontWeight = "bold"
                     variant = "subtitle2"
                  >
                     Coming Soon.
                  </Typography>
               </Stack>
            )
         }
      </Modal>
   );
}

export default function AccountCard({ account }: { account: Account | undefined }) {
   const dispatch = useDispatch(), theme = useTheme();
   const [state, setState] = useState<"view" | "create" | "update">("view");
   const [resourceError, setResourceError] = useState<boolean>(false);

   // Drag and drop identifier measures
   const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: account?.account_id ?? "",
      disabled: state !== "view"
   });

   const style = {
      transform: CSS.Transform.toString(transform),
      transition
   };

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
                  className = { resourceError ? "error" : "primary" }
                  component = "a"
                  href = "#"
                  onClick = { () => setState("update") }
               >
                  <Avatar
                     onError = {
                        (e) => {
                           setResourceError(true);
                           dispatch(addNotification({
                              type: "Error",
                              message: `There was an issue fetching the image for ${account.name}`
                           }));
                           (e.target as HTMLImageElement).src = "";
                        }
                     }
                     src = { images.has(account.image) ? `/images/${account.image}.png` : account.image }
                     sx = {
                        {
                           height: 225,
                           width: "100%",
                           cursor: "grab",
                           background: resourceError ? theme.palette.error.main : theme.palette.primary.main
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
                     <Typography variant = "subtitle2">
                        { account.type }
                     </Typography>
                     <Typography
                        variant = "subtitle2"
                     >
                        Updated { new Date(account.history[0].last_updated).toLocaleDateString() }
                     </Typography>
                     <AccountModal
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