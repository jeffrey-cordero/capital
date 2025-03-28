import { alpha, type PaletteOptions } from "@mui/material";

import {
   brand,
   gray,
   green,
   orange,
   red
} from "@/styles/mui/colors";
import { grey } from "@mui/material/colors";

/**
 * MUI palette overrides.
 * @see https://mui.com/material-ui/customization/theming/
 */
export const palette: PaletteOptions = {
   primary: {
      main: brand[400],
      dark: brand[300],
      contrastText: brand[50]
   },
   secondary: {
      main: grey[400],
      dark: grey[300],
      contrastText: grey[50]
   },
   info: {
      main: brand[400],
      dark: brand[300],
      contrastText: brand[50]
   },
   warning: {
      main: orange[400],
      dark: orange[300],
      contrastText: orange[50]
   },
   error: {
      main: red[400],
      dark: red[300],
      contrastText: red[50]
   },
   success: {
      main: green[400],
      dark: green[500],
      contrastText: green[50]
   },
   divider: alpha(gray[300], 0.4),
   action: {
      hover: alpha(gray[200], 0.2),
      selected: `${alpha(gray[200], 0.3)}`
   }
};