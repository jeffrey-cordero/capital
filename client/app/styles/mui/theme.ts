import { createTheme } from "@mui/material";

import { charts } from "@/styles/mui/chart";
import { components } from "@/styles/mui/components";
import { palette } from "@/styles/mui/palette";
import { shadows } from "@/styles/mui/shadow";
import { tables } from "@/styles/mui/tables";
import { typography } from "@/styles/mui/typography";

/**
 * Constructs a MUI theme based on the mode
 *
 * @param {("light" | "dark")} mode - The mode of the theme
 * @returns The MUI theme object instance for the application
 */
export const constructTheme = (mode: "light" | "dark") => (
   createTheme({
      palette: {
         mode: mode,
         ...palette
      },
      typography,
      shadows: shadows(mode),
      components: { ...components, ...charts, ...tables }
   })
);