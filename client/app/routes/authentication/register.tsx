import { faEye, faEyeSlash, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   Container,
   FormControl,
   FormHelperText,
   InputLabel,
   Link,
   OutlinedInput,
   Stack,
   TextField,
   Typography,
   useTheme
} from "@mui/material";
import { userSchema } from "capital/user";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Callout from "@/components/global/callout";
import { sendApiRequest } from "@/lib/api";
import { getDateRange } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { authenticate } from "@/redux/slices/authentication";
import { addNotification } from "@/redux/slices/notifications";

/**
 * The registration page component.
 *
 * @returns {React.ReactNode} The registration page component
 */
export default function Register(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate(), theme = useTheme();
   const {
      control,
      handleSubmit,
      setError,
      formState: { isSubmitting, errors }
   } = useForm();
   const [showPassword, setShowPassword] = useState<boolean>(false);
   const [showVerifyPassword, setShowVerifyPassword] = useState<boolean>(false);

   // Setup minimum and maximum dates for birthday input
   const [minDate, maxDate] = useMemo(() => getDateRange(), []);

   const onSubmit = async(data: any) => {
      const fields = userSchema.safeParse(data);

      if (!fields.success) {
         // Invalid credential inputs
         handleValidationErrors(fields, setError);
      } else {
         // Submit the credentials for registration
         const registration = {
            username: fields.data.username,
            name: fields.data.name,
            password: fields.data.password,
            verifyPassword: fields.data.verifyPassword,
            email: fields.data.email,
            birthday: fields.data.birthday
         };

         const result = await sendApiRequest<{ success: boolean }>(
            "users", "POST", registration, dispatch, navigate, setError
         );

         if (typeof result === "object" && result?.success) {
            // Display a success notification
            dispatch(addNotification({
               type: "success",
               message: "Welcome"
            }));

            // Re-sync authentication state for auto-redirection
            dispatch(authenticate(true));
         }
      }
   };

   return (
      <Container className = "center">
         <Callout
            sx = { { width: "100%", my: 12 } }
            type = "primary"
         >
            <Stack
               direction = "column"
               spacing = { 3 }
            >
               <Stack
                  alignItems = "center"
                  justifyContent = "center"
               >
                  <Box
                     alt = "Logo"
                     component = "img"
                     src = "/svg/logo.svg"
                     sx = { { width: 175, height: "auto", p: 0, m: 0 } }
                  />
                  <Typography
                     color = "primary"
                     fontWeight = "bold"
                     sx = { { mt: -1 } }
                     variant = "h3"
                  >
                     Register
                  </Typography>
               </Stack>
               <form onSubmit = { handleSubmit(onSubmit) }>
                  <Stack
                     direction = "column"
                     spacing = { 1.5 }
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
                                    autoComplete = "name"
                                    autoFocus = { true }
                                    id = "name"
                                    label = "Name"
                                    type = "text"
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
                        name = "birthday"
                        render = {
                           ({ field }) => (
                              <FormControl error = { Boolean(errors.birthday) }>
                                 <InputLabel
                                    htmlFor = "birthday"
                                    shrink = { true }
                                 >
                                    Birthday
                                 </InputLabel>
                                 <TextField
                                    { ...field }
                                    error = { Boolean(errors.birthday) }
                                    id = "birthday"
                                    label = "Birthday"
                                    slotProps = {
                                       {
                                          htmlInput: {
                                             min: minDate,
                                             max: maxDate
                                          },
                                          inputLabel: {
                                             shrink: true
                                          }
                                       }
                                    }
                                    sx = {
                                       {
                                          colorScheme: theme.palette.mode === "dark" ? "dark" : "inherit"
                                       }
                                    }
                                    type = "date"
                                    value = { field.value || "" }
                                 />
                                 <FormHelperText>
                                    { errors.birthday?.message?.toString() }
                                 </FormHelperText>
                              </FormControl>
                           )
                        }
                     />
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
                                    autoComplete = "none"
                                    id = "username"
                                    label = "Username"
                                    type = "text"
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
                        name = "password"
                        render = {
                           ({ field }) => (
                              <FormControl error = { Boolean(errors.password) }>
                                 <InputLabel htmlFor = "password">
                                    Password
                                 </InputLabel>
                                 <OutlinedInput
                                    { ...field }
                                    autoComplete = "new-password"
                                    endAdornment = {
                                       <FontAwesomeIcon
                                          className = { clsx({ "primary": showPassword }) }
                                          cursor = "pointer"
                                          icon = { showPassword ? faEyeSlash : faEye }
                                          onClick = { () => setShowPassword(!showPassword) }
                                       />
                                    }
                                    id = "password"
                                    label = "Password"
                                    type = { showPassword ? "text" : "password" }
                                    value = { field.value || "" }
                                 />
                                 <FormHelperText>
                                    { errors.password?.message?.toString() }
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
                                    autoComplete = "new-password"
                                    endAdornment = {
                                       <FontAwesomeIcon
                                          className = { clsx({ "primary": showVerifyPassword }) }
                                          cursor = "pointer"
                                          icon = { showVerifyPassword ? faEyeSlash : faEye }
                                          onClick = { () => setShowVerifyPassword(!showVerifyPassword) }
                                       />
                                    }
                                    id = "verifyPassword"
                                    label = "Verify Password"
                                    type = { showVerifyPassword ? "text" : "password" }
                                    value = { field.value || "" }
                                 />
                                 <FormHelperText>
                                    { errors.verifyPassword?.message?.toString() }
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
                                    autoComplete = "email"
                                    id = "email"
                                    label = "email"
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
                     <Button
                        className = "btn-primary"
                        color = "primary"
                        fullWidth = { true }
                        loading = { isSubmitting }
                        loadingPosition = "start"
                        startIcon = { <FontAwesomeIcon icon = { faUserPlus } /> }
                        type = "submit"
                        variant = "contained"
                     >
                        Register
                     </Button>
                     <Typography
                        align = "center"
                        fontWeight = "bold"
                        variant = "body2"
                     >
                        Already have an account?{ " " }
                        <Link
                           color = "primary"
                           fontWeight = "bold"
                           onClick = { () => navigate("/login") }
                           underline = "none"
                        >
                           Login
                        </Link>
                     </Typography>
                  </Stack>
               </form>
            </Stack>
         </Callout>
      </Container>
   );
}