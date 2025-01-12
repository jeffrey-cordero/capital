import { faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { userSchema } from "capital-types/user";
import { Box, Paper, Typography, TextField, Button, Link, FormControl } from "@mui/material";
import Grid from '@mui/material/Grid2';
import { useForm } from "react-hook-form";
import { z } from "zod";

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
      <Box>
      <Grid container justifyContent="center">
        <Grid size={{ xs:10, md:8, lg:6}}>
          <Paper elevation={3} sx={{ p: 4, mt: 5, borderTop: 5, borderTopColor: "primary.main" }} >
            <Box className = "image">
              <img
                src={`${SERVER_URL}/resources/auth/login.jpg`}
                alt="Login"
              />
              <Typography variant="subtitle1" fontWeight="bold">
                Please enter your credentials
              </Typography>
            </Box>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Box>
                <FormControl fullWidth>
                  <TextField
                     error={!!errors.username}
                     helperText={errors.username?.message?.toString()}
                     id="username"
                     label="Username"
                     type="username"
                     placeholder="username"
                     autoComplete="username"
                     autoFocus
                     required
                     variant="outlined"
                     color={!!errors.username ? 'error' : 'primary'}
                     {...register("username")} 
                  />
               </FormControl>
              </Box>
               <Box>
                  <FormControl fullWidth>
                     <TextField
                        error={!!errors.password}
                        helperText={errors.password?.message?.toString()}
                        id="password"
                        label="Password"
                        type="password"
                        placeholder="password"
                        autoComplete="current-password"
                        autoFocus
                        required
                        variant="outlined"
                        color={!!errors.password ? 'error' : 'primary'}
                        {...register("password")} 
                     />
               </FormControl>
              </Box>
              <Box>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<FontAwesomeIcon icon={faUnlockKeyhole} />}
                >
                  Login
                </Button>
              </Box>
            </form>
            <Typography variant="body2" align="center" sx={{ mt: 3 }}>
              Don&apos;t have an account?{" "}
              <Link href="/register" color="primary" fontWeight="bold">
                Sign Up
              </Link>
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
   );
}