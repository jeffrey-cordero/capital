import { faPenToSquare, faSave } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   FormControl,
   FormHelperText,
   IconButton,
   InputAdornment,
   InputLabel,
   OutlinedInput,
   Paper,
   Stack,
   Typography
} from "@mui/material";
import { type UserDetails, type UserDetailUpdates, userUpdateSchema } from "capital/user";
import { useCallback, useState } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { handleValidationErrors } from "@/lib/validation";
import { addNotification } from "@/redux/slices/notifications";
import { updateDetails } from "@/redux/slices/settings";
import type { RootState } from "@/redux/store";

/**
 * DetailsForm component for updating user details
 *
 * @returns {React.ReactNode} The DetailsForm component
 */
export default function DetailsForm(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const settings = useSelector((state: RootState) => state.settings.value);
   const [showPasswordFields, setShowPasswordFields] = useState(false);

   // Form setup with react-hook-form
   const {
      control,
      handleSubmit,
      setError,
      formState: { isSubmitting, errors, dirtyFields }
   } = useForm<UserDetailUpdates>({
      defaultValues: settings || {}
   });

   // Handles update submissions
   const onSubmit = async(data: FieldValues) => {
      try {
         const fields = userUpdateSchema.partial().safeParse(data);

         if (!fields.success) {
            handleValidationErrors(fields, setError);
            return;
         }

         // Only send fields that were changed
         const updates = Object.keys(dirtyFields).reduce((acc: Partial<UserDetailUpdates>, key) => {
            acc[key as keyof UserDetailUpdates] = fields.data[key as keyof UserDetailUpdates];
            return acc;
         }, {});

         // Skip if no changes were made
         if (Object.keys(updates).length === 0) return;

         if (showPasswordFields && updates.newPassword) {
            // Ensure verification password is included
            if (!updates.verifyPassword) {
               setError("verifyPassword", {
                  type: "manual",
                  message: "Please confirm your new password"
               });
               return;
            }

            // Ensure old password is included
            if (!updates.password) {
               setError("password", {
                  type: "manual",
                  message: "Current password is required to change password"
               });
               return;
            }
         }

         const response = await sendApiRequest<number>(
            "dashboard/settings", "PUT", updates, dispatch, navigate, setError
         );

         if (response === 204) {
            const update: Partial<UserDetails> = {
               username: updates.username,
               name: updates.name,
               email: updates.email
            };

            // Update Redux store with the changes and reset the password fields
            dispatch(updateDetails(update));
            setShowPasswordFields(false);

            // Notify user of successful update
            dispatch(addNotification({
               message: "Settings updated successfully",
               type: "success"
            }));
         }
      } catch (error) {
         console.error("Failed to update settings:", error);
      }
   };

   // Toggle password change fields visibility
   const togglePasswordFields = useCallback(() => {
      setShowPasswordFields(!showPasswordFields);
   }, [showPasswordFields]);

   return (
      <Paper
         elevation = { 3 }
         sx = { { p: 4, mt: 2 } }
      >
         <form onSubmit = { handleSubmit(onSubmit) }>
            <Stack
               direction = "column"
               spacing = { 3 }
            >
               <Typography variant = "h6">
                  Account Details
               </Typography>
               <Controller
                  control = { control }
                  name = "username"
                  render = {
                     ({ field }) => (
                        <FormControl error = { Boolean(errors.username) }>
                           <InputLabel htmlFor = "username">
                              Username
                           </InputLabel>
                           <OutlinedInput
                              { ...field }
                              id = "username"
                              label = "Username"
                              value = { field.value || "" }
                           />
                           <FormHelperText>
                              { errors.username?.message?.toString() }
                           </FormHelperText>
                        </FormControl>
                     )
                  }
               />
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
                              id = "name"
                              label = "Full Name"
                              value = { field.value || "" }
                           />
                           <FormHelperText>
                              { errors.name?.message?.toString() }
                           </FormHelperText>
                        </FormControl>
                     )
                  }
               />
               <Controller
                  control = { control }
                  name = "email"
                  render = {
                     ({ field }) => (
                        <FormControl error = { Boolean(errors.email) }>
                           <InputLabel htmlFor = "email">
                              Email
                           </InputLabel>
                           <OutlinedInput
                              { ...field }
                              id = "email"
                              label = "Email"
                              type = "email"
                              value = { field.value || "" }
                           />
                           <FormHelperText>
                              { errors.email?.message?.toString() }
                           </FormHelperText>
                        </FormControl>
                     )
                  }
               />
               <Typography variant = "h6">
                  Security
               </Typography>
               <Controller
                  control = { control }
                  name = "password"
                  render = {
                     ({ field }) => (
                        <FormControl error = { Boolean(errors.password) }>
                           <InputLabel htmlFor = "password">
                              Current Password
                           </InputLabel>
                           <OutlinedInput
                              { ...field }
                              endAdornment = {
                                 <InputAdornment position = "end">
                                    <IconButton
                                       aria-label = "toggle password change"
                                       edge = "end"
                                       onClick = { togglePasswordFields }
                                    >
                                       <FontAwesomeIcon icon = { faPenToSquare } />
                                    </IconButton>
                                 </InputAdornment>
                              }
                              id = "password"
                              label = "Current Password"
                              type = "password"
                              value = { field.value || "" }
                           />
                           <FormHelperText>
                              { errors.password?.message?.toString() }
                           </FormHelperText>
                        </FormControl>
                     )
                  }
               />
               <Box sx = { { display: showPasswordFields ? "block" : "none" } }>
                  <Stack
                     direction = "column"
                     spacing = { 3 }
                  >
                     <Controller
                        control = { control }
                        name = "newPassword"
                        render = {
                           ({ field }) => (
                              <FormControl error = { Boolean(errors.newPassword) }>
                                 <InputLabel htmlFor = "newPassword">
                                    New Password
                                 </InputLabel>
                                 <OutlinedInput
                                    { ...field }
                                    id = "newPassword"
                                    label = "New Password"
                                    type = "password"
                                    value = { field.value || "" }
                                 />
                                 <FormHelperText>
                                    { errors.newPassword?.message?.toString() }
                                 </FormHelperText>
                              </FormControl>
                           )
                        }
                     />
                     <Controller
                        control = { control }
                        name = "verifyPassword"
                        render = {
                           ({ field }) => (
                              <FormControl error = { Boolean(errors.verifyPassword) }>
                                 <InputLabel htmlFor = "verifyPassword">
                                    Verify Password
                                 </InputLabel>
                                 <OutlinedInput
                                    { ...field }
                                    id = "verifyPassword"
                                    label = "Verify Password"
                                    type = "password"
                                    value = { field.value || "" }
                                 />
                                 <FormHelperText>
                                    { errors.verifyPassword?.message?.toString() }
                                 </FormHelperText>
                              </FormControl>
                           )
                        }
                     />
                  </Stack>
               </Box>
               <Button
                  className = "btn-primary"
                  color = "primary"
                  fullWidth = { true }
                  loading = { isSubmitting }
                  startIcon = { <FontAwesomeIcon icon = { faSave } /> }
                  type = "submit"
                  variant = "contained"
               >
                  Save Changes
               </Button>
            </Stack>
         </form>
      </Paper>
   );
}