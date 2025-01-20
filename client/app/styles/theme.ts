import { createTheme, responsiveFontSizes } from "@mui/material";

export const theme = responsiveFontSizes(
   createTheme({
      palette: {
         mode: "light",
         primary: {
            main: "#1A6DFD",
         },
         secondary: {
            main: "#1DB954",
         }
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
               textSizeLarge: { padding: "12px 16px" }
            }
         },
         MuiOutlinedInput: {
            styleOverrides: {
               root: { borderRadius: "12px", fontSize: "0.95rem", borderColor: "primary.main" },
               input: {
                  fontSize: "0.95rem",
                  "&::placeholder": {
                     fontSize: "0.85rem",
                     color: "rgba(0, 0, 0, 0.6)"
                  }
               }
            }
         }
      },
      typography: {
         body1: { fontSize: "1rem", fontWeight: 400, lineHeight: 1.5 },
         fontFamily:
        "\"Inter\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Helvetica, Arial, sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\"",
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
            textTransform: "uppercase"
         },
         h1: { fontSize: "3.5rem", fontWeight: 500, lineHeight: 1.2 },
         h2: { fontSize: "3rem", fontWeight: 500, lineHeight: 1.2 },
         h3: { fontSize: "2.25rem", fontWeight: 500, lineHeight: 1.2 },
         h4: { fontSize: "2rem", fontWeight: 500, lineHeight: 1.2 },
         h5: { fontSize: "1.5rem", fontWeight: 500, lineHeight: 1.2 },
         h6: { fontSize: "1.125rem", fontWeight: 500, lineHeight: 1.2 }
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
         "0px 9px 46px rgba(0, 0, 0, 0.08)"
      ]
   })
);