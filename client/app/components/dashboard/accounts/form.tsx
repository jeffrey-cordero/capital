import { faPenToSquare, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Chip, Divider, FormControl, FormHelperText, InputLabel, NativeSelect, OutlinedInput, Stack } from "@mui/material";
import { type Account, accountSchema, types } from "capital/accounts";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import AccountTransactions from "@/components/dashboard/accounts/account-transactions";
import AccountDeletion from "@/components/dashboard/accounts/delete";
import AccountHistory from "@/components/dashboard/accounts/history";
import AccountImage from "@/components/dashboard/accounts/image";
import ExitWarning from "@/components/global/exit-warning";
import Modal from "@/components/global/modal";
import { sendApiRequest } from "@/lib/api";
import { today } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { addAccount, updateAccount } from "@/redux/slices/accounts";

interface AccountFormProps {
   account: Account | undefined;
   open: boolean;
   onClose: () => void;
}

export default function AccountForm({ account, open, onClose }: AccountFormProps) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const [exitWarning, setExitWarning] = useState<boolean>(false);
   const updating = account !== undefined;

   const {
      control,
      setError,
      clearErrors,
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
               const updatedFields = Object.keys(dirtyFields).reduce((acc: any, record) => {
                  acc[record] = data[record];

                  return acc;
               }, {});

               // Only send request for actual changes
               if (Object.keys(updatedFields).length > 0) {
                  updatedFields.account_id = account.account_id;

                  const result = await sendApiRequest(
                     `dashboard/accounts/${account.account_id}`, "POST", updatedFields, dispatch, navigate
                  );

                  if (result === 204) {
                     // Update account details, potentially updating most recent record in the history array
                     dispatch(updateAccount({
                        account: {
                           ...account,
                           ...updatedFields
                        },
                        history: updatedFields.balance ? {
                           balance: updatedFields.balance,
                           last_updated: today.toISOString()
                        } : undefined
                     }));
                  }
               }
            } else {
               const creation = {
                  name: data.name.trim(),
                  balance: data.balance,
                  type: data.type,
                  image: data.image !== "" ? data.image : undefined
               };

               const result = await sendApiRequest(
                  "dashboard/accounts", "POST", creation, dispatch, navigate
               ) as Record<string, string>;

               if (result.account_id) {
                  dispatch(addAccount({
                     ...creation,
                     account_id: result.account_id,
                     history: [{
                        balance: creation.balance,
                        last_updated: new Date().toISOString()
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
         onClose = {
            () => {
               if (Object.keys(dirtyFields).length > 0) {
                  setExitWarning(true);
                  return;
               } else {
                  onClose();
               }
            }
         }
         open = { open }
         sx = { { position: "relative", width: { xs: "90%", md: "70%", lg: "55%" }, p: 3, maxWidth: "90%" } }
      >
         <Stack
            direction = "column"
            spacing = { 3 }
         >
            <Box>
               <Divider>
                  <Chip
                     color = "success"
                     label = "Details"
                  />
               </Divider>
               <form onSubmit = { handleSubmit(onSubmit) }>
                  <Stack
                     direction = "column"
                     spacing = { 2 }
                     sx = { { mt: 3 } }
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
                        defaultValue = "Checking"
                        name = "type"
                        render = {
                           ({ field }) => (
                              <FormControl
                                 disabled = { isSubmitting }
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
                        <AccountImage
                           clearErrors = { clearErrors }
                           control = { control }
                           disabled = { isSubmitting }
                           errors = { errors }
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
                              <AccountDeletion
                                 account = { account }
                                 disabled = { isSubmitting }
                              />
                           )
                        }
                        <ExitWarning
                           onCancel = { () => setExitWarning(false) }
                           onClose = {
                              () => {
                                 setExitWarning(false);
                                 onClose();
                              }
                           }
                           open = { exitWarning }
                        />
                     </Stack>
                  </Stack>
               </form>
            </Box>
            {
               updating && (
                  <Stack
                     direction = "column"
                     spacing = { 3 }
                  >
                     <AccountHistory
                        account = { account }
                        disabled = { isSubmitting }
                     />
                     <AccountTransactions
                        account = { account }
                     />
                  </Stack>
               )
            }
         </Stack>
      </Modal>
   );
}