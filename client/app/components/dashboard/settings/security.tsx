import { faPenToSquare, faRightFromBracket, faRotateLeft, faSave } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   Fade,
   FormControl,
   FormHelperText,
   IconButton,
   InputAdornment,
   InputLabel,
   OutlinedInput,
   Paper,
   Stack
} from "@mui/material";
import { type UserDetails, type UserDetailUpdates, userUpdateSchema } from "capital/user";
import { useCallback, useState } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import DeleteAccount from "@/components/dashboard/settings/delete";
import ExportAccount from "@/components/dashboard/settings/export";
import { clearAuthentication } from "@/components/global/sidebar";
import { sendApiRequest } from "@/lib/api";
import { handleValidationErrors } from "@/lib/validation";
import { addNotification } from "@/redux/slices/notifications";
import { updateDetails } from "@/redux/slices/settings";
import type { RootState } from "@/redux/store";

/**
 * Security component for editing user security information
 *
 * @returns {React.ReactNode} The Security component
 */
export default function Security(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();

   // Gather user settings from Redux store
   const settings = useSelector((state: RootState) => state.settings.value);

   // States for input fields disabled status
   const [disabled, setDisabled] = useState({
      username: true,
      email: true,
      password: true,
      newPassword: true,
      verifyPassword: true
   });

   // Form setup with react-hook-form
   const {
      control,
      handleSubmit,
      reset,
      setError,
      formState: { isSubmitting, errors, dirtyFields }
   } = useForm<UserDetailUpdates>({
      defaultValues: settings || {}
   });

   // Check if the form has dirty fields to display the save button
   const isFormDirty = Object.keys(dirtyFields).length > 0;

   // Toggle field visibility
   const toggleFieldEditable = useCallback((fields: (keyof typeof disabled)[]) => {
      setDisabled(prev => {
         const updates = { ...prev };

         fields.forEach(field => {
            updates[field] = !prev[field];
         });

         return updates;
      });
   }, []);

   // Toggle password change fields visibility
   const togglePasswordFields = useCallback(() => {
      toggleFieldEditable(["password", "newPassword", "verifyPassword"]);
   }, [toggleFieldEditable]);

   // Handle logout requests
   const handleLogout = useCallback(async() => {
      await clearAuthentication(dispatch, navigate);
   }, [dispatch, navigate]);

   // Handles form submissions
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

         const response = await sendApiRequest<number>(
            "users", "PUT", updates, dispatch, navigate, setError
         );

         if (response === 204) {
            // Update Redux store with potential changes
            const changes: Partial<UserDetails> = {
               username: updates.username || settings.username,
               email: updates.email || settings.email
            };

            if (Object.keys(changes).length > 0) {
               dispatch(updateDetails(changes));
            }

            // Reset visibility of fields that were changed
            toggleFieldEditable(Object.keys(updates) as (keyof typeof disabled)[]);

            // Reset form
            reset({
               username: updates.username || undefined,
               email: updates.email || undefined
            });

            // Notify user of successful security-related updates
            dispatch(addNotification({
               message: `${Object.keys(updates).map((u) => u.charAt(0).toUpperCase() + u.slice(1)).join(", ")} updated successfully`,
               type: "success"
            }));
         }
      } catch (error) {
         console.error("Failed to update security settings:", error);
      }
   };

   return (
      <Paper
         elevation = { 3 }
         sx = { { p: 6, mt: 4 } }
      >
         <form onSubmit = { handleSubmit(onSubmit) }>
            <Stack
               direction = "column"
               spacing = { 1.5 }
               sx = { { textAlign: "center", justifyContent: "center", alignItems: "center" } }
            >
               <Box
                  alt = "Security"
                  component = "img"
                  src = "/svg/security.svg"
                  sx = { { height: 250, mb: 4 } }
               />
               <Controller
                  control = { control }
                  name = "username"
                  render = {
                     ({ field }) => (
                        <FormControl
                           disabled = { disabled.username }
                           error = { Boolean(errors.username) }
                           fullWidth = { true }
                        >
                           <InputLabel htmlFor = "username">
                              Username
                           </InputLabel>
                           <OutlinedInput
                              { ...field }
                              endAdornment = {
                                 <InputAdornment position = "end">
                                    <IconButton
                                       edge = "end"
                                       onClick = { () => toggleFieldEditable(["username"]) }
                                    >
                                       <FontAwesomeIcon icon = { faPenToSquare } />
                                    </IconButton>
                                 </InputAdornment>
                              }
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
                  name = "email"
                  render = {
                     ({ field }) => (
                        <FormControl
                           disabled = { disabled.email }
                           error = { Boolean(errors.email) }
                           fullWidth = { true }
                        >
                           <InputLabel htmlFor = "email">
                              Email
                           </InputLabel>
                           <OutlinedInput
                              { ...field }
                              endAdornment = {
                                 <InputAdornment position = "end">
                                    <IconButton
                                       edge = "end"
                                       onClick = { () => toggleFieldEditable(["email"]) }
                                    >
                                       <FontAwesomeIcon icon = { faPenToSquare } />
                                    </IconButton>
                                 </InputAdornment>
                              }
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
               <Controller
                  control = { control }
                  name = "password"
                  render = {
                     ({ field }) => (
                        <FormControl
                           disabled = { disabled.password }
                           error = { Boolean(errors.password) }
                           fullWidth = { true }
                        >
                           <InputLabel htmlFor = "password">
                              Password
                           </InputLabel>
                           <OutlinedInput
                              { ...field }
                              autoComplete = "current-password"
                              endAdornment = {
                                 <InputAdornment position = "end">
                                    <IconButton
                                       edge = "end"
                                       onClick = { togglePasswordFields }
                                    >
                                       <FontAwesomeIcon icon = { faPenToSquare } />
                                    </IconButton>
                                 </InputAdornment>
                              }
                              id = "password"
                              label = "Password"
                              type = "password"
                              value = { field.value || disabled.password ? "********" : "" }
                           />
                           <FormHelperText>
                              { errors.password?.message?.toString() }
                           </FormHelperText>
                        </FormControl>
                     )
                  }
               />
               <Fade
                  in = { !disabled.password }
                  mountOnEnter = { true }
                  style = { { transformOrigin: "center top" } }
                  timeout = { 250 }
                  unmountOnExit = { true }
               >
                  <Stack
                     direction = "column"
                     spacing = { 1.5 }
                     sx = { { width: "100%" } }
                  >
                     <Controller
                        control = { control }
                        name = "newPassword"
                        render = {
                           ({ field }) => (
                              <FormControl
                                 error = { Boolean(errors.newPassword) }
                                 fullWidth = { true }
                              >
                                 <InputLabel htmlFor = "newPassword">
                                    New Password
                                 </InputLabel>
                                 <OutlinedInput
                                    { ...field }
                                    autoComplete = "new-password"
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
                              <FormControl
                                 error = { Boolean(errors.verifyPassword) }
                                 fullWidth = { true }
                              >
                                 <InputLabel htmlFor = "verifyPassword">
                                    Verify Password
                                 </InputLabel>
                                 <OutlinedInput
                                    { ...field }
                                    autoComplete = "new-password"
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
               </Fade>
               <Fade
                  in = { isFormDirty }
                  mountOnEnter = { true }
                  style = { { transformOrigin: "center top" } }
                  timeout = { 250 }
                  unmountOnExit = { true }
               >
                  <Stack
                     direction = "row"
                     spacing = { 1.5 }
                     sx = { { width: "100%" } }
                  >
                     <Button
                        className = "btn-secondary"
                        color = "secondary"
                        fullWidth = { true }
                        loading = { isSubmitting }
                        onClick = { () => reset() }
                        startIcon = { <FontAwesomeIcon icon = { faRotateLeft } /> }
                        type = "button"
                        variant = "contained"
                     >
                        Reset
                     </Button>
                     <Button
                        className = "btn-primary"
                        color = "primary"
                        fullWidth = { true }
                        loading = { isSubmitting }
                        startIcon = { <FontAwesomeIcon icon = { faSave } /> }
                        type = "submit"
                        variant = "contained"
                     >
                        Save
                     </Button>
                  </Stack>
               </Fade>
               <Stack
                  direction = "column"
                  spacing = { 1 }
                  sx = { { width: "100%" } }
               >
                  <ExportAccount />
                  <Button
                     className = "btn-primary"
                     color = "warning"
                     fullWidth = { true }
                     onClick = { handleLogout }
                     startIcon = { <FontAwesomeIcon icon = { faRightFromBracket } /> }
                     variant = "contained"
                  >
                     Logout
                  </Button>
                  <DeleteAccount />
               </Stack>
            </Stack>
         </form>
      </Paper>
   );
}