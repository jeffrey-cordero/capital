import { faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Button, FormControl, Link, Paper, Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { userSchema } from "capital-types/user";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Callout from "@/components/global/callout";

import { SERVER_URL } from "@/root";

const loginSchema = z.object({
   username: userSchema.shape.username,
   password: userSchema.shape.password
});

export default function Login() {
   const {
      register,
      handleSubmit,
      setError,
      formState: { errors }
   } = useForm({
      resolver: zodResolver(loginSchema)
   });

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
      <Callout type="primary" sx={{ pt: 4 }}>
         <Stack
            direction="column"
            spacing={3}
         >
            <Box className="image">
               <img
                  alt="Login"
                  src={`${SERVER_URL}/resources/auth/login.jpg`}
               />
               <Typography
                  fontWeight="bold"
                  variant="body2"
               >
                  Please enter your credentials
               </Typography>
            </Box>
            <form onSubmit={handleSubmit(onSubmit)}>
               <Stack direction="column" spacing={2}>
                  <Box>
                     <FormControl fullWidth={true}>
                        <TextField
                           autoComplete="username"
                           autoFocus={true}
                           color={errors.username ? "error" : "primary"}
                           error={!!errors.username}
                           helperText={errors.username?.message?.toString()}
                           id="username"
                           label="Username"
                           placeholder="username"
                           required={true}
                           type="username"
                           variant="outlined"
                           {...register("username")}
                        />
                     </FormControl>
                  </Box>
                  <Box>
                     <FormControl fullWidth={true}>
                        <TextField
                           autoComplete="current-password"
                           autoFocus={true}
                           color={errors.password ? "error" : "primary"}
                           error={!!errors.password}
                           helperText={errors.password?.message?.toString()}
                           id="password"
                           label="Password"
                           placeholder="password"
                           required={true}
                           type="password"
                           variant="outlined"
                           {...register("password")}
                        />
                     </FormControl>
                  </Box>
                  <Box>
                     <Button
                        color="primary"
                        fullWidth={true}
                        startIcon={<FontAwesomeIcon icon={faUnlockKeyhole} />}
                        type="submit"
                        variant="contained"
                     >
                        Login
                     </Button>
                  </Box>
               </Stack>
               
            </form>
            <Typography
               align="center"
               sx={{ mt: 3 }}
               variant="body2"
            >
               Don&apos;t have an account?{" "}
               <Link
                  color="primary"
                  fontWeight="bold"
                  href="/register"
               >
                  Sign Up
               </Link>
            </Typography>
         </Stack>

      </Callout>
   );
}