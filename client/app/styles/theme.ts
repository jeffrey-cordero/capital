import { createTheme, type Theme, responsiveFontSizes, svgIconClasses, iconButtonClasses } from "@mui/material";
import { axisClasses, legendClasses, chartsGridClasses } from "@mui/x-charts";
import { chipClasses } from '@mui/material/Chip';

const gray = {
  50: "hsl(220, 35%, 97%)",
  100: "hsl(220, 30%, 94%)",
  200: "hsl(220, 20%, 88%)",
  300: "hsl(220, 20%, 80%)",
  400: "hsl(220, 20%, 65%)",
  500: "hsl(220, 20%, 42%)",
  600: "hsl(220, 20%, 35%)",
  700: "hsl(220, 20%, 25%)",
  800: "hsl(220, 30%, 6%)",
  900: "hsl(220, 35%, 3%)",
};

const red = {
   50: 'hsl(0, 100%, 97%)',
   100: 'hsl(0, 92%, 90%)',
   200: 'hsl(0, 94%, 80%)',
   300: 'hsl(0, 90%, 65%)',
   400: 'hsl(0, 90%, 40%)',
   500: 'hsl(0, 90%, 30%)',
   600: 'hsl(0, 91%, 25%)',
   700: 'hsl(0, 94%, 18%)',
   800: 'hsl(0, 95%, 12%)',
   900: 'hsl(0, 93%, 6%)',
 };

const green = {
   50: 'hsl(120, 80%, 98%)',
   100: 'hsl(120, 75%, 94%)',
   200: 'hsl(120, 75%, 87%)',
   300: 'hsl(120, 61%, 77%)',
   400: 'hsl(120, 44%, 53%)',
   500: 'hsl(120, 59%, 30%)',
   600: 'hsl(120, 70%, 25%)',
   700: 'hsl(120, 75%, 16%)',
   800: 'hsl(120, 84%, 10%)',
   900: 'hsl(120, 87%, 6%)',
 };

export const theme = responsiveFontSizes(
  createTheme({
    palette: {
      mode: "light",
      primary: {
        main: "#1A6DFD",
      },
      secondary: {
        main: "#1DB954",
      },
    },
    components: {
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
    },
    typography: {
      body1: { fontSize: "1rem", fontWeight: 400, lineHeight: 1.5 },
      fontFamily:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
      body2: { fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.57 },
      button: { fontWeight: 500 },
      caption: { fontSize: "0.75rem", fontWeight: 400, lineHeight: 1.66 },
      subtitle1: { fontSize: "1rem", fontWeight: 500, lineHeight: 1.57 },
      subtitle2: { fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.57 },
      overline: {
        fontSize: "0.75rem",
        fontWeight: 500,
        letterSpacing: "0.5px",
        lineHeight: 2.5,
        textTransform: "uppercase",
      },
      h1: { fontSize: "3.5rem", fontWeight: 500, lineHeight: 1.2 },
      h2: { fontSize: "3rem", fontWeight: 500, lineHeight: 1.2 },
      h3: { fontSize: "2.25rem", fontWeight: 500, lineHeight: 1.2 },
      h4: { fontSize: "2rem", fontWeight: 500, lineHeight: 1.2 },
      h5: { fontSize: "1.5rem", fontWeight: 500, lineHeight: 1.2 },
      h6: { fontSize: "1.125rem", fontWeight: 500, lineHeight: 1.2 },
    },
    shadows: [
      "none",
      "0px 1px 2px rgba(0, 0, 0, 0.08)",
      "0px 1px 5px rgba(0, 0, 0, 0.08)",
      "0px 1px 8px rgba(0, 0, 0, 0.08)",
      "0px 1px 10px rgba(0, 0, 0, 0.08)",
      "0px 1px 14px rgba(0, 0, 0, 0.08)",
      "0px 1px 18px rgba(0, 0, 0, 0.08)",
      "0px 2px 16px rgba(0, 0, 0, 0.08)",
      "0px 3px 14px rgba(0, 0, 0, 0.08)",
      "0px 3px 16px rgba(0, 0, 0, 0.08)",
      "0px 4px 18px rgba(0, 0, 0, 0.08)",
      "0px 4px 20px rgba(0, 0, 0, 0.08)",
      "0px 5px 22px rgba(0, 0, 0, 0.08)",
      "0px 5px 24px rgba(0, 0, 0, 0.08)",
      "0px 5px 26px rgba(0, 0, 0, 0.08)",
      "0px 6px 28px rgba(0, 0, 0, 0.08)",
      "0px 6px 30px rgba(0, 0, 0, 0.08)",
      "0px 6px 32px rgba(0, 0, 0, 0.08)",
      "0px 7px 34px rgba(0, 0, 0, 0.08)",
      "0px 7px 36px rgba(0, 0, 0, 0.08)",
      "0px 8px 38px rgba(0, 0, 0, 0.08)",
      "0px 8px 40px rgba(0, 0, 0, 0.08)",
      "0px 8px 42px rgba(0, 0, 0, 0.08)",
      "0px 9px 44px rgba(0, 0, 0, 0.08)",
      "0px 9px 46px rgba(0, 0, 0, 0.08)",
    ],
  })
);
