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

import { Modal, ModalSection } from "@/components/global/modal";

/**
 * The image validation schema from the account schema
 */
const imageSchema = accountSchema.shape.image;

/**
 * The images array for the carousel
 */
const imagesArray = Array.from(images);

/**
 * The AccountImage component props
 *
 * @interface AccountImageProps
 * @property {string} value - The value of the image
 * @property {FieldErrors<FieldValues>} errors - The errors for the account form
 * @property {UseFormSetError<FieldValues>} setError - The setError function for the account form
 * @property {UseFormClearErrors<FieldValues>} clearErrors - The clearErrors function for the account form
 * @property {UseFormSetValue<FieldValues>} setValue - The setValue function for the account form
 * @property {Control<FieldValues>} control - The control of the account form
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
 * The AccountImage component to display and select an image for an account
 *
 * @param {AccountImageProps} props - The props for the AccountImage component
 * @returns {React.ReactNode} The AccountImage component
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

   // Clear the main image selection when the URL input is focused
   const handleUrlFocus = useCallback(() => {
      if (images.has(value)) {
         setValue("image", "", { shouldDirty: true });
      }
   }, [value, setValue]);

   // Modal method handlers
   const openModal = useCallback(() => {
      setOpen(true);
   }, []);

   const closeModal = useCallback(() => {
      const fields = imageSchema.safeParse(value);

      if (!fields.success) {
         setError("image", {
            type: "manual",
            message: "URL must be valid"
         });
      } else {
         setOpen(false);
      }
   }, [value, setError]);

   const viewPreviousImage = useCallback(() => {
      setActiveStep(prev => prev === 0 ? imagesArray.length - 1 : prev - 1);
   }, []);

   const viewNextImage = useCallback(() => {
      setActiveStep(prev => prev === imagesArray.length - 1 ? 0 : prev + 1);
   }, []);

   const selectImage = useCallback(() => {
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
            sx = { { width: { xs: "85%", md: "65%", lg: "55%", xl: "40%" }, maxWidth: "85%", p: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 }, maxHeight: "80%" } }
         >
            <ModalSection title = "Image">
               <Stack spacing = { 1 }>
                  <Stack
                     direction = "column"
                     sx = { { flexWrap: "wrap", justifyContent: "center", alignItems: "center", alignContent: "center" } }
                  >
                     <Avatar
                        onClick = { selectImage }
                        src = { `/images/${imagesArray[activeStep]}.png` }
                        sx = {
                           {
                              width: "100%",
                              height: { xs: "auto", sm: 350, md: 400, lg: 450 },
                              mt: 2,
                              mb: 1,
                              cursor: "pointer",
                              border: value === imagesArray[activeStep] ? "3px solid" : "none",
                              borderColor: "primary.main"
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
                                 style = { { fontSize: "1.2rem" } }
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
                                 style = { { fontSize: "1.2rem" } }
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
            </ModalSection>
         </Modal>
      </Box>
   );
}