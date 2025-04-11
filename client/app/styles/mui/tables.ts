import { checkboxClasses } from "@mui/material/Checkbox";
import { formControlClasses } from "@mui/material/FormControl";
import { iconButtonClasses } from "@mui/material/IconButton";
import { listClasses } from "@mui/material/List";
import { listItemIconClasses } from "@mui/material/ListItemIcon";
import { menuItemClasses } from "@mui/material/MenuItem";
import { alpha } from "@mui/material/styles";
import { tablePaginationClasses } from "@mui/material/TablePagination";
import { gridClasses } from "@mui/x-data-grid";

import { gray } from "@/styles/mui/colors";

/**
 * Customizations for the DataGrid component
 * @see https://mui.com/x/api/data-grid/data-grid/
 */
export const tables = {
   MuiDataGrid: {
      styleOverrides: {
         root: ({ theme }: { theme: any }) => ({
            "--DataGrid-overlayHeight": "300px",
            overflow: "clip",
            overflowY: "none",
            backgroundColor: theme.palette.mode === "dark" ? "#2B2B2B" : "#FFFFFF",
            borderColor: theme.palette.mode === "dark" ? "#333B4D" : "#E0E0E0",
            borderWidth: "1.5px",
            [`& .${gridClasses.columnHeader}`]: {
               [`& .${gridClasses.columnHeaderTitle}`]: {
                  fontWeight: "600"
               },
               [`& .${gridClasses.columnHeaderCheckbox}`]: {
                  border: 0
               },
               backgroundColor: theme.palette.mode === "dark" ? "#2a2c37" : "#F5F6FA",
               outline: "none !important",
               border: "0 !important"
            },
            [`& .${gridClasses.footerContainer}`]: {
               border: "none",
               backgroundColor: theme.palette.mode === "dark" ? "#2a2c37" : "#F5F6FA"
            },
            [`& .${gridClasses.iconSeparator}`]: {
               display: "none"
            },
            [`& .${gridClasses.cell}`]: {
               outline: "none !important"
            },
            [`& .${checkboxClasses.root}`]: {
               "& > svg": {
                  fontSize: "1.2rem"
               }
            },
            [`& .${tablePaginationClasses.root}`]: {
               marginRight: theme.spacing(1),
               display: "flex",
               flexWrap: "wrap",
               alignItems: "center",
               justifyContent: "flex-end",
               [`& .${tablePaginationClasses.selectLabel}`]: {
                  display: "block !important"
               },
               [`& .${tablePaginationClasses.select}`]: {
                  display: "inline-flex !important",
                  paddingTop: "3px"
               },
               "& .MuiIconButton-root": {
                  maxHeight: 32,
                  maxWidth: 32,
                  backgroundColor: "none !important",
                  "& > svg": {
                     fontSize: "1rem"
                  }
               }
            },
            [`& .${gridClasses.menuIconButton}, & .${gridClasses.iconButtonContainer} > button`]: {
               transition: "none !important",
               animation: "none !important",
               backgroundColor: "transparent !important"
            }
         }),
         cell: ({ theme }: { theme: any }) => ({ borderTopColor: (theme.vars || theme).palette.divider }),
         menu: () => ({
            [`& .${menuItemClasses.root}`]: {
               margin: "0 4px"
            },
            [`& .${listItemIconClasses.root}`]: {
               marginRight: 0
            },
            [`& .${listClasses.root}`]: {
               paddingLeft: 0,
               paddingRight: 0
            }
         }),
         row: ({ theme }: { theme: any }) => ({
            "&:last-of-type": { borderBottom: `1px solid ${(theme.vars || theme).palette.divider}` },
            "&:hover": {
               backgroundColor: (theme.vars || theme).palette.action.hover
            },
            "&.Mui-selected": {
               background: (theme.vars || theme).palette.action.selected,
               "&:hover": {
                  backgroundColor: (theme.vars || theme).palette.action.hover
               }
            }
         }),
         iconButtonContainer: ({ theme }: { theme: any }) => ({
            [`& .${iconButtonClasses.root}`]: {
               border: "none",
               backgroundColor: "transparent",
               "&:hover": {
                  backgroundColor: alpha(theme.palette.action.selected, 0.3)
               },
               "&:active": {
                  backgroundColor: gray[200]
               },
               ...theme.applyStyles("dark", {
                  color: gray[50],
                  "&:hover": {
                     backgroundColor: gray[800]
                  },
                  "&:active": {
                     backgroundColor: gray[900]
                  }
               })
            }
         }),
         menuIconButton: ({ theme }: { theme: any }) => ({
            border: "none",
            backgroundColor: "transparent",
            "&:hover": {
               backgroundColor: gray[100]
            },
            "&:active": {
               backgroundColor: gray[200]
            },
            ...theme.applyStyles("dark", {
               color: gray[50],
               "&:hover": {
                  backgroundColor: gray[800]
               },
               "&:active": {
                  backgroundColor: gray[900]
               }
            })
         }),
         filterForm: ({ theme }: { theme: any }) => ({
            gap: theme.spacing(2),
            alignItems: "flex-start",
            flexDirection: "column",
            padding: "24px 10px",
            [`& .${gridClasses.filterFormDeleteIcon}`]: {
               display: "none"
            },
            [`& .${formControlClasses.root}`]: {
               width: "100%",
               padding: "0px 2px"
            }
         }),
         columnsManagementHeader: () => ({
            padding: "18px 14px 8px 14px"
         }),
         columnHeaderTitleContainer: {
            flexGrow: 1,
            justifyContent: "space-between"
         },
         columnHeaderDraggableContainer: { paddingRight: 2 }
      }
   }
};