import { createTheme, responsiveFontSizes, svgIconClasses, iconButtonClasses } from "@mui/material";
import { chipClasses } from '@mui/material/Chip';
import { gray, red, green } from "@/styles/mui/colors";
import { shadows } from "@/styles/mui/shadow";
import { typography } from "@/styles/mui/typography";
import { palette } from "@/styles/mui/palette";
import { charts } from "./chart";

export const theme = responsiveFontSizes(
  createTheme({
    palette,
    typography,
    shadows,
    components: {
      ...charts,
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: "12px", textTransform: "none" },
          sizeSmall: { padding: "6px 16px" },
          sizeMedium: { padding: "8px 20px" },
          sizeLarge: { padding: "11px 24px" },
          textSizeSmall: { padding: "7px 12px" },
          textSizeMedium: { padding: "9px 16px" },
          textSizeLarge: { padding: "12px 16px" },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
            fontSize: "0.95rem",
            borderColor: "primary.main",
          },
          input: {
            fontSize: "0.95rem",
            "&::placeholder": {
              fontSize: "0.85rem",
              color: "rgba(0, 0, 0, 0.6)",
            },
          },
        },
      },
      MuiChip: {
         defaultProps: {
           size: 'small',
         },
         styleOverrides: {
           root: ({ theme }) => ({
             border: '1px solid',
             borderRadius: '999px',
             [`& .${chipClasses.label}`]: {
               fontWeight: 600,
             },
             variants: [
               {
                 props: {
                   color: 'default',
                 },
                 style: {
                   borderColor: gray[200],
                   backgroundColor: gray[100],
                   [`& .${chipClasses.label}`]: {
                     color: gray[500],
                   },
                   [`& .${chipClasses.icon}`]: {
                     color: gray[500],
                   },
                   ...theme.applyStyles('dark', {
                     borderColor: gray[700],
                     backgroundColor: gray[800],
                     [`& .${chipClasses.label}`]: {
                       color: gray[300],
                     },
                     [`& .${chipClasses.icon}`]: {
                       color: gray[300],
                     },
                   }),
                 },
               },
               {
                 props: {
                   color: 'success',
                 },
                 style: {
                   borderColor: green[200],
                   backgroundColor: green[50],
                   [`& .${chipClasses.label}`]: {
                     color: green[500],
                   },
                   [`& .${chipClasses.icon}`]: {
                     color: green[500],
                   },
                   ...theme.applyStyles('dark', {
                     borderColor: green[800],
                     backgroundColor: green[900],
                     [`& .${chipClasses.label}`]: {
                       color: green[300],
                     },
                     [`& .${chipClasses.icon}`]: {
                       color: green[300],
                     },
                   }),
                 },
               },
               {
                 props: {
                   color: 'error',
                 },
                 style: {
                   borderColor: red[100],
                   backgroundColor: red[50],
                   [`& .${chipClasses.label}`]: {
                     color: red[500],
                   },
                   [`& .${chipClasses.icon}`]: {
                     color: red[500],
                   },
                   ...theme.applyStyles('dark', {
                     borderColor: red[800],
                     backgroundColor: red[900],
                     [`& .${chipClasses.label}`]: {
                       color: red[200],
                     },
                     [`& .${chipClasses.icon}`]: {
                       color: red[300],
                     },
                   }),
                 },
               },
               {
                 props: { size: 'small' },
                 style: {
                   maxHeight: 20,
                   [`& .${chipClasses.label}`]: {
                     fontSize: theme.typography.caption.fontSize,
                   },
                   [`& .${svgIconClasses.root}`]: {
                     fontSize: theme.typography.caption.fontSize,
                   },
                 },
               },
               {
                 props: { size: 'medium' },
                 style: {
                   [`& .${chipClasses.label}`]: {
                     fontSize: theme.typography.caption.fontSize,
                   },
                 },
               },
             ],
           }),
         },
       },
       MuiTablePagination: {
         styleOverrides: {
           actions: {
             display: 'flex',
             gap: 8,
             marginRight: 6,
             [`& .${iconButtonClasses.root}`]: {
               minWidth: 0,
               width: 36,
               height: 36,
             },
           },
         },
       },
       MuiIcon: {
         defaultProps: {
           fontSize: 'small',
         },
         styleOverrides: {
           root: {
             variants: [
               {
                 props: {
                   fontSize: 'small',
                 },
                 style: {
                   fontSize: '1rem',
                 },
               },
             ],
           },
         },
       },
    }
  })
);
