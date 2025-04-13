import { faRotateLeft, faSave } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   Fade,
   FormControl,
   FormHelperText,
   InputLabel,
   MenuItem,
   OutlinedInput,
   Paper,
   Select,
   Stack,
   TextField,
   useTheme
} from "@mui/material";
import { type UserDetails, type UserDetailUpdates, userUpdateSchema } from "capital/user";
import { useCallback } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { getDateRange } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { updateDetails } from "@/redux/slices/settings";
import { setTheme } from "@/redux/slices/theme";
import type { RootState } from "@/redux/store";

/**
 * Details component for editing user personal information and theme preference
 *
 * @returns {React.ReactNode} The Details component
 */
export default function Details(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate(), theme = useTheme();

   // Gather user settings and theme from respective Redux slices
   const settings = useSelector((state: RootState) => state.settings.value);
   const currentTheme = useSelector((state: RootState) => state.theme.value);

   // Form setup with react-hook-form
   const {
      control,
      handleSubmit,
      setError,
      reset,
      formState: { isSubmitting, errors, dirtyFields }
   } = useForm<UserDetailUpdates>({
      defaultValues: {
         name: settings.name,
         birthday: settings.birthday.split("T")[0]
      }
   });

   // Setup minimum and maximum dates for birthday input
   const [minDate, maxDate] = getDateRange();

   // Check if the form has dirty fields to display the save button
   const isFormDirty = Object.keys(dirtyFields).length > 0;

   // Handles form submission
   const onSubmit = async(data: FieldValues) => {
      try {
         const fields = userUpdateSchema.partial().safeParse(data);

         if (!fields.success) {
            // Handle validation errors
            handleValidationErrors(fields, setError);
            return;
         }

         // Only send fields that were changed
         const updates = Object.keys(dirtyFields).reduce((acc: Partial<UserDetailUpdates>, key) => {
            acc[key as keyof UserDetailUpdates] = fields.data[key as keyof UserDetailUpdates];
            return acc;
         }, {});

         // Skip if no changes were made
         if (Object.keys(updates).length === 0) return;

         const response = await sendApiRequest<number>(
            "users", "PUT", updates, dispatch, navigate, setError
         );

         if (response === 204) {
            // Update Redux store with the changes
            dispatch(updateDetails(updates as Partial<UserDetails>));
            reset({
               name: updates.name || undefined,
               birthday: updates.birthday ? updates.birthday.split("T")[0] : undefined
            });
         }
      } catch (error) {
         console.error("Failed to update settings:", error);
      }
   };

   // Handle theme change through the select input
   const changeTheme = useCallback((update: "light" | "dark") => {
      dispatch(setTheme(update));
   }, [dispatch]);

   return (
      <Paper
         elevation = { 3 }
         sx = { { p: 6, mt: 2 } }
      >
         <form onSubmit = { handleSubmit(onSubmit) }>
            <Stack
               direction = "column"
               spacing = { 1.5 }
               sx = { { textAlign: "center", justifyContent: "center", alignItems: "center" } }
            >
               <Box
                  alt = "Details"
                  component = "img"
                  src = "/svg/details.svg"
                  sx = { { height: 250, mb: 4 } }
               />
               <Controller
                  control = { control }
                  name = "name"
                  render = {
                     ({ field }) => (
                        <FormControl
                           error = { Boolean(errors.name) }
                           fullWidth = { true }
                        >
                           <InputLabel htmlFor = "name">
                              Name
                           </InputLabel>
                           <OutlinedInput
                              { ...field }
                              id = "name"
                              label = "Name"
                              value = { field.value || "" }
                           />
                           <FormHelperText>
                              { errors.name?.message?.toString() }
                           </FormHelperText>
                        </FormControl>
                     )
                  }
               />
               <Controller
                  control = { control }
                  name = "birthday"
                  render = {
                     ({ field }) => (
                        <FormControl
                           error = { Boolean(errors.birthday) }
                           fullWidth = { true }
                        >
                           <InputLabel
                              htmlFor = "birthday"
                              shrink = { true }
                           >
                              Birthday
                           </InputLabel>
                           <TextField
                              { ...field }
                              error = { Boolean(errors.birthday) }
                              id = "birthday"
                              label = "Birthday"
                              slotProps = {
                                 {
                                    htmlInput: {
                                       min: minDate,
                                       max: maxDate
                                    },
                                    inputLabel: {
                                       shrink: true
                                    }
                                 }
                              }
                              sx = {
                                 {
                                    colorScheme: theme.palette.mode === "dark" ? "dark" : "inherit"
                                 }
                              }
                              type = "date"
                              value = { field.value || "" }
                           />
                           <FormHelperText>
                              { errors.birthday?.message?.toString() }
                           </FormHelperText>
                        </FormControl>
                     )
                  }
               />
               <FormControl
                  fullWidth = { true }
                  sx = { { textAlign: "left" } }
               >
                  <InputLabel id = "theme-select-label">
                     Theme
                  </InputLabel>
                  <Select
                     label = "Theme"
                     onChange = { (e) => changeTheme(e.target.value as "light" | "dark") }
                     value = { currentTheme }
                     variant = "outlined"
                  >
                     <MenuItem value = "light">
                        Light Mode
                     </MenuItem>
                     <MenuItem value = "dark">
                        Dark Mode
                     </MenuItem>
                  </Select>
               </FormControl>
               <Fade
                  in = { isFormDirty }
                  mountOnEnter = { true }
                  style = { { transformOrigin: "center top" } }
                  timeout = { 250 }
                  unmountOnExit = { true }
               >
                  <Stack
                     direction = "row"
                     spacing = { 1.5 }
                     sx = { { width: "100%" } }
                  >
                     <Button
                        className = "btn-secondary"
                        color = "secondary"
                        fullWidth = { true }
                        loading = { isSubmitting }
                        onClick = { () => reset() }
                        startIcon = { <FontAwesomeIcon icon = { faRotateLeft } /> }
                        type = "button"
                        variant = "contained"
                     >
                        Reset
                     </Button>
                     <Button
                        className = "btn-primary"
                        color = "primary"
                        fullWidth = { true }
                        loading = { isSubmitting }
                        startIcon = { <FontAwesomeIcon icon = { faSave } /> }
                        type = "submit"
                        variant = "contained"
                     >
                        Save
                     </Button>
                  </Stack>
               </Fade>
            </Stack>
         </form>
      </Paper>
   );
}