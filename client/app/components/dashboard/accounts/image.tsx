import { faCircleLeft, faCircleRight, faPhotoFilm } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Avatar,
   Box,
   Button,
   FormControl,
   FormHelperText,
   InputLabel,
   MobileStepper,
   OutlinedInput,
   Stack
} from "@mui/material";
import { accountSchema, images } from "capital/accounts";
import { memo, useCallback, useMemo, useState } from "react";
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

// Extract the image validation schema from the account schema
const imageSchema = accountSchema.shape.image;
// Convert the images Set to an array for easier indexing
const imagesArray = Array.from(images);

interface AccountImageProps {
   value: string;
   errors: FieldErrors<FieldValues>;
   setError: UseFormSetError<FieldValues>;
   clearErrors: UseFormClearErrors<FieldValues>;
   setValue: UseFormSetValue<FieldValues>;
   control: Control<FieldValues>;
   disabled: boolean;
}

function AccountImage({
   control,
   errors,
   setError,
   clearErrors,
   disabled,
   value,
   setValue
}: AccountImageProps) {
   // Allows users to view and select images from a carousel and input a custom URL
   const [open, setOpen] = useState<boolean>(false);

   // Current position in the image carousel, if applicable
   const [activeStep, setActiveStep] = useState<number>(
      Math.max(imagesArray.indexOf(value), 0)
   );

   // Memoize the current image path to prevent unnecessary re-renders
   const currentImagePath = useMemo(() =>
      `/images/${imagesArray[activeStep]}.png`,
   [activeStep]
   );

   // Validate and save the image when closing the modal
   const saveImage = useCallback(() => {
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

   // Handle image selection from the carousel
   const handleImageSelect = useCallback(() => {
      clearErrors("image");
      setValue(
         "image",
         value === imagesArray[activeStep] ? "" : imagesArray[activeStep],
         { shouldDirty: true }
      );
   }, [clearErrors, setValue, value, activeStep]);

   // Navigate to previous image in carousel
   const handlePrevImage = useCallback(() => {
      setActiveStep(prev => prev - 1);
   }, []);

   // Navigate to next image in carousel
   const handleNextImage = useCallback(() => {
      setActiveStep(prev => prev + 1);
   }, []);

   // Handle opening the modal
   const handleOpenModal = useCallback(() => {
      setOpen(true);
   }, []);

   // Handle custom URL input focus
   const handleUrlFocus = useCallback(() => {
      if (images.has(value)) {
         setValue("image", "", { shouldDirty: true });
      }
   }, [value, setValue]);

   return (
      <Box>
         <Button
            className = "btn-primary"
            color = "info"
            disabled = { disabled }
            fullWidth = { true }
            onClick = { handleOpenModal }
            startIcon = { <FontAwesomeIcon icon = { faPhotoFilm } /> }
            variant = "contained"
         >
            Image
         </Button>
         <Modal
            onClose = { saveImage }
            open = { open }
            sx = { { width: { xs: "85%", md: "65%", lg: "50%" }, maxWidth: "85%", p: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 }, maxHeight: "80%" } }
         >
            <ModalSection title = "Image">
               <Stack spacing = { 1 }>
                  <Stack
                     direction = "column"
                     sx = { { flexWrap: "wrap", justifyContent: "center", alignItems: "center", alignContent: "center" } }
                  >
                     <Avatar
                        onClick = { handleImageSelect }
                        src = { currentImagePath }
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
                           <Button
                              disabled = { activeStep === 0 }
                              onClick = { handlePrevImage }
                              size = "small"
                           >
                              <FontAwesomeIcon
                                 icon = { faCircleLeft }
                                 size = "xl"
                              />
                           </Button>
                        }
                        nextButton = {
                           <Button
                              disabled = { activeStep === imagesArray.length - 1 }
                              onClick = { handleNextImage }
                              size = "small"
                           >
                              <FontAwesomeIcon
                                 icon = { faCircleRight }
                                 size = "xl"
                              />
                           </Button>
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

// Memoize the component to prevent unnecessary re-renders
export default memo(AccountImage);