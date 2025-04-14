import { faEye, faEyeSlash, faPenToSquare, faSave } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Collapse,
   FormControl,
   FormHelperText,
   InputLabel,
   OutlinedInput,
   Stack
} from "@mui/material";
import { type UserDetails, type UserDetailUpdates, userUpdateSchema } from "capital/user";
import { useCallback, useState } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import DeleteAccount from "@/components/dashboard/settings/delete";
import ExportAccount from "@/components/dashboard/settings/export";
import Logout from "@/components/dashboard/settings/logout";
import SubmitButton from "@/components/global/submit";
import { sendApiRequest } from "@/lib/api";
import { handleValidationErrors } from "@/lib/validation";
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
      // Determines if password fields are editable
      passwords: true,
      // True/false determines if input fields are password or text
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

   // Reset the visibility of all fields
   const resetVisibility = useCallback(() => {
      setDisabled(prev => {
         const updates = { ...prev };

         Object.keys(updates).forEach(key => {
            updates[key as keyof typeof disabled] = true;
         });

         return updates;
      });
   }, [setDisabled]);

   const onCancel = useCallback(() => {
      // Reset the form and visibility of fields
      reset();
      resetVisibility();
   }, [reset, resetVisibility]);

   const toggleFieldEditable = useCallback((fields: (keyof typeof disabled)[]) => {
      setDisabled(prev => {
         const updates = { ...prev };

         fields.forEach(field => {
            updates[field] = !prev[field];
         });

         return updates;
      });
   }, []);

   // Handles form submissions
   const onSubmit = async(data: FieldValues) => {
      try {
         const fields = userUpdateSchema.safeParse(data);

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

            // Update default values
            reset({
               username: updates.username || settings.username,
               email: updates.email || settings.email
            });

            // Reset visibility of all fields
            resetVisibility();
         }
      } catch (error) {
         console.error("Failed to update security settings:", error);
      }
   };

   return (
      <Box>
         <form onSubmit = { handleSubmit(onSubmit) }>
            <Stack
               direction = "column"
               spacing = { 1.5 }
               sx = { { width: "100%", textAlign: "center", alignItems: "center" } }
            >
               <Box
                  alt = "Security"
                  component = "img"
                  src = "/svg/security.svg"
                  sx = { { width: 280, mb: "-30px !important", px: 2 } }
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
                              autoComplete = "off"
                              endAdornment = {
                                 disabled.username ? (
                                    <FontAwesomeIcon
                                       className = "primary"
                                       icon = { faPenToSquare }
                                       onClick = { () => toggleFieldEditable(["username"]) }
                                       style = { { cursor: "pointer" } }
                                    />
                                 ) : undefined
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
                              autoComplete = "off"
                              endAdornment = {
                                 disabled.email ? (
                                    <FontAwesomeIcon
                                       className = "primary"
                                       icon = { faPenToSquare }
                                       onClick = { () => toggleFieldEditable(["email"]) }
                                       style = { { cursor: "pointer" } }
                                    />
                                 ) : undefined
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
                           disabled = { disabled.passwords }
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
                                 disabled.passwords ? (
                                    <FontAwesomeIcon
                                       className = "primary"
                                       icon = { disabled.passwords ? faPenToSquare : disabled.password ? faEye : faEyeSlash }
                                       onClick = { () => toggleFieldEditable(["passwords"]) }
                                       style = { { cursor: "pointer" } }
                                    />
                                 ) : (
                                    <FontAwesomeIcon
                                       className = { disabled.password ? undefined : "primary" }
                                       icon = { disabled.password ? faEye : faEyeSlash }
                                       onClick = { () => toggleFieldEditable(["password"]) }
                                       style = { { cursor: "pointer" } }
                                    />
                                 )
                              }
                              id = "password"
                              label = "Password"
                              type = { disabled.password ? "password" : "text" }
                              value = { disabled.passwords ? "********" : field.value || "" }
                           />
                           <FormHelperText>
                              { errors.password?.message?.toString() }
                           </FormHelperText>
                        </FormControl>
                     )
                  }
               />
               <Collapse
                  in = { !disabled.passwords }
                  mountOnEnter = { true }
                  style = { { transformOrigin: "center top" } }
                  sx = { { width: "100%" } }
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
                                    endAdornment = {
                                       <FontAwesomeIcon
                                          className = { disabled.newPassword ? undefined : "primary" }
                                          icon = { disabled.newPassword ? faEye : faEyeSlash }
                                          onClick = { () => toggleFieldEditable(["newPassword"]) }
                                          style = { { cursor: "pointer" } }
                                       />
                                    }
                                    id = "newPassword"
                                    label = "New Password"
                                    type = { disabled.newPassword ? "password" : "text" }
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
                                    endAdornment = {
                                       <FontAwesomeIcon
                                          className = { disabled.verifyPassword ? undefined : "primary" }
                                          icon = { disabled.verifyPassword ? faEye : faEyeSlash }
                                          onClick = { () => toggleFieldEditable(["verifyPassword"]) }
                                          style = { { cursor: "pointer" } }
                                       />
                                    }
                                    id = "verifyPassword"
                                    label = "Verify Password"
                                    type = { disabled.verifyPassword ? "password" : "text" }
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
               </Collapse>
               <Stack
                  direction = "column"
                  spacing = { 1 }
                  sx = { { width: "100%" } }
               >
                  <SubmitButton
                     icon = { faSave }
                     isSubmitting = { isSubmitting }
                     onCancel = { onCancel }
                     type = "Update"
                     visible = { !disabled.username || !disabled.email || !disabled.passwords }
                  />
                  <ExportAccount />
                  <Logout />
                  <DeleteAccount />
               </Stack>
            </Stack>
         </form>
      </Box>
   );
}