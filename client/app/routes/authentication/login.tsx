import { faEye, faEyeSlash, faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
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
   Typography
} from "@mui/material";
import { loginSchema } from "capital/user";
import clsx from "clsx";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { z } from "zod";

import Callout from "@/components/global/callout";
import { sendApiRequest } from "@/lib/api";

/**
 * Login page component with form validation and authentication
 *
 * @returns {React.ReactNode} The login page component
 */
export default function Login(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { control, handleSubmit, setError, formState: { isSubmitting, errors } } = useForm<z.infer<typeof loginSchema>>({
      resolver: zodResolver(loginSchema),
      mode: "onBlur",
      defaultValues: {
         username: "",
         password: ""
      }
   });
   const [showPassword, setShowPassword] = useState<boolean>(false);

   const onSubmit = async(data: z.infer<typeof loginSchema>) => {
      const result = await sendApiRequest<{ success: boolean }>(
         "authentication/login", "POST", data, dispatch, navigate, setError
      );

      if (typeof result === "object" && result?.success) {
         navigate("/dashboard");
      }
   };

   return (
      <Container
         className = "center"
      >
         <Callout
            sx = { { width: "100%" } }
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
                     Login
                  </Typography>
               </Stack>
               <form
                  aria-label = "Login Form"
                  onSubmit = { handleSubmit(onSubmit) }
               >
                  <Stack
                     direction = "column"
                     spacing = { 1.5 }
                  >
                     <Controller
                        control = { control }
                        name = "username"
                        render = {
                           ({ field }) => (
                              <FormControl
                                 error = { Boolean(errors.username) }
                              >
                                 <InputLabel htmlFor = "username">
                                    Username
                                 </InputLabel>
                                 <OutlinedInput
                                    { ...field }
                                    autoComplete = "username"
                                    autoFocus = { true }
                                    id = "username"
                                    inputProps = { { "data-testid": "username" } }
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
                              <FormControl
                                 error = { Boolean(errors.password) }
                              >
                                 <InputLabel htmlFor = "password">
                                    Password
                                 </InputLabel>
                                 <OutlinedInput
                                    { ...field }
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
                                    inputProps = { { "data-testid": "password" } }
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
                     <Button
                        className = "btn-primary"
                        color = "primary"
                        data-testid = "submit-button"
                        fullWidth = { true }
                        loading = { isSubmitting }
                        loadingPosition = "start"
                        startIcon = { <FontAwesomeIcon icon = { faUnlockKeyhole } /> }
                        type = "submit"
                        variant = "contained"
                     >
                        Login
                     </Button>
                     <Typography
                        align = "center"
                        fontWeight = "bold"
                        variant = "body2"
                     >
                        Don&apos;t have an account?{ " " }
                        <Link
                           color = "primary"
                           data-testid = "register-link"
                           fontWeight = "bold"
                           id = "register-link"
                           onClick = { () => navigate("/register") }
                           role = "link"
                           underline = "none"
                        >
                           Register
                        </Link>
                     </Typography>
                  </Stack>
               </form>
            </Stack>
         </Callout>
      </Container>
   );
};