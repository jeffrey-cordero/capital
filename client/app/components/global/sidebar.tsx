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
import { IconButton, Stack, Switch } from "@mui/material";
import Box from "@mui/material/Box";
import Drawer, { drawerClasses } from "@mui/material/Drawer";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import { alpha, styled, useTheme } from "@mui/material/styles";
import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { toggleTheme } from "@/redux/slices/theme";
import type { RootState } from "@/redux/store";

/**
 * Navigation link definition
 *
 * @property {string} path - Navigation target path
 * @property {string} title - Display text
 * @property {IconDefinition} icon - FontAwesome icon
 */
interface NavigationLink {
   path: string;
   title: string;
   icon: IconDefinition;
}

/**
 * Landing page navigation links
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
 * Dashboard navigation links for authenticated users
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
 * Styled switch component for theme toggling
 *
 * @returns {CreateStyledComponent} The MaterialUISwitch component
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
 * Props for the SideBarContent component
 *
 * @property {NavigationLink[]} links - Navigation links to display
 * @property {() => void} onClose - Sidebar close handler
 */
interface SideBarContentProps {
   links: NavigationLink[];
   onClose: () => void;
}

/**
 * Sidebar internal content with navigation links
 *
 * @param {SideBarContentProps} props - Sidebar content component props
 * @returns {React.ReactNode} The SideBarContent component
 */
function SideBarContent({ links, onClose }: SideBarContentProps): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate(), theme = useTheme(), location = useLocation();

   // Action handlers
   const visit = useCallback((path: string) => {
      navigate(path);
      onClose();
   }, [navigate, onClose]);

   const logout = useCallback(async() => {
      const response = await sendApiRequest<{ success: boolean }>(
         "authentication/logout", "POST", null, dispatch, navigate
      );

      if (typeof response === "object" && response?.success) {
         window.location.pathname = "/login";
      }
   }, [dispatch, navigate]);

   const toggle = useCallback(() => {
      dispatch(toggleTheme());
   }, [dispatch]);

   return (
      <Box sx = { { position: "relative", height: "100%", textAlign: "center" } }>
         <Stack>
            <Box
               alt = "Logo"
               component = "img"
               src = "/svg/logo.svg"
               sx = { { width: 150, mb: -0.5, height: "auto" } }
            />
         </Stack>
         <Box
            component = "nav"
            sx = { { display: "flex", height: "100%", flexDirection: "column", justifyContent: "space-between" } }
         >
            <Box
               component = "ul"
               sx = { { gap: 0.5, pl: 0.75 } }
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
                              onClick = { () => visit(link.path) }
                              sx = {
                                 {
                                    pl: 1.5,
                                    py: 1,
                                    gap: 2,
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
            <Box sx = { { position: "relative", mb: 19 } }>
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
                           onChange = { toggle }
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

/**
 * Navigation sidebar with navigation links, which displays different
 * navigation options based on authentication state
 *
 * @returns {React.ReactNode} The SideBar component
 */
export function SideBar(): React.ReactNode {
   const theme = useTheme();
   const authenticated = useSelector((state: RootState) => state.authentication.value);
   const [open, setOpen] = useState(false);

   // Open/close handlers
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
                     pr: 0.75,
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