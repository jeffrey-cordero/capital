import {
   faBarsStaggered,
   faBusinessTime,
   faChartSimple,
   faGears,
   faMoneyCheckDollar,
   faNewspaper,
   faPieChart,
   faPlaneArrival,
   faRightFromBracket,
   faUnlockKeyhole,
   faUserPlus,
   type IconDefinition
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconButton, Stack, Switch, Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Drawer, { drawerClasses } from "@mui/material/Drawer";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import { alpha, styled, useTheme } from "@mui/material/styles";
import { type Dispatch, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type NavigateFunction, useLocation, useNavigate } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { toggleTheme } from "@/redux/slices/theme";
import type { RootState } from "@/redux/store";

/**
 * The function to clear the user's authentication and re-route to the login page.
 *
 * @param {Dispatch<any>} dispatch - The dispatch function
 * @param {NavigateFunction} navigate - The navigate function
 */
export async function clearAuthentication(
   dispatch: Dispatch<any>,
   navigate: NavigateFunction
): Promise<void> {
   const logout = await sendApiRequest<{ success: boolean }>(
      "authentication/logout", "POST", null, dispatch as any, navigate
   );

   if (typeof logout === "object" && logout?.success) {
      // Navigate to the login page to reset the global state
      window.location.pathname = "/login";
   }
};

/**
 * The type definition for the navigation link.
 *
 * @interface NavigationLink
 * @property {string} path - The path of the navigation link
 * @property {string} title - The title of the navigation link
 * @property {IconDefinition} icon - The icon of the navigation link
 */
interface NavigationLink {
   path: string;
   title: string;
   icon: IconDefinition;
}

/**
 * The landing page navigation links.
 */
const landing: NavigationLink[] = [{
   path: "/",
   title: "Home",
   icon: faPlaneArrival
}, {
   path: "/login",
   title: "Login",
   icon: faUnlockKeyhole
}, {
   path: "/register",
   title: "Register",
   icon: faUserPlus
}];

/**
 * The dashboard navigation links for authenticated users.
 */
const dashboard: NavigationLink[] = [{
   path: "/dashboard",
   title: "Dashboard",
   icon: faChartSimple
}, {
   path: "/dashboard/accounts",
   title: "Accounts",
   icon: faMoneyCheckDollar
}, {
   path: "/dashboard/budgets",
   title: "Budgets",
   icon: faPieChart
}, {
   path: "/dashboard#economy",
   title: "Economy",
   icon: faBusinessTime
}, {
   path: "/dashboard#news",
   title: "News",
   icon: faNewspaper
}, {
   path: "/dashboard/settings",
   title: "Settings",
   icon: faGears
}];

/**
 * The styled MaterialUISwitch component to match the application's theme.
 */
const MaterialUISwitch = styled(Switch)(({ theme }) => ({
   width: 58,
   height: 30,
   padding: 7,
   "& .MuiSwitch-switchBase": {
      margin: 1,
      padding: 0,
      transform: "translateX(6px)",
      "&.Mui-checked": {
         color: "#fff",
         transform: "translateX(22px)",
         "& .MuiSwitch-thumb:before": {
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
               "#fff"
            )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`
         },
         "& + .MuiSwitch-track": {
            opacity: 1,
            backgroundColor: "#aab4be",
            ...theme.applyStyles("dark", {
               backgroundColor: "#8796A5"
            })
         }
      }
   },
   "& .MuiSwitch-thumb": {
      backgroundColor: "#FFD700",
      width: 28,
      height: 28,
      "&::before": {
         content: "''",
         position: "absolute",
         width: "100%",
         height: "100%",
         left: 0,
         top: 0,
         backgroundRepeat: "no-repeat",
         backgroundPosition: "center",
         backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
            "#fff"
         )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`
      },
      ...theme.applyStyles("dark", {
         backgroundColor: theme.palette.primary.main
      })
   },
   "& .MuiSwitch-track": {
      opacity: 1,
      backgroundColor: "#aab4be",
      borderRadius: 20 / 2,
      ...theme.applyStyles("dark", {
         backgroundColor: "#8796A5"
      })
   }
}));

/**
 * The props for the SideBarContent component.
 *
 * @interface SideBarContentProps
 * @property {NavigationLink[]} links - The navigation links
 * @property {() => void} onClose - The function to call when the sidebar is closed
 */
interface SideBarContentProps {
   links: NavigationLink[];
   onClose: () => void;
}

/**
 * The SideBar component to render the sidebar.
 *
 * @returns {React.ReactNode} The SideBar component
 */
export function SideBar(): React.ReactNode {
   const authenticated = useSelector((state: RootState) => state.authentication.value);
   const theme = useTheme();
   const [open, setOpen] = useState(false);

   const openSideBar = useCallback(() => {
      setOpen(true);
   }, []);

   const closeSideBar = useCallback(() => {
      setOpen(false);
   }, []);

   return (
      <Box>
         <IconButton
            color = "primary"
            onClick = { openSideBar }
            sx = {
               {
                  position: "absolute",
                  top: 10,
                  left: 5,
                  zIndex: 2
               }
            }
         >
            <FontAwesomeIcon icon = { faBarsStaggered } />
         </IconButton>
         <Drawer
            onClose = { closeSideBar }
            open = { open }
            sx = {
               {
                  [`& .${drawerClasses.paper}`]: {
                     pt: 2.5,
                     pr: 1,
                     overflow: "unset",
                     width: "250px",
                     borderColor: alpha(theme.palette.grey[500], 0.08),
                     backgroundColor: theme.palette.mode === "dark" ? "black" : theme.palette.background.default,
                     zIndex: 3
                  }
               }
            }
         >
            <SideBarContent
               links = { authenticated ? dashboard : landing }
               onClose = { closeSideBar }
            />
         </Drawer>
      </Box>
   );
}

/**
 * The SideBarContent component to render the sidebar content.
 *
 * @param {SideBarContentProps} props - The props for the SideBarContent component
 * @returns {React.ReactNode} The SideBarContent component
 */
function SideBarContent({ links, onClose }: SideBarContentProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate(), theme = useTheme(), location = useLocation();

   const navigateToPage = useCallback((path: string) => {
      navigate(path);
      onClose();
   }, [navigate, onClose]);

   const logout = useCallback(async() => {
      await clearAuthentication(dispatch, navigate);
      onClose();
   }, [dispatch, navigate, onClose]);

   const updateTheme = useCallback(() => {
      dispatch(toggleTheme());
   }, [dispatch]);

   return (
      <Box sx = { { position: "relative", height: "100%", textAlign: "center" } }>
         <Stack>
            <Box
               alt = "Logo"
               component = "img"
               src = "/svg/logo.svg"
               sx = { { width: 125, height: "auto" } }
            />
            <Typography
               sx = { { fontWeight: "fontWeightBold", color: theme.palette.primary.main } }
               variant = "h4"
            >
               Capital
            </Typography>
         </Stack>
         <Box
            component = "nav"
            sx = { { display: "flex", height: "100%", flexDirection: "column", justifyContent: "space-between" } }
         >
            <Box
               component = "ul"
               sx = { { gap: 0.5, pl: 1 } }
            >
               {
                  links.map((link) => {
                     const isActivated = link.path === location.pathname || link.path + "/" === location.pathname;

                     return (
                        <ListItem
                           disableGutters = { true }
                           disablePadding = { true }
                           key = { link.title }
                        >
                           <ListItemButton
                              disableGutters = { true }
                              onClick = { () => navigateToPage(link.path) }
                              sx = {
                                 {
                                    pl: 1.5,
                                    py: 1,
                                    gap: 2,
                                    pr: 1.5,
                                    borderRadius: 0.75,
                                    typography: "body2",
                                    fontWeight: "fontWeightMedium",
                                    color: theme.palette.text.secondary,
                                    minHeight: "44px",
                                    ...(isActivated && {
                                       fontWeight: "fontWeightSemiBold",
                                       bgcolor: alpha(theme.palette.primary.main, 0.16),
                                       color: alpha(theme.palette.primary.main, 0.90),
                                       "&:hover": {
                                          bgcolor: alpha(theme.palette.primary.main, 0.24),
                                          color: theme.palette.primary.main
                                       }
                                    })
                                 }
                              }
                           >
                              <Box
                                 component = "span"
                                 sx = { { width: 24, height: 24 } }
                              >
                                 <FontAwesomeIcon icon = { link.icon } />
                              </Box>
                              <Box
                                 component = "span"
                                 flexGrow = { 1 }
                              >
                                 { link.title }
                              </Box>
                           </ListItemButton>
                        </ListItem>
                     );
                  })
               }
            </Box>
            <Box sx = { { position: "relative", mb: 22 } }>
               {
                  links === dashboard ? (
                     <Box>
                        <Stack
                           direction = "column"
                           sx = {
                              {
                                 display: "flex",
                                 justifyContent: "center",
                                 alignItems: "center"
                              }
                           }
                        >
                           <MaterialUISwitch
                              checked = { theme.palette.mode === "dark" }
                              id = "theme-switch"
                              onChange = { () => dispatch(toggleTheme()) }
                           />
                           <IconButton
                              aria-label = "Logout"
                              disableRipple = { true }
                              onClick = { logout }
                              size = "medium"
                              sx = {
                                 {
                                    color: theme.palette.error.main
                                 }
                              }
                           >
                              <FontAwesomeIcon icon = { faRightFromBracket } />
                           </IconButton>
                        </Stack>
                     </Box>
                  ) : (
                     <Box>
                        <MaterialUISwitch
                           checked = { theme.palette.mode === "dark" }
                           id = "theme-switch"
                           onChange = { updateTheme }
                           sx = { { m: 1 } }
                        />
                     </Box>
                  )
               }
            </Box>
         </Box>
      </Box>
   );
}