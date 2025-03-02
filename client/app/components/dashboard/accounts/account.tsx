import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { faChartLine, faClockRotateLeft, faImages, faPencil, faPenToSquare, faPlus, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Box, Button, Card, CardContent, Fab, FormControl, FormHelperText, InputLabel, NativeSelect, OutlinedInput, Stack, Tooltip, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Divider, Chip, TextField } from "@mui/material";
import { type Account, type AccountHistory, accountSchema, images, types } from "capital-types/accounts";
import { useEffect, useState } from "react";
import { type Control, Controller, type FieldErrors, type FieldValues, useForm, type UseFormSetError, type UseFormSetValue } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Modal from "@/components/global/modal";
import { sendApiRequest } from "@/lib/api";
import { handleValidationErrors } from "@/lib/validation";
import { addAccount, removeAccount, updateAccount } from "@/redux/slices/accounts";

interface AccountHistoryModalProps {
   open: boolean;
   onClose: () => void;
   account: Account;
}

function AccountHistoryModal({ open, onClose, account }: AccountHistoryModalProps) {
   const {
      control,
      handleSubmit,
      reset,
      formState: { isSubmitting, errors }
   } = useForm();

   return (
      <Modal
         onClose={()=> {
            reset();
            onClose();
         }}
         open={open}
         sx={{ width: "80%", maxWidth: "90%", p: 4 }}
      >
         <Stack direction="row" spacing={2}>
            <Controller
               control={control}
               name="balance"
               render={
                  ({ field }) => (
                     <FormControl error={Boolean(errors.balance)}>
                        <InputLabel htmlFor="history-balance">
                           Balance
                        </InputLabel>
                        <OutlinedInput
                           {...field}
                           aria-label="Balance"
                           autoFocus={true}
                           disabled={isSubmitting}
                           id="history-balance"
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
               control = { control }
               name = "from"
               render = {
                  ({ field }) => (
                     <FormControl>
                        <TextField
                           { ...field }
                           id = "balance-date"
                           label = "Balance"
                           size = "small"
                           type = "date"
                           sx = {{ minHeight: "100%" }}
                           slotProps = {
                              {
                                 htmlInput: {
                                    max: new Date().toISOString().split("T")[0]
                                 },
                                 inputLabel: {
                                    shrink: true
                                 }
                              }
                           }
                        />
                     </FormControl>

                  )
               }
            />
         </Stack>
      </Modal>
   )
}

interface DeleteAccountDialogProps {
   open: boolean;
   onClose: () => void;
   onDelete: () => void;
}

function DeleteAccountDialog({open, onClose, onDelete}: DeleteAccountDialogProps) {
   return (
      <Dialog
         open={open}
         onClose={onClose}
         aria-labelledby="alert-dialog-title"
         aria-describedby="alert-dialog-description"
         sx={{width: "90%", mx: "auto"}}
      >
         <DialogTitle id="alert-dialog-title">
            Delete Account?
         </DialogTitle>
         <DialogContent>
            <DialogContentText id="alert-dialog-description">
               Are you sure you want to delete your account? This action will permanently erase all your account history. 
               However, any transactions linked to your account will be detached, but not deleted. 
               Once deleted, this action cannot be undone.
            </DialogContentText>

         </DialogContent>
         <DialogActions>
            <Button onClick={onClose}>NO</Button>
            <Button onClick={onDelete} autoFocus>
               YES
            </Button>
         </DialogActions>
      </Dialog>
   )
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

   const handleSaveImage = () => {
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
                  Array.from(images).map((image) => (
                     <Avatar
                        key={`account-image-${image}`}
                        onClick={() => setValue("image", image)}
                        src={`/images/${image}.png`}
                        sx={
                           {
                              width: 225,
                              height: 225,
                              cursor: "pointer",
                              border: value === image ? "2px solid" : "none",
                              borderColor: "primary.main"
                           }
                        }
                        variant="square"
                     />
                  ))
               }
            </Stack>
            <Controller
               control={control}
               name="image"
               render={
                  ({ field }) => (
                     <FormControl error={Boolean(errors.image)}>
                        <InputLabel htmlFor="url">
                           URL
                        </InputLabel>
                        <OutlinedInput
                           {...field}
                           aria-label="URL"
                           autoFocus={true}
                           id="image"
                           label="URL"
                           onFocus={() => images.has(value) && setValue("image", "")}
                           type="text"
                           value={images.has(field.value) ? "" : field.value}
                        />
                        {
                           errors.image && (
                              <FormHelperText>
                                 {errors.image?.message?.toString()}
                              </FormHelperText>
                           )
                        }
                     </FormControl>
                  )
               }
            />
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
   const dispatch = useDispatch(), navigate = useNavigate();
   const [imageOpen, setImageOpen] = useState<boolean>(false);
   const [historyOpen, setHistoryOpen] = useState<boolean>(false);
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

   const onSubmit = async (data: any) => {
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
   }

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
                              autoComplete="none"
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
                  defaultValue="Other"
                  name="type"
                  render={
                     ({ field }) => (
                        <FormControl
                           error={Boolean(errors.type)}
                           sx={{ px: 0.75 }}
                        >
                           <InputLabel
                              htmlFor="type"
                              sx={{ px: 0.75 }}
                              variant="standard"
                           >
                              Type
                           </InputLabel>
                           <NativeSelect
                              {...field}
                              id="type"
                           >
                              {
                                 Array.from(types).map((key) => (
                                    <option
                                       key={key}
                                       value={key}
                                    >
                                       {key}
                                    </option>
                                 ))
                              }
                           </NativeSelect>
                        </FormControl>
                     )

                  }
               />
               <Stack
                  direction="column"
                  spacing={1}
               >
                  <Box>
                     <Button
                        className="btn-primary"
                        color="info"
                        fullWidth={true}
                        onClick={() => setImageOpen(true)}
                        startIcon={<FontAwesomeIcon icon={faImages} />}
                        variant="contained"
                     >
                        {watch("image") === "" ? "Select" : "Edit"} Image
                     </Button>
                     <ImageSelectModal
                        control={control}
                        errors={errors}
                        onClose={() => setImageOpen(false)}
                        open={imageOpen}
                        setError={setError}
                        setValue={setValue}
                        value={watch("image")}
                     />
                  </Box>
                  {
                     updating && (
                        <Box>
                           <Button
                           className="btn-primary"
                           color="success"
                           sx = {{ color: "white" }}
                           fullWidth={true}
                           onClick={() => setHistoryOpen(true)}
                           startIcon={<FontAwesomeIcon icon={faClockRotateLeft} />}
                           variant="contained"
                        >
                           History
                        </Button>
                        <AccountHistoryModal 
                           open={historyOpen}
                           onClose={() => setHistoryOpen(false)}
                           account={account}
                        />
                        </Box>
                     )
                  }
                  <Button
                     className="btn-primary"
                     color="primary"
                     disabled={isSubmitting}
                     fullWidth={true}
                     loading={isSubmitting}
                     startIcon={<FontAwesomeIcon icon={updating ? faPenToSquare : faPlus} />}
                     type="submit"
                     variant="contained"
                  >
                     {updating ? "Update" : "Create"}
                  </Button>
                  {
                     updating && (
                        <Box>
                           <Button
                              className="btn-primary"
                              color="error"
                              disabled={isSubmitting}
                              fullWidth={true}
                              loading={isSubmitting}
                              startIcon={<FontAwesomeIcon icon={faTrashCan} />}
                              type="button"
                              onClick={() => setDeleteOpen(true)}
                              variant="contained"
                           >
                              Delete
                           </Button>
                           <DeleteAccountDialog
                              open={deleteOpen}
                              onClose={() => setDeleteOpen(false)}
                              onDelete={onDelete}
                           />
                        </Box>
                     )
                  }
               </Stack>
               {
                  updating && (
                     <Stack
                        direction="column"
                        spacing={2}
                        textAlign="center">
                        <Divider>
                           <Chip label="History" color="success" />
                        </Divider>
                        <Typography
                           fontWeight="bold"
                           variant="subtitle2">
                              Coming Soon.
                        </Typography>
                        <Divider>
                           <Chip label="Transactions" color="success" />
                        </Divider>
                        <Typography
                           fontWeight="bold"
                           variant="subtitle2">
                              Coming Soon.
                        </Typography>
                     </Stack>
                  )
               }
            </Stack>
         </form>
      </Modal>
   );
}

export default function AccountCard({ account }: { account: Account | undefined }) {
   const [state, setState] = useState<"view" | "create" | "update">("view");

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
            ref={setNodeRef}
            style={style}
         >
            <Card
               elevation={9}
               sx={{ p: 0, position: "relative", textAlign: "left", borderRadius: 2 }}
               variant={undefined}
            >
               <Typography
                  component="a"
                  href="#"
                  onClick={() => setState("update")}
               >
                  <Avatar
                     src={images.has(account.image) ? `/images/${account.image}.png` : account.image}
                     sx={
                        {
                           height: 225,
                           width: "100%",
                           cursor: "grab"
                        }
                     }
                     variant="square"
                     {...attributes}
                     {...listeners}
                  />
               </Typography>
               <Tooltip
                  onClick={() => setState("update")}
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
                     <Typography variant="subtitle2">
                        {account.type}
                     </Typography>
                     <Typography
                        variant="subtitle2"
                     >
                        Updated {new Date(account.history[0].last_updated).toLocaleDateString()}
                     </Typography>
                     <AccountModal
                        account={account}
                        onClose={() => setState("view")}
                        open={state === "update"}
                     />
                  </Stack>
               </CardContent>
            </Card>
         </div>
      ) : (
         <Box>
            <Button
               className="btn-primary"
               color="primary"
               onClick={() => setState("create")}
               startIcon={<FontAwesomeIcon icon={faPlus} />}
               variant="contained"
            >
               Add Account
            </Button>
            <AccountModal
               account={account}
               onClose={() => setState("view")}
               open={state === "create"}
            />
         </Box>
      )
   );
};