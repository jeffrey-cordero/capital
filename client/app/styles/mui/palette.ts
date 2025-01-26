import { alpha, type PaletteOptions } from "@mui/material";

import { brand, gray, green, orange, red } from "@/styles/mui/colors";

export const palette: PaletteOptions = {
   primary: {
      light: brand[200],
      main: brand[600],
      dark: brand[700],
      contrastText: brand[50]
   },
   info: {
      light: brand[100],
      main: brand[300],
      dark: brand[600],
      contrastText: gray[50]
   },
   warning: {
      light: orange[300],
      main: orange[400],
      dark: orange[800]
   },
   error: {
      light: red[300],
      main: red[400],
      dark: red[800]
   },
   success: {
      light: green[300],
      main: green[400],
      dark: green[400]
   },
   grey: {
      ...gray
   },
   divider: alpha(gray[300], 0.4),
   action: {
      hover: alpha(gray[200], 0.2),
      selected: `${alpha(gray[200], 0.3)}`
   }
};