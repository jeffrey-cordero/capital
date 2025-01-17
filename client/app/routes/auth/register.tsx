import { faIdCard } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Button, FormControl, Link, Stack, TextField, Typography } from "@mui/material";
import { userSchema } from "capital-types/user";
import { useForm } from "react-hook-form";

import Callout from "@/components/global/callout";
import { SERVER_URL } from "@/root";

const registrationSchema = userSchema.extend({
   verifyPassword: userSchema.shape.password
});

export default function Register() {
   const {
      register,
      handleSubmit,
      setError,
      formState: { isSubmitting, errors }
   } = useForm({
      resolver: zodResolver(registrationSchema)
   });

   const onSubmit = async(data: any) => {
      const registration = {
         username: data.username.trim(),
         name: data.name.trim(),
         password: data.password.trim(),
         verifyPassword: data.verifyPassword.trim(),
         email: data.email.trim()
      };

      try {
         const response = await fetch(`${SERVER_URL}/users`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json"
            },
            body: JSON.stringify(registration),
            credentials: "include"
         });

         const parsed = await response.json();

         if (response.ok) {
            setTimeout(() => {
               document.getElementById("register")?.click();
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
         sx = { { pb: 2 } }
         type = "primary"
      >
         <Stack
            direction = "column"
            spacing = { 3 }
         >
            <Box className = "image">
               <img
                  alt = "Login"
                  src = { `${SERVER_URL}/resources/auth/register.jpg` }
               />
            </Box>
            <form onSubmit = { handleSubmit(onSubmit) }>
               <Stack
                  direction = "column"
                  marginTop = { 2 }
                  spacing = { 2 }
               >
                  <Box>
                     <FormControl fullWidth = { true }>
                        <TextField
                           autoComplete = "name"
                           autoFocus = { true }
                           color = { errors.name ? "error" : "primary" }
                           error = { !!errors.name }
                           helperText = { errors.name?.message?.toString() }
                           id = "name"
                           label = "Name"
                           placeholder = "Name"
                           required = { true }
                           type = "text"
                           variant = "outlined"
                           { ...register("name") }
                        />
                     </FormControl>
                  </Box>
                  <Box>
                     <FormControl fullWidth = { true }>
                        <TextField
                           autoComplete = "none"
                           color = { errors.username ? "error" : "primary" }
                           error = { !!errors.username }
                           helperText = { errors.username?.message?.toString() }
                           id = "username"
                           label = "Username"
                           placeholder = "Username"
                           required = { true }
                           type = "text"
                           variant = "outlined"
                           { ...register("username") }
                        />
                     </FormControl>
                  </Box>
                  <Box>
                     <FormControl fullWidth = { true }>
                        <TextField
                           autoComplete = "new-password"
                           color = { errors.password ? "error" : "primary" }
                           error = { !!errors.password }
                           helperText = { errors.password?.message?.toString() }
                           id = "password"
                           label = "Password"
                           placeholder = "Password"
                           required = { true }
                           type = "password"
                           variant = "outlined"
                           { ...register("password") }
                        />
                     </FormControl>
                  </Box>
                  <Box>
                     <FormControl fullWidth = { true }>
                        <TextField
                           autoComplete = "new-password"
                           color = { errors.password ? "error" : "primary" }
                           error = { !!errors.password }
                           helperText = { errors.password?.message?.toString() }
                           id = "verifyPassword"
                           label = "Verify Password"
                           placeholder = "Verify Password"
                           required = { true }
                           type = "password"
                           variant = "outlined"
                           { ...register("verifyPassword") }
                        />
                     </FormControl>
                  </Box>
                  <Box>
                     <FormControl fullWidth = { true }>
                        <TextField
                           autoComplete = "email"
                           color = { errors.email ? "error" : "primary" }
                           error = { !!errors.email }
                           helperText = { errors.email?.message?.toString() }
                           id = "email"
                           label = "Email"
                           placeholder = "Email"
                           required = { true }
                           type = "email"
                           variant = "outlined"
                           { ...register("email") }
                        />
                     </FormControl>
                  </Box>
                  <Box>
                     <Button
                        color = "primary"
                        fullWidth = { true }
                        loading = { isSubmitting }
                        loadingPosition = "start"
                        startIcon = { <FontAwesomeIcon icon = { faIdCard } /> }
                        type = "submit"
                        variant = "contained"
                     >
                        Register
                     </Button>
                  </Box>
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
                  Log In
               </Link>
            </Typography>
         </Stack>
      </Callout>
   );
}