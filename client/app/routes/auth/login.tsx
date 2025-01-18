import { faEye, faEyeSlash, faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormControl, FormHelperText, InputLabel, Link, OutlinedInput, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { userSchema } from "capital-types/user";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import Callout from "@/components/global/callout";
import Logo from "@/components/global/logo";
import { SERVER_URL } from "@/root";
import { useState } from "react";
import clsx from "clsx";

const loginSchema = z.object({
   username: userSchema.shape.username,
   password: userSchema.shape.password
});

export default function Login() {
   const {
      control,
      handleSubmit,
      setError,
      formState: { isSubmitting, errors }
   } = useForm({
      resolver: zodResolver(loginSchema)
   });
   const [showPassword, setShowPassword] = useState<boolean>(false);

   const onSubmit = async (data: any) => {
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
         } else {
            // Display server-side validation errors
            const { errors }: Record<string, string> = await response.json();

            Object.entries(errors).forEach(
               ([field, message]) => setError(field, { type: "server", message })
            );
         }
      } catch (error) {
         console.error(error);
      }
   };

   return (
      <div className="center">
         <Callout
            sx={{ width: "100%" }}
            type="primary"
         >
            <Stack
               direction="column"
               spacing={3}
            >
               <Grid
                  container
                  direction="column"
                  alignItems="center"
                  justifyContent="center"
               >
                  <Grid>
                     <Stack alignItems="center" justifyContent="center">
                        <Logo />
                        <Typography
                           variant="h4"
                           color="primary.main"
                           fontWeight="bolder"
                           marginBottom="5px"
                        >
                           Welcome Back
                        </Typography>
                        <Typography
                           variant="caption"
                           fontSize="16px"
                           textAlign="center"
                           color="text.secondary"
                        >
                           Enter your credentials to continue
                        </Typography>
                     </Stack>
                  </Grid>
               </Grid>
               <form onSubmit={handleSubmit(onSubmit)}>
                  <Stack
                     direction="column"
                     spacing={2}
                  >
                     <Controller
                        control={control}
                        name="username"
                        render={
                           ({ field }) => (
                              <FormControl error = { Boolean(errors.username) }>
                                 <InputLabel htmlFor="username">
                                    Username
                                 </InputLabel>
                                 <OutlinedInput
                                    { ...field }
                                    id = "username"
                                    label = "Username"
                                    value={field.value || ""}
                                    type = "text"
                                    autoComplete = "username"
                                    aria-label="Username"
                                    autoFocus = { true}
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
                        control={control}
                        name="password"
                        render={
                           ({ field }) => (
                              <FormControl error = { Boolean(errors.password) }>
                                 <InputLabel htmlFor="password">
                                    Password
                                 </InputLabel>
                                 <OutlinedInput
                                    { ...field }
                                    id = "password"
                                    label = "Password"
                                    value={field.value || ""}
                                    type = { showPassword ? "text" : "password" }
                                    autoComplete = "current-password"
                                    aria-label="Password"
                                    endAdornment = {
                                       <FontAwesomeIcon
                                          className={ clsx({ "primary": showPassword }) }
                                          cursor = "pointer"
                                          icon = { showPassword ? faEyeSlash : faEye }
                                          onClick = { () => setShowPassword(!showPassword) }
                                       />
                                    }
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
                        color="primary"
                        fullWidth={true}
                        loading={isSubmitting}
                        loadingPosition="start"
                        startIcon={<FontAwesomeIcon icon={faUnlockKeyhole} />}
                        type="submit"
                        variant="contained"
                     >
                        Login
                     </Button>
                  </Stack>
               </form>
               <Typography
                  align="center"
                  sx={{ fontWeight: "bold", margin: "0" }}
                  variant="body2"
               >
                  Don&apos;t have an account?{" "}
                  <Link
                     color="primary"
                     fontWeight="bold"
                     href="/register"
                     underline="none"
                  >
                     Register
                  </Link>
               </Typography>
            </Stack>
         </Callout>
      </div>
   );
}