import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Divider } from "@mui/material";

/**
 * Props for the Section component
 *
 * @property {IconDefinition} icon - Section header icon
 * @property {React.ReactNode} children - Section content
 * @property {string} [dataTestId] - Data test ID for the section box
 */
interface SectionProps {
   icon: IconDefinition;
   children: React.ReactNode;
   dataTestId?: string;
}

/**
 * Divider with icon for sectioning content
 *
 * @param {SectionProps} props - Section component props
 * @returns {React.ReactNode} The Section component
 */
export default function Section({ icon, children, dataTestId }: SectionProps): React.ReactNode {
   return (
      <Box data-testid = { dataTestId }>
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