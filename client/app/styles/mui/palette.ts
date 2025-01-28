import { alpha, type PaletteOptions } from "@mui/material";

import { brand, gray, green, orange, red } from "@/styles/mui/colors";

export const palette: PaletteOptions = {
   primary: {
      main: brand[600],
      dark: brand[600],
      contrastText: brand[50]
   },
   info: {
      main: gray[400],
      dark: gray[600],
      contrastText: gray[50]
   },
   warning: {
      main: orange[400],
      dark: orange[600]
   },
   error: {
      main: red[400],
      dark: red[600]
   },
   success: {
      main: green[400],
      dark: green[600]
   },
   divider: alpha(gray[300], 0.4),
   action: {
      hover: alpha(gray[200], 0.2),
      selected: `${alpha(gray[200], 0.3)}`
   }
};