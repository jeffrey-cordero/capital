import { faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Button, FormControl, FormHelperText, InputLabel, Link, OutlinedInput, Stack, TextField, Typography } from "@mui/material";
import { userSchema } from "capital-types/user";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import Callout from "@/components/global/callout";
import Password from "@/components/global/password";
import { SERVER_URL } from "@/root";

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

         const parsed = await response.json();

         if (response.ok) {
            setTimeout(() => {
               window.location.reload();
            }, 500);
         } else {
            // Display server-side validation errors
            const { errors }: Record<string, string> = parsed;

            Object.entries(errors).forEach(
               ([field, message]) => setError(field, { type: "server", message })
            );
         }
      } catch (error) {
         console.error(error);
      }
   };

   return (
      <Callout
         sx = { { pt: 4 } }
         type = "primary"
      >
         <Stack
            direction = "column"
            spacing = { 3 }
         >
            <Box className = "image">
               <img
                  alt = "Login"
                  src = { `${SERVER_URL}/resources/auth/login.jpg` }
               />
            </Box>
            <form onSubmit = { handleSubmit(onSubmit) }>
               <Stack
                  direction = "column"
                  marginTop = { 2 }
                  spacing = { 2 }
               >
                  <Controller
                     control = { control }
                     name = "username"
                     render = {
                        ({ field }) => (
                           <FormControl error = { Boolean(errors.username) }>
                              <InputLabel>Username</InputLabel>
                              <OutlinedInput
                                 { ...field }
                                 label = "Username"
                                 type = "username"
                              />
                              { errors.username ? <FormHelperText>{ errors.username?.message?.toString() }</FormHelperText> : null }
                           </FormControl>
                        )
                     }
                  />
                  <Controller
                     control = { control }
                     name = "password"
                     render = {
                        ({ field }) => (
                           <Password
                              errors = { errors }
                              field = { field }
                           />
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
               sx = { { fontWeight: "bold" } }
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
   );
}