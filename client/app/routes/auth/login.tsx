import { faEye, faEyeSlash, faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormControl, FormHelperText, InputLabel, Link, OutlinedInput, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { userSchema } from "capital-types/user";
import clsx from "clsx";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { z } from "zod";

import Callout from "@/components/global/callout";
import Logo from "@/components/global/logo";
import { addNotification } from "@/redux/slices/notifications";
import { SERVER_URL } from "@/root";

const loginSchema = z.object({
   username: userSchema.shape.username,
   password: userSchema.shape.password
});

export default function Login() {
   const dispatch = useDispatch();

   const {
      control,
      handleSubmit,
      setError,
      formState: { isSubmitting, errors }
   } = useForm({
      resolver: zodResolver(loginSchema)
   });
   const [showPassword, setShowPassword] = useState<boolean>(false);

   const onSubmit = async(data: any) => {
      const credentials = {
         username: data.username.trim(),
         password: data.password.trim()
      };

      try {
         const response = await fetch(`${SERVER_URL}/auth/login`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json"
            },
            body: JSON.stringify(credentials),
            credentials: "include"
         });

         if (response.ok) {
            setTimeout(() => {
               window.location.reload();
            }, 500);
         } else if (response.status >= 500) {
            // Handle logging server-side errors
            const error: string = (await response.json())?.errors?.system?.toString();

            throw new Error(`${response.statusText}${error ? `: ${error}` : ""}`);
         } else {
            // Display server-side validation errors
            const { errors }: Record<string, string> = await response.json();

            Object.entries(errors).forEach(
               ([field, message]) => setError(field, { type: "server", message })
            );
         }
      } catch (error: any) {
         console.error(error);

         dispatch(addNotification({
            type: "error",
            message: error?.message || "An error occurred"
         }));
      }
   };

   return (
      <div className = "center">
         <Callout
            sx = { { width: "100%" } }
            type = "primary"
         >
            <Stack
               direction = "column"
               spacing = { 3 }
            >
               <Grid
                  alignItems = "center"
                  container = { true }
                  direction = "column"
                  justifyContent = "center"
               >
                  <Grid>
                     <Stack
                        alignItems = "center"
                        justifyContent = "center"
                     >
                        <Logo />
                        <Typography
                           color = "primary.main"
                           fontWeight = "bolder"
                           marginBottom = "5px"
                           variant = "h4"
                        >
                           Welcome Back
                        </Typography>
                        <Typography
                           color = "text.secondary"
                           fontSize = "16px"
                           textAlign = "center"
                           variant = "caption"
                        >
                           Enter your credentials to continue
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
                                    autoComplete = "username"
                                    autoFocus = { true }
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
                                    autoComplete = "current-password"
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
                     <Button
                        color = "primary"
                        fullWidth = { true }
                        loading = { isSubmitting }
                        loadingPosition = "start"
                        startIcon = { <FontAwesomeIcon icon = { faUnlockKeyhole } /> }
                        type = "submit"
                        variant = "contained"
                     >
                        Login
                     </Button>
                  </Stack>
               </form>
               <Typography
                  align = "center"
                  sx = { { fontWeight: "bold", margin: "0" } }
                  variant = "body2"
               >
                  Don&apos;t have an account?{ " " }
                  <Link
                     color = "primary"
                     fontWeight = "bold"
                     href = "/register"
                     underline = "none"
                  >
                     Register
                  </Link>
               </Typography>
            </Stack>
         </Callout>
      </div>
   );
}