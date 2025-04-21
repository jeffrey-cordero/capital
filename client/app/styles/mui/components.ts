import { type Components, svgIconClasses } from "@mui/material";
import { chipClasses } from "@mui/material/Chip";

import { brand, gray, green, red } from "@/styles/mui/colors";

/**
 * Main MUI component overrides.
 * @see https://mui.com/material-ui/customization/theming/
 */
export const components: Components = {
   MuiButton: {
      styleOverrides: {
         loadingIndicator: {
            color: "hsl(210deg 98% 48%)"
         },
         root: { borderRadius: "10px", textTransform: "none" },
         sizeSmall: { padding: "6px 16px" },
         sizeMedium: { padding: "8px 20px" },
         sizeLarge: { padding: "11px 24px" },
         textSizeSmall: { padding: "7px 12px" },
         textSizeMedium: { padding: "9px 16px" },
         textSizeLarge: { padding: "12px 16px" }
      }
   },
   MuiIconButton: {
      defaultProps: {
         disableRipple: true,
         disableFocusRipple: true,
         disableTouchRipple: true
      }
   },
   MuiOutlinedInput: {
      styleOverrides: {
         root: {
            borderRadius: "12px",
            fontSize: "0.90rem",
            borderColor: "primary.main",
            overflow: "hidden"
         },
         input: {
            fontSize: "0.95rem",
            "&::placeholder": {
               fontSize: "0.85rem",
               color: "rgba(0, 0, 0, 0.6)"
            },
            borderRadius: "none"
         }
      }
   },
   MuiFormHelperText: {
      styleOverrides: {
         root: {
            "&.Mui-error": {
               fontSize: "0.8rem"
            }
         }
      }
   },
   MuiChip: {
      defaultProps: {
         size: "small"
      },
      styleOverrides: {
         root: ({ theme }: { theme: any }) => ({
            border: "1px solid",
            borderRadius: "999px",
            [`& .${chipClasses.label}`]: {
               fontWeight: 600
            },
            variants: [
               {
                  props: {
                     color: "default"
                  },
                  style: {
                     borderColor: gray[300],
                     backgroundColor: gray[50],
                     [`& .${chipClasses.label}`]: {
                        color: gray[500]
                     },
                     [`& .${chipClasses.icon}`]: {
                        color: gray[500]
                     },
                     ...theme.applyStyles("dark", {
                        borderColor: gray[200],
                        backgroundColor: gray[700],
                        [`& .${chipClasses.label}`]: {
                           color: gray[200]
                        },
                        [`& .${chipClasses.icon}`]: {
                           color: gray[200]
                        }
                     })
                  }
               },
               {
                  props: {
                     color: "success"
                  },
                  style: {
                     borderColor: green[300],
                     backgroundColor: green[50],
                     [`& .${chipClasses.label}`]: {
                        color: green[500]
                     },
                     [`& .${chipClasses.icon}`]: {
                        color: green[500]
                     },
                     ...theme.applyStyles("dark", {
                        borderColor: green[500],
                        backgroundColor: green[800],
                        [`& .${chipClasses.label}`]: {
                           color: green[300]
                        },
                        [`& .${chipClasses.icon}`]: {
                           color: green[300]
                        }
                     })
                  }
               },
               {
                  props: {
                     color: "error"
                  },
                  style: {
                     borderColor: red[200],
                     backgroundColor: red[50],
                     [`& .${chipClasses.label}`]: {
                        color: red[500]
                     },
                     [`& .${chipClasses.icon}`]: {
                        color: red[500]
                     },
                     ...theme.applyStyles("dark", {
                        borderColor: red[500],
                        backgroundColor: red[800],
                        [`& .${chipClasses.label}`]: {
                           color: red[200]
                        },
                        [`& .${chipClasses.icon}`]: {
                           color: red[300]
                        }
                     })
                  }
               }, {
                  props: {
                     color: "primary"
                  },
                  style: {
                     borderColor: brand[200],
                     backgroundColor: brand[50],
                     [`& .${chipClasses.label}`]: {
                        color: brand[400]
                     },
                     [`& .${chipClasses.icon}`]: {
                        color: brand[400]
                     },
                     ...theme.applyStyles("dark", {
                        borderColor: brand[300],
                        backgroundColor: brand[800],
                        [`& .${chipClasses.label}`]: {
                           color: brand[200]
                        },
                        [`& .${chipClasses.icon}`]: {
                           color: brand[300]
                        }
                     })
                  }
               },
               {
                  props: { size: "small" },
                  style: {
                     maxHeight: 20,
                     [`& .${chipClasses.label}`]: {
                        fontSize: theme.typography.caption.fontSize
                     },
                     [`& .${svgIconClasses.root}`]: {
                        fontSize: theme.typography.caption.fontSize
                     }
                  }
               },
               {
                  props: { size: "medium" },
                  style: {
                     [`& .${chipClasses.label}`]: {
                        fontSize: theme.typography.caption.fontSize
                     }
                  }
               }
            ]
         })
      }
   }
};