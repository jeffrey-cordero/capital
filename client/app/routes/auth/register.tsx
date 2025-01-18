import { faEye, faEyeSlash, faIdCard, faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
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

const registrationSchema = userSchema.extend({
   verifyPassword: userSchema.shape.password
});

export default function Register() {
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

   const onSubmit = async (data: any) => {
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

         if (response.ok) {
            setTimeout(() => {
               document.getElementById("register")?.click();
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
                           Join Us Today
                        </Typography>
                        <Typography
                           variant="caption"
                           fontSize="16px"
                           textAlign="center"
                           color="text.secondary"
                        >
                           Enter your details to create an account and get started
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
                        name="name"
                        render={
                           ({ field }) => (
                              <FormControl error={Boolean(errors.name)}>
                                 <InputLabel htmlFor="name">
                                    Name
                                 </InputLabel>
                                 <OutlinedInput
                                    {...field}
                                    id="name"
                                    label="Name"
                                    value={field.value || ""}
                                    type="text"
                                    autoComplete="name"
                                    aria-label="Name"
                                    autoFocus={true}
                                 />
                                 {
                                    errors.name && (
                                       <FormHelperText>
                                          {errors.name?.message?.toString()}
                                       </FormHelperText>
                                    )
                                 }
                              </FormControl>
                           )
                        }
                     />
                     <Controller
                        control={control}
                        name="username"
                        render={
                           ({ field }) => (
                              <FormControl error={Boolean(errors.username)}>
                                 <InputLabel htmlFor="username">
                                    Username
                                 </InputLabel>
                                 <OutlinedInput
                                    {...field}
                                    id="username"
                                    label="Username"
                                    value={field.value || ""}
                                    type="text"
                                    autoComplete="none"
                                    aria-label="Username"
                                 />
                                 {
                                    errors.username && (
                                       <FormHelperText>
                                          {errors.username?.message?.toString()}
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
                              <FormControl error={Boolean(errors.password)}>
                                 <InputLabel htmlFor="password">
                                    Password
                                 </InputLabel>
                                 <OutlinedInput
                                    {...field}
                                    id="password"
                                    label="Password"
                                    value={field.value || ""}
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    aria-label="Password"
                                    endAdornment={
                                       <FontAwesomeIcon
                                          className={clsx({ "primary": showPassword })}
                                          cursor="pointer"
                                          icon={showPassword ? faEyeSlash : faEye}
                                          onClick={() => setShowPassword(!showPassword)}
                                       />
                                    }
                                 />
                                 {
                                    errors.password && (
                                       <FormHelperText>
                                          {errors.password?.message?.toString()}
                                       </FormHelperText>
                                    )
                                 }
                              </FormControl>
                           )
                        }
                     />
                     <Controller
                        control={control}
                        name="verifyPassword"
                        render={
                           ({ field }) => (
                              <FormControl error={Boolean(errors.verifyPassword)}>
                                 <InputLabel htmlFor="verifyPassword">
                                    Verify Password
                                 </InputLabel>
                                 <OutlinedInput
                                    {...field}
                                    id="verifyPassword"
                                    label="Verify Password"
                                    value={field.value || ""}
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    aria-label="Verify Password"
                                    endAdornment={
                                       <FontAwesomeIcon
                                          className={clsx({ "primary": showVerifyPassword })}
                                          cursor="pointer"
                                          icon={showVerifyPassword ? faEyeSlash : faEye}
                                          onClick={() => setShowVerifyPassword(!showVerifyPassword)}
                                       />
                                    }
                                 />
                                 {
                                    errors.verifyPassword && (
                                       <FormHelperText>
                                          {errors.verifyPassword?.message?.toString()}
                                       </FormHelperText>
                                    )
                                 }
                              </FormControl>
                           )
                        }
                     />
                     <Controller
                        control={control}
                        name="email"
                        render={
                           ({ field }) => (
                              <FormControl error={Boolean(errors.email)}>
                                 <InputLabel htmlFor="email">
                                    Email
                                 </InputLabel>
                                 <OutlinedInput
                                    {...field}
                                    id="email"
                                    label="Email"
                                    value={field.value || ""}
                                    type="email"
                                    autoComplete="email"
                                    aria-label="Email"
                                 />
                                 {
                                    errors.email && (
                                       <FormHelperText>
                                          {errors.email?.message?.toString()}
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
                        startIcon={<FontAwesomeIcon icon={faIdCard} />}
                        type="submit"
                        variant="contained"
                     >
                        Register
                     </Button>
                  </Stack>
               </form>
               <Typography
                  align="center"
                  sx={{ fontWeight: "bold", margin: "0 0" }}
                  variant="body2"
               >
                  Already have an account?{" "}
                  <Link
                     color="primary"
                     fontWeight="bold"
                     href="/login"
                     underline="none"
                  >
                     Login
                  </Link>
               </Typography>
            </Stack>
         </Callout>
      </div>
   );
}