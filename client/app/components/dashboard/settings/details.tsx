import { faAddressCard } from "@fortawesome/free-solid-svg-icons";
import {
   FormControl,
   FormHelperText,
   InputLabel,
   MenuItem,
   OutlinedInput,
   Select,
   Stack,
   TextField,
   useTheme
} from "@mui/material";
import { HTTP_STATUS } from "capital/server";
import { updateUserSchema, type UserDetails, type UserUpdates } from "capital/user";
import { useCallback, useMemo } from "react";
import { Controller, type FieldValues, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import Section from "@/components/global/section";
import SubmitButton from "@/components/global/submit";
import { sendApiRequest } from "@/lib/api";
import { getValidDateRange } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { updateDetails } from "@/redux/slices/settings";
import { setTheme } from "@/redux/slices/theme";
import type { RootState } from "@/redux/store";

/**
 * Manages user personal information and theme preferences
 *
 * @returns {React.ReactNode} Form for editing name, birthday, and app theme
 */
export default function Details(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate(), theme = useTheme();
   const settings = useSelector((state: RootState) => state.settings.value);
   const preferredTheme = useSelector((state: RootState) => state.theme.value);

   // Form setup with react-hook-form
   const {
      control,
      handleSubmit,
      setError,
      reset,
      formState: { isSubmitting, errors, dirtyFields } } = useForm<UserUpdates>({
         defaultValues: {
            name: settings.name,
            birthday: settings.birthday.split("T")[0]
         }
      });

   // Setup minimum and maximum dates for birthday input
   const [minDate, maxDate] = useMemo(() => getValidDateRange(), []);

   const onReset = useCallback(() => {
      reset({
         name: settings.name,
         birthday: settings.birthday.split("T")[0]
      }, { keepDirty: false });
   }, [reset, settings.name, settings.birthday]);

   const onSubmit = async(data: FieldValues) => {
      try {
         // Ignore empty updates
         if (Object.keys(dirtyFields).length === 0) return;

         const fields = updateUserSchema.safeParse(data);

         if (!fields.success) {
            // Invalid user detail inputs
            handleValidationErrors(fields, setError);
            return;
         }

         // Format the updates for the API request
         const updates = Object.keys(dirtyFields).reduce((acc: Partial<UserUpdates>, key) => {
            acc[key as keyof UserUpdates] = fields.data[key as keyof UserUpdates];

            return acc;
         }, {});

         // Submit the API request for user details updates
         const response = await sendApiRequest<number>(
            "users", "PUT", updates, dispatch, navigate, setError
         );

         if (response === HTTP_STATUS.NO_CONTENT) {
            // Update Redux store on successful updates and reset the form
            dispatch(updateDetails(updates as Partial<UserDetails>));

            reset({
               name: updates.name || settings.name,
               birthday: (updates.birthday || settings.birthday).split("T")[0]
            }, { keepDirty: false });
         }
      } catch (error) {
         console.error("Failed to update settings:", error);
      }
   };

   // Theme update handler, which is not tied to account details
   const updateTheme = useCallback((update: "light" | "dark") => {
      dispatch(setTheme(update));
   }, [dispatch]);

   return (
      <Section
         dataTestId = "settings-details"
         icon = { faAddressCard }
      >
         <form
            noValidate = { true }
            onSubmit = { handleSubmit(onSubmit) }
         >
            <Stack
               direction = "column"
               spacing = { 1.5 }
               sx = { { mt: 3, textAlign: "center", justifyContent: "center", alignItems: "center" } }
            >
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
                              autoComplete = "name"
                              id = "name"
                              inputProps = { { "data-testid": "details-name" } }
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
                              autoComplete = "bday"
                              error = { Boolean(errors.birthday) }
                              id = "birthday"
                              label = "Birthday"
                              slotProps = {
                                 {
                                    htmlInput: {
                                       "data-testid": "details-birthday",
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
                  <InputLabel
                     htmlFor = "theme"
                     id = "theme-select-label"
                  >
                     Theme
                  </InputLabel>
                  <Select
                     data-testid = "details-theme-select"
                     label = "Theme"
                     onChange = { (e) => updateTheme(e.target.value as "light" | "dark") }
                     slotProps = {
                        {
                           input: {
                              id: "theme",
                              "data-testid": "details-theme"
                           } as any
                        }
                     }
                     value = { preferredTheme }
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
               <SubmitButton
                  dataTestId = "details"
                  isSubmitting = { isSubmitting }
                  onCancel = { onReset }
                  type = "Update"
                  visible = { Object.keys(dirtyFields).length > 0 }
               />
            </Stack>
         </form>
      </Section>
   );
}