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
import { HTTP_STATUS } from "capital/server";
import { updateUserSchema, type UserUpdates } from "capital/user";
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
 * Manages security settings with password update functionality
 *
 * @returns {React.ReactNode} Form for updating username, email, and password
 */
export default function Security(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const settings = useSelector((state: RootState) => state.settings.value);
   const [visible, setVisible] = useState({ password: false, newPassword: false, verifyPassword: false });
   const [disabled, setDisabled] = useState({ username: true, email: true, passwords: true });

   // Form setup with react-hook-form
   const {
      control,
      handleSubmit,
      reset,
      setError,
      formState: { isSubmitting, errors, dirtyFields } } = useForm<UserUpdates>({
         defaultValues: settings || {}
      });

   // Disable all inputs
   const disableInputs = useCallback(() => {
      setDisabled({ username: true, email: true, passwords: true });
   }, [setDisabled]);

   // Reset the form and disable all inputs when form updates are cancelled
   const onCancel = useCallback(() => {
      reset({
         username: settings.username,
         email: settings.email,
         password: "",
         newPassword: "",
         verifyPassword: ""
      }, { keepDirty: false });
      disableInputs();
   }, [reset, disableInputs, settings.username, settings.email]);

   // Visible password and disabled field handlers
   const toggleVisiblePasswords = useCallback((field: keyof typeof visible) => {
      setVisible(prev => ({ ...prev, [field]: !prev[field] }));
   }, []);

   const toggleEditableFields = useCallback((field: keyof typeof disabled) => {
      setDisabled(prev => ({ ...prev, [field]: !prev[field] }));
   }, []);

   const onSubmit = async(data: FieldValues) => {
      try {
         // Ignore empty updates
         if (Object.keys(dirtyFields).length === 0) return;

         // Normalize the dirty fields from the current form
         const fields = updateUserSchema.safeParse({
            ...data,
            password: data.password || undefined,
            newPassword: data.newPassword || undefined,
            verifyPassword: data.verifyPassword || undefined
         });

         if (!fields.success) {
            // Invalid user security inputs
            handleValidationErrors(fields, setError);
            return;
         }

         // Format the updates for the API request
         const updates = Object.keys(dirtyFields).reduce((acc: Partial<UserUpdates>, key) => {
            acc[key as keyof UserUpdates] = fields.data[key as keyof UserUpdates];

            return acc;
         }, {});

         const response = await sendApiRequest<number>(
            "users", "PUT", updates, dispatch, navigate, setError
         );

         if (response === HTTP_STATUS.NO_CONTENT) {
            // Update Redux store with the provided changes
            dispatch(updateDetails({
               username: updates.username || settings.username,
               email: updates.email || settings.email
            }));

            // Reset the form and disable all inputs
            reset({
               username: updates.username || settings.username,
               email: updates.email || settings.email,
               password: undefined,
               newPassword: undefined,
               verifyPassword: undefined
            }, { keepDirty: false });
            disableInputs();
         }
      } catch (error) {
         console.error("Failed to update security settings:", error);
      }
   };

   return (
      <Section
         dataTestId = "security-section"
         icon = { faShieldHalved }
      >
         <form
            noValidate = { true }
            onSubmit = { handleSubmit(onSubmit) }
         >
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
                                       data-testid = "security-username-pen"
                                       icon = { faPenToSquare }
                                       onClick = { () => toggleEditableFields("username") }
                                       style = { { cursor: "pointer" } }
                                    />
                                 ) : undefined
                              }
                              id = "username"
                              inputProps = { { "data-testid": "security-username" } }
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
                                       data-testid = "security-email-pen"
                                       icon = { faPenToSquare }
                                       onClick = { () => toggleEditableFields("email") }
                                       style = { { cursor: "pointer" } }
                                    />
                                 ) : undefined
                              }
                              id = "email"
                              inputProps = { { "data-testid": "security-email" } }
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
                                       data-testid = "security-password-pen"
                                       icon = { disabled.passwords ? faPenToSquare : visible.password ? faEye : faEyeSlash }
                                       onClick = { () => toggleEditableFields("passwords") }
                                       style = { { cursor: "pointer" } }
                                    />
                                 ) : (
                                    <FontAwesomeIcon
                                       className = { visible.password ? "primary" : undefined }
                                       data-testid = "security-current-password-visibility"
                                       icon = { visible.password ? faEye : faEyeSlash }
                                       onClick = { () => toggleVisiblePasswords("password") }
                                       style = { { cursor: "pointer" } }
                                    />
                                 )
                              }
                              id = "password"
                              inputProps = { { "data-testid": "security-current-password" } }
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
                                          className = { visible.newPassword ? "primary" : undefined }
                                          data-testid = "security-new-password-visibility"
                                          icon = { visible.newPassword ? faEye : faEyeSlash }
                                          onClick = { () => toggleVisiblePasswords("newPassword") }
                                          style = { { cursor: "pointer" } }
                                       />
                                    }
                                    id = "newPassword"
                                    inputProps = { { "data-testid": "security-new-password" } }
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
                                          className = { visible.verifyPassword ? "primary" : undefined }
                                          data-testid = "security-verify-password-visibility"
                                          icon = { visible.verifyPassword ? faEye : faEyeSlash }
                                          onClick = { () => toggleVisiblePasswords("verifyPassword") }
                                          style = { { cursor: "pointer" } }
                                       />
                                    }
                                    id = "verifyPassword"
                                    inputProps = { { "data-testid": "security-verify-password" } }
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
                  dataTestId = "security"
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