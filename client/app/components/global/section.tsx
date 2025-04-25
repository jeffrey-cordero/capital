import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   css,
   Dialog,
   DialogActions,
   DialogContent,
   DialogContentText,
   Divider,
   Fade,
   Modal as MuiModal,
   Stack,
   styled,
   type SxProps
} from "@mui/material";
import { useCallback, useState } from "react";

import { gray } from "@/styles/mui/colors";

/**
 * The props for the Section component.
 *
 * @interface SectionProps
 * @property {IconDefinition} icon - The icon component of the modal section
 * @property {React.ReactNode} children - The children components to render within the modal section
 */
interface SectionProps {
   icon: IconDefinition;
   children: React.ReactNode;
}

/**
 * The Section component to render the modal section title and children components.
 *
 * @param {SectionProps} props - The props for the Section component
 * @returns {React.ReactNode} The Section component
 */
export default function Section({ icon, children }: SectionProps): React.ReactNode {
   return (
      <Box>
         <Divider>
            <FontAwesomeIcon
               className = "primary"
               icon = { icon }
               style = { { fontSize: "16px" } }
            />
         </Divider>
         { children }
      </Box>
   );
}