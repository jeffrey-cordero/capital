import { faEye, faEyeSlash, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Button, FormControl, FormHelperText, InputLabel, Link, OutlinedInput, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { userSchema } from "capital-types/user";
import clsx from "clsx";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";

import Callout from "@/components/global/callout";
import { sendApiRequest } from "@/lib/server";
import { addNotification } from "@/redux/slices/notifications";
import { useQueryClient } from "@tanstack/react-query";

const registrationSchema = userSchema.extend({
   verifyPassword: userSchema.shape.password
});

export default function Register() {
   const dispatch = useDispatch();
   const queryClient = useQueryClient();
   const {
      control,
      handleSubmit,
      setError,
      formState: { isSubmitting, errors }
   } = useForm({
      resolver: zodResolver(registrationSchema)
   });
   const [showPassword, setShowPassword] = useState<boolean>(false);
   const [showVerifyPassword, setShowVerifyPassword] = useState<boolean>(false);

   const onSubmit = async(data: any) => {
      const registration = {
         username: data.username.trim(),
         name: data.name.trim(),
         password: data.password.trim(),
         verifyPassword: data.verifyPassword.trim(),
         email: data.email.trim()
      };

      const response = await sendApiRequest("users", "POST", registration, dispatch, setError);

      if (response?.status === "Success") {
         queryClient.setQueryData(["authentication"], true);

         dispatch(addNotification({
            type: "success",
            message: "Successfully registered!"
         }));

         setTimeout(() => window.location.reload(), 2500);
      }
   };

   return (
      <div className = "center">
         <Callout
            sx = { { width: "100%", my: 12 } }
            type = "primary"
         >
            <Stack
               direction = "column"
               spacing = { 3 }
            >
               <Grid
                  container = { true }
                  direction = "column"
                  sx = { { justifyContent: "center", alignItems: "center" } }
               >
                  <Grid>
                     <Stack
                        alignItems = "center"
                        justifyContent = "center"
                     >
                        <Box
                           alt = "Logo"
                           component = "img"
                           src = "/svg/logo.svg"
                           sx = { { width: 150, height: "auto", p: 0, m: 0 } }
                        />
                        <Typography
                           color = "primary.main"
                           sx = { { fontWeight: "bold", marginBottom: "2px" } }
                           variant = "h4"
                        >
                           Join Us
                        </Typography>
                        <Typography
                           color = "text.secondary"
                           sx = { { fontSize: "16px", textAlign: "center" } }
                           variant = "subtitle2"
                        >
                           Enter your details to create an account and get started
                        </Typography>
                     </Stack>
                  </Grid>
               </Grid>
               <form onSubmit = { handleSubmit(onSubmit) }>
                  <Stack
                     direction = "column"
                     spacing = { 2 }
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
                                    autoComplete = "name"
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
                        name = "username"
                        render = {
                           ({ field }) => (
                              <FormControl error = { Boolean(errors.username) }>
                                 <InputLabel htmlFor = "username">
                                    Username
                                 </InputLabel>
                                 <OutlinedInput
                                    { ...field }
                                    aria-label = "Username"
                                    autoComplete = "none"
                                    disabled = { isSubmitting }
                                    id = "username"
                                    label = "Username"
                                    type = "text"
                                    value = { field.value || "" }
                                 />
                                 {
                                    errors.username && (
                                       <FormHelperText>
                                          { errors.username?.message?.toString() }
                                       </FormHelperText>
                                    )
                                 }
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
                                    aria-label = "Password"
                                    autoComplete = "new-password"
                                    disabled = { isSubmitting }
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
                                 {
                                    errors.password && (
                                       <FormHelperText>
                                          { errors.password?.message?.toString() }
                                       </FormHelperText>
                                    )
                                 }
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
                                    aria-label = "Verify Password"
                                    autoComplete = "new-password"
                                    disabled = { isSubmitting }
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
                                 {
                                    errors.verifyPassword && (
                                       <FormHelperText>
                                          { errors.verifyPassword?.message?.toString() }
                                       </FormHelperText>
                                    )
                                 }
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
                                    aria-label = "Email"
                                    autoComplete = "email"
                                    disabled = { isSubmitting }
                                    id = "email"
                                    label = "Email"
                                    type = "email"
                                    value = { field.value || "" }
                                 />
                                 {
                                    errors.email && (
                                       <FormHelperText>
                                          { errors.email?.message?.toString() }
                                       </FormHelperText>
                                    )
                                 }
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
                  </Stack>
               </form>
               <Typography
                  align = "center"
                  sx = { { fontWeight: "bold" } }
                  variant = "body2"
               >
                  Already have an account?{ " " }
                  <Link
                     color = "primary"
                     fontWeight = "bold"
                     href = "/login"
                     underline = "none"
                  >
                     Login
                  </Link>
               </Typography>
            </Stack>
         </Callout>
      </div>
   );
}