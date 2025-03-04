import { faCircleLeft, faCircleRight, faPhotoFilm } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Box, Button, Chip, Divider, FormControl, FormHelperText, InputLabel, MobileStepper, OutlinedInput, Stack } from "@mui/material";
import { accountSchema, images } from "capital/accounts";
import { useState } from "react";
import { type Control, Controller, type FieldErrors, type FieldValues, type UseFormClearErrors, type UseFormSetError, type UseFormSetValue } from "react-hook-form";

import Modal from "@/components/global/modal";

const imageSchema = accountSchema.shape.image;
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

export default function AccountImage({ control, errors, setError, clearErrors, disabled, value, setValue }: AccountImageProps) {
   const [open, setOpen] = useState<boolean>(false);
   const [activeStep, setActiveStep] = useState<number>(Math.max(imagesArray.indexOf(value), 0));

   const saveImage = () => {
      const fields = imageSchema.safeParse(value);

      if (!fields.success) {
         setError("image", {
            type: "manual",
            message: "URL must be valid"
         });
      } else {
         setOpen(false);
      }
   };

   return (
      <Box>
         <Button
            className = "btn-primary"
            color = "info"
            disabled = { disabled }
            fullWidth = { true }
            onClick = { () => setOpen(true) }
            startIcon = { <FontAwesomeIcon icon = { faPhotoFilm } /> }
            variant = "contained"
         >
            Image
         </Button>
         <Modal
            onClose = { saveImage }
            open = { open }
            sx = { { width: { xs: "85%", md: "65%", lg: "55%" }, maxWidth: "85%", p: 4, maxHeight: "80%" } }
         >
            <Divider>
               <Chip
                  color = "success"
                  label = "Image"
               />
            </Divider>
            <Stack spacing = { 1 }>

               <Stack
                  direction = "column"
                  sx = { { flexWrap: "wrap", justifyContent: "center", alignItems: "center", alignContent: "center" } }
               >
                  <Avatar
                     onClick = {
                        () => {
                           clearErrors("image");
                           setValue("image", value === imagesArray[activeStep] ? "" : imagesArray[activeStep]);
                        }
                     }
                     src = { `/images/${imagesArray[activeStep]}.png` }
                     sx = {
                        {
                           width: "100%",
                           height: 400,
                           my: 2,
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
                           onClick = { () => setActiveStep(activeStep - 1) }
                           size = "small"
                        >
                           <FontAwesomeIcon
                              icon = { faCircleLeft }
                              size = "lg"
                           />
                        </Button>
                     }
                     nextButton = {
                        <Button
                           disabled = { activeStep === imagesArray.length - 1 }
                           onClick = { () => setActiveStep(activeStep + 1) }
                           size = "small"
                        >
                           <FontAwesomeIcon
                              icon = { faCircleRight }
                              size = "lg"
                           />
                        </Button>
                     }
                     position = "static"
                     steps = { imagesArray.length }
                     sx = { { backgroundColor: "transparent", px: 2 } }
                     variant = "dots"
                  />
               </Stack>
               <Controller
                  control = { control }
                  name = "image"
                  render = {
                     ({ field }) => (
                        <FormControl error = { Boolean(errors.image) }>
                           <InputLabel htmlFor = "url">
                              URL
                           </InputLabel>
                           <OutlinedInput
                              { ...field }
                              aria-label = "URL"
                              id = "image"
                              label = "URL"
                              onFocus = { () => images.has(value) && setValue("image", "") }
                              type = "text"
                              value = { images.has(field.value) ? "" : field.value }
                           />
                           {
                              errors.image && (
                                 <FormHelperText>
                                    { errors.image?.message?.toString() }
                                 </FormHelperText>
                              )
                           }
                        </FormControl>
                     )
                  }
               />
            </Stack>
         </Modal>
      </Box>
   );
}