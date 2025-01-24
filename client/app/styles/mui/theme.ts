import { createTheme, responsiveFontSizes } from "@mui/material";
import { shadows } from "@/styles/mui/shadow";
import { typography } from "@/styles/mui/typography";
import { palette } from "@/styles/mui/palette";
import { charts } from "@/styles/mui/chart";
import { components } from "@/styles/mui/components";

export const theme = responsiveFontSizes(
  createTheme({
    palette,
    typography,
    shadows,
    components: {
      ...components,
      ...charts,
    }
  })
);