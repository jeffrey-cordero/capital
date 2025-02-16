import { createTheme } from "@mui/material";

import { charts } from "@/styles/mui/chart";
import { components } from "@/styles/mui/components";
import { palette } from "@/styles/mui/palette";
import { shadows } from "@/styles/mui/shadow";
import { typography } from "@/styles/mui/typography";

export const theme = (mode: "light" | "dark") => (
   createTheme({
      palette: {
         mode: mode,
         ...palette
      },
      typography,
      shadows,
      components: {
         ...components,
         ...charts
      }
   })
);