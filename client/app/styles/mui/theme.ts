import { createTheme } from "@mui/material";

import { charts } from "@/styles/mui/chart";
import { components } from "@/styles/mui/components";
import { palette } from "@/styles/mui/palette";
import { shadows } from "@/styles/mui/shadow";
import { typography } from "@/styles/mui/typography";

/**
 * @param mode - The mode of the theme
 * @returns The constructed theme
 * @see https://mui.com/material-ui/customization/theming/
 * @description Constructs a MUI theme based on the mode
 */
export const constructTheme = (mode: "light" | "dark") => (
   createTheme({
      palette: {
         mode: mode,
         ...palette
      },
      typography,
      shadows,
      components: { ...components, ...charts }
   })
);