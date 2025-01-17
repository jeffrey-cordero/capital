import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FormControl, FormHelperText, InputLabel, OutlinedInput } from "@mui/material";
import { useState } from "react";
import type { FieldErrors, FieldValues } from "react-hook-form";

interface PasswordProps {
   errors: FieldErrors<FieldValues>;
   field: any;

}

export default function Password(props: PasswordProps) {
   const { errors, field } = props;
   const [showPassword, setShowPassword] = useState<boolean>(false);

   return (
      <FormControl error = { Boolean(errors.password) }>
         <InputLabel>Password</InputLabel>
         <OutlinedInput
            { ...field }
            endAdornment = {
               <FontAwesomeIcon
                  cursor = "pointer"
                  icon = { showPassword ? faEyeSlash : faEye }
                  onClick = { () => setShowPassword(!showPassword) }
               />
            }
            label = "Password"
            type = { showPassword ? "text" : "password" }
         />
         { errors.password ? <FormHelperText>{ errors.password?.message?.toString() }</FormHelperText> : null }
      </FormControl>
   );
}