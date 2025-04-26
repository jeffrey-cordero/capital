import { faAnglesLeft, faAnglesRight, faPhotoFilm } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Avatar,
   Box,
   Button,
   FormControl,
   FormHelperText,
   IconButton,
   InputLabel,
   MobileStepper,
   OutlinedInput,
   Stack
} from "@mui/material";
import { accountSchema, images } from "capital/accounts";
import { useCallback, useState } from "react";
import {
   type Control,
   Controller,
   type FieldErrors,
   type FieldValues,
   type UseFormClearErrors,
   type UseFormSetError,
   type UseFormSetValue
} from "react-hook-form";

import Modal from "@/components/global/modal";
import Section from "@/components/global/section";

/**
 * Image validation schema extracted from account schema
 */
const imageSchema = accountSchema.shape.image;

/**
 * Predefined images for account selection
 */
const imagesArray = Array.from(images);

/**
 * Props for the account image selection component
 *
 * @property {string} value - Current image value
 * @property {FieldErrors<FieldValues>} errors - Form validation errors
 * @property {UseFormSetError<FieldValues>} setError - Function to set form errors
 * @property {UseFormClearErrors<FieldValues>} clearErrors - Function to clear form errors
 * @property {UseFormSetValue<FieldValues>} setValue - Function to update form values
 * @property {Control<FieldValues>} control - React Hook Form control instance
 */
interface AccountImageProps {
   value: string;
   errors: FieldErrors<FieldValues>;
   setError: UseFormSetError<FieldValues>;
   clearErrors: UseFormClearErrors<FieldValues>;
   setValue: UseFormSetValue<FieldValues>;
   control: Control<FieldValues>;
}

/**
 * Interactive account image selector with gallery and URL input, which provides
 * predefined images and custom URL input with validation
 *
 * @param {AccountImageProps} props - Component props including form controls
 * @returns {React.ReactNode} Account image selection modal with carousel
 */
export default function AccountImage({
   control,
   errors,
   setError,
   clearErrors,
   value,
   setValue
}: AccountImageProps): React.ReactNode {
   const [open, setOpen] = useState<boolean>(false);
   const [activeStep, setActiveStep] = useState<number>(
      Math.max(imagesArray.indexOf(value), 0)
   );

   // Reset image selection when custom URL is entered
   const handleUrlFocus = useCallback(() => {
      if (images.has(value)) {
         setValue("image", "", { shouldDirty: true });
      }
   }, [value, setValue]);

   // Modal visibility handlers
   const openModal = useCallback(() => {
      setOpen(true);
   }, []);

   const closeModal = useCallback(() => {
      const fields = imageSchema.safeParse(value);

      // Validate image URL before closing
      if (!fields.success) {
         setError("image", {
            type: "manual",
            message: "URL must be valid"
         });
      } else {
         setOpen(false);
      }
   }, [value, setError]);

   // Image carousel navigation handlers
   const viewPreviousImage = useCallback(() => {
      setActiveStep(prev => prev === 0 ? imagesArray.length - 1 : prev - 1);
   }, []);

   const viewNextImage = useCallback(() => {
      setActiveStep(prev => prev === imagesArray.length - 1 ? 0 : prev + 1);
   }, []);

   const selectProvidedImage = useCallback(() => {
      clearErrors("image");
      setValue(
         "image",
         value === imagesArray[activeStep] ? "" : imagesArray[activeStep],
         { shouldDirty: true }
      );
   }, [clearErrors, setValue, value, activeStep]);

   return (
      <Box>
         <Button
            className = "btn-primary"
            color = "success"
            fullWidth = { true }
            onClick = { openModal }
            startIcon = { <FontAwesomeIcon icon = { faPhotoFilm } /> }
            variant = "contained"
         >
            Image
         </Button>
         <Modal
            onClose = { closeModal }
            open = { open }
            sx = { { width: { xs: "85%", md: "65%", lg: "55%", xl: "40%" }, maxWidth: "85%", px: { xs: 2, sm: 3 }, py: 3, maxHeight: "80%" } }
         >
            <Section icon = { faPhotoFilm }>
               <Stack spacing = { 1 }>
                  <Stack
                     direction = "column"
                     sx = { { flexWrap: "wrap", justifyContent: "center", alignItems: "center", alignContent: "center" } }
                  >
                     <Avatar
                        onClick = { selectProvidedImage }
                        src = { `/images/${imagesArray[activeStep]}.png` }
                        sx = {
                           {
                              width: "100%",
                              height: "auto",
                              maxHeight: 423.52,
                              mt: 1,
                              mb: 1,
                              cursor: "pointer",
                              border: value === imagesArray[activeStep] ? "3px solid" : "none",
                              borderColor: "primary.main",
                              objectFit: "contain",
                              objectPosition: "center"
                           }
                        }
                        variant = "rounded"
                     />
                     <MobileStepper
                        activeStep = { activeStep }
                        backButton = {
                           <IconButton
                              color = "primary"
                              onClick = { viewPreviousImage }
                              size = "small"
                              sx = { { pr: 1 } }
                           >
                              <FontAwesomeIcon
                                 icon = { faAnglesLeft }
                              />
                           </IconButton>
                        }
                        nextButton = {
                           <IconButton
                              color = "primary"
                              onClick = { viewNextImage }
                              size = "small"
                              sx = { { pl: 1 } }
                           >
                              <FontAwesomeIcon
                                 icon = { faAnglesRight }
                              />
                           </IconButton>
                        }
                        position = "static"
                        steps = { imagesArray.length }
                        sx = { { backgroundColor: "transparent", px: 2, py: 0 } }
                        variant = "dots"
                     />
                  </Stack>
                  <Controller
                     control = { control }
                     name = "image"
                     render = {
                        ({ field }) => (
                           <FormControl
                              error = { Boolean(errors.image) }
                              sx = { { mb: 1 } }
                           >
                              <InputLabel htmlFor = "image">
                                 URL
                              </InputLabel>
                              <OutlinedInput
                                 { ...field }
                                 aria-label = "URL"
                                 id = "image"
                                 label = "URL"
                                 onFocus = { handleUrlFocus }
                                 type = "text"
                                 value = { images.has(field.value) || !field.value ? "" : field.value }
                              />
                              <FormHelperText>
                                 { errors.image?.message?.toString() }
                              </FormHelperText>
                           </FormControl>
                        )
                     }
                  />
               </Stack>
            </Section>
         </Modal>
      </Box>
   );
}