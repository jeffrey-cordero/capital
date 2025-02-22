import { faEye, faEyeSlash, faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Button, FormControl, FormHelperText, InputLabel, Link, OutlinedInput, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useQueryClient } from "@tanstack/react-query";
import { userSchema } from "capital-types/user";
import clsx from "clsx";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { z } from "zod";

import Callout from "@/components/global/callout";
import { sendApiRequest } from "@/lib/server";

const loginSchema = z.object({
   username: userSchema.shape.username,
   password: userSchema.shape.password
});

export default function Login() {
   const dispatch = useDispatch();
   const queryClient = useQueryClient();

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

      const response = await sendApiRequest("authentication/login", "POST", credentials, dispatch, setError);

      if (response?.status === "Success") {
         queryClient.invalidateQueries({ queryKey: ["authentication"] });
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
                           Welcome Back
                        </Typography>
                        <Typography
                           color = "text.secondary"
                           sx = { { fontSize: "16px", textAlign: "center" } }
                           variant = "subtitle2"
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
                                    autoComplete = "current-password"
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
                     <Button
                        className = "btn-primary"
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
                  sx = { { fontWeight: "bold" } }
                  variant = "body2"
               >
                  Don&apos;t have an account?{ " " }
                  <Link
                     className = "success"
                     color = "success"
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