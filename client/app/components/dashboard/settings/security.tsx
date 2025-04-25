import { faEye, faEyeSlash, faPenToSquare, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Collapse,
   FormControl,
   FormHelperText,
   InputLabel,
   OutlinedInput,
   Stack
} from "@mui/material";
import { updateUserSchema, type UserDetails, type UserUpdates } from "capital/user";
import { useCallback, useState } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import Section from "@/components/global/section";
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
   const settings = useSelector((state: RootState) => state.settings.value);
   const [disabled, setDisabled] = useState({ username: true, email: true, passwords: true });
   const [visible, setVisible] = useState({ password: false, newPassword: false, verifyPassword: false });

   // Form setup with react-hook-form
   const {
      control,
      handleSubmit,
      reset,
      setError,
      formState: { isSubmitting, errors, dirtyFields }
   } = useForm<UserUpdates>({
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
      // Reset the form
      reset({
         username: settings.username,
         email: settings.email,
         password: "",
         newPassword: "",
         verifyPassword: ""
      }, { keepDirty: false });

      // Reset the visibility of all fields
      resetVisibility();
   }, [reset, resetVisibility, settings.username, settings.email]);

   const togglePasswordVisibility = useCallback((field: keyof typeof visible) => {
      setVisible(prev => ({ ...prev, [field]: !prev[field] }));
   }, []);

   const toggleFieldEditable = useCallback((field: keyof typeof disabled) => {
      setDisabled(prev => ({ ...prev, [field]: !prev[field] }));
   }, []);

   // Handles form submissions
   const onSubmit = async(data: FieldValues) => {
      try {
         const fields = updateUserSchema.safeParse({
            ...data,
            password: data.password || undefined,
            newPassword: data.newPassword || undefined,
            verifyPassword: data.verifyPassword || undefined
         });

         if (!fields.success) {
            handleValidationErrors(fields, setError);
            return;
         }

         // Only send fields that were changed
         const updates = Object.keys(dirtyFields).reduce((acc: Partial<UserUpdates>, key) => {
            acc[key as keyof UserUpdates] = fields.data[key as keyof UserUpdates];
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
               email: updates.email || settings.email,
               password: undefined,
               newPassword: undefined,
               verifyPassword: undefined
            }, { keepDirty: false });

            // Reset visibility of all fields
            resetVisibility();
         }
      } catch (error) {
         console.error("Failed to update security settings:", error);
      }
   };

   return (
      <Section icon = { faShieldHalved }>
         <form onSubmit = { handleSubmit(onSubmit) }>
            <Stack
               direction = "column"
               spacing = { 1.5 }
               sx = { { mt: 3, width: "100%", textAlign: "center", alignItems: "center" } }
            >
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
                                       onClick = { () => toggleFieldEditable("username") }
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
                                       onClick = { () => toggleFieldEditable("email") }
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
                                       icon = { disabled.passwords ? faPenToSquare : visible.password ? faEye : faEyeSlash }
                                       onClick = { () => toggleFieldEditable("passwords") }
                                       style = { { cursor: "pointer" } }
                                    />
                                 ) : (
                                    <FontAwesomeIcon
                                       className = { visible.password ? undefined : "primary" }
                                       icon = { visible.password ? faEye : faEyeSlash }
                                       onClick = { () => togglePasswordVisibility("password") }
                                       style = { { cursor: "pointer" } }
                                    />
                                 )
                              }
                              id = "password"
                              label = "Password"
                              type = { visible.password ? "text" : "password" }
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
                                          className = { visible.newPassword ? undefined : "primary" }
                                          icon = { visible.newPassword ? faEye : faEyeSlash }
                                          onClick = { () => togglePasswordVisibility("newPassword") }
                                          style = { { cursor: "pointer" } }
                                       />
                                    }
                                    id = "newPassword"
                                    label = "New Password"
                                    type = { visible.newPassword ? "text" : "password" }
                                    value = { disabled.passwords ? "********" : field.value || "" }
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
                                          className = { visible.verifyPassword ? undefined : "primary" }
                                          icon = { visible.verifyPassword ? faEye : faEyeSlash }
                                          onClick = { () => togglePasswordVisibility("verifyPassword") }
                                          style = { { cursor: "pointer" } }
                                       />
                                    }
                                    id = "verifyPassword"
                                    label = "Verify Password"
                                    type = { visible.verifyPassword ? "text" : "password" }
                                    value = { disabled.passwords ? "********" : field.value || "" }
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
               <SubmitButton
                  isSubmitting = { isSubmitting }
                  onCancel = { onCancel }
                  type = "Update"
                  visible = { !disabled.username || !disabled.email || !disabled.passwords }
               />
            </Stack>
         </form>
      </Section>
   );
}