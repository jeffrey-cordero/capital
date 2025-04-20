import { faEye, faEyeSlash, faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
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
   Typography
} from "@mui/material";
import { userSchema } from "capital/user";
import clsx from "clsx";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { z } from "zod";

import Callout from "@/components/global/callout";
import { sendApiRequest } from "@/lib/api";
import { handleValidationErrors } from "@/lib/validation";

/**
 * The login schema to only include the username and password fields.
 */
const loginSchema = z.object({
   username: userSchema.innerType().shape.username,
   password: userSchema.innerType().shape.password
});

/**
 * The login page component.
 *
 * @returns {React.ReactNode} The login page component
 */
export default function Login(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const {
      control,
      handleSubmit,
      setError,
      formState: { isSubmitting, errors }
   } = useForm();
   const [showPassword, setShowPassword] = useState<boolean>(false);

   const onSubmit = async(data: any) => {
      const fields = loginSchema.safeParse(data);

      if (!fields.success) {
         // Invalid credential inputs
         handleValidationErrors(fields, setError);
      } else {
         // Submit the credentials for authentication
         const credentials = {
            username: fields.data.username,
            password: fields.data.password
         };

         const result = await sendApiRequest<{ success: boolean }>(
            "authentication/login", "POST", credentials, dispatch, navigate, setError
         );

         if (typeof result === "object" && result?.success) {
            navigate("/dashboard");
         }
      }
   };

   return (
      <Container className = "center">
         <Callout
            sx = { { width: "100%" } }
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
                     Login
                  </Typography>
               </Stack>
               <form onSubmit = { handleSubmit(onSubmit) }>
                  <Stack
                     direction = "column"
                     spacing = { 1.5 }
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
                                    autoComplete = "username"
                                    autoFocus = { true }
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
                           fontWeight = "bold"
                           id = "register"
                           onClick = { () => navigate("/register") }
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