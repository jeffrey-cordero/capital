import { faBank, faBarsStaggered, faChartLine, faGears, faHome, faNewspaper, faPieChart, faPlaneArrival, faQuoteLeft, faRightFromBracket, faUnlockKeyhole, faUserPlus, type IconDefinition }  from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconButton, Stack, Switch, Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Drawer, { drawerClasses } from "@mui/material/Drawer";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import { alpha, styled, useTheme } from "@mui/material/styles";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router";

import { toggleTheme } from "@/redux/slices/theme";
import type { RootState } from "@/redux/store";
import useAuthenticationMutation from "@/tanstack/mutations/authenticationMutation";

const landing = [{
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

const home = [{
   path: "/home",
   title: "Home",
   icon: faHome
}, {
   path: "/home/accounts",
   title: "Accounts",
   icon: faBank
}, {
   path: "/home/budget",
   title: "Budget",
   icon: faPieChart
}, {
   path: "/home#indicators",
   title: "Indicators",
   icon: faChartLine
}, {
   path: "/home#news",
   title: "News",
   icon: faNewspaper
}, {
   path: "/home#quotes",
   title: "Quotes",
   icon: faQuoteLeft
}, {
   path: "/settings",
   title: "Settings",
   icon: faGears
}];

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

export function SideBar() {
   const [open, setOpen] = useState(false);
   const authenticated = useSelector((state: RootState) => state.authentication.value);
   const theme = useTheme();

   return (
      <Box>
         <IconButton
            color = "primary"
            onClick = { () => setOpen(true) }
            sx = {
               {
                  position: "absolute",
                  top: 10,
                  left: 5
               }
            }
         >
            <FontAwesomeIcon icon = { faBarsStaggered } />
         </IconButton>
         <Drawer
            onClose = { () => setOpen(false) }
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
                     zIndex: 1101
                  }
               }
            }
         >
            <SideBarContent
               links = { authenticated ? home : landing }
               onClose = { () => setOpen(false) }
            />
         </Drawer>
      </Box>
   );
}

interface SideBarContentProps {
   links: {
      path: string;
      title: string;
      icon: IconDefinition;
   }[];
   onClose: () => void;
};

function SideBarContent(props: SideBarContentProps) {
   const { links, onClose } = props;
   const dispatch = useDispatch();
   const queryClient = useQueryClient();
   const mutation = useAuthenticationMutation(false, queryClient, dispatch);
   const theme = useTheme();
   const location = useLocation();

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
                     const isActivated = link.path === location.pathname;

                     return (
                        <ListItem
                           disableGutters = { true }
                           disablePadding = { true }
                           key = { link.title }
                        >
                           <ListItemButton
                              disableGutters = { true }
                              href = { link.path }
                              onClick = { onClose }
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
            <Box
               sx = {
                  {
                     position: "relative",
                     mb: 22
                  }
               }
            >
               {
                  links === home ? (
                     <Box>
                        <Box
                           sx = {
                              {
                                 display: "flex",
                                 justifyContent: "center",
                                 alignItems: "center",
                                 mb: 1
                              }
                           }
                        >
                           <Box
                              alt = "Profile"
                              component = "img"
                              src = "/svg/logo.svg"
                              sx = {
                                 {
                                    width: 58,
                                    height: 58,
                                    borderRadius: "50%",
                                    border: `2px solid ${theme.palette.primary.main}`,
                                    background: "white"
                                 }
                              }
                           />
                        </Box>
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
                              sx = { { m: 1 } }
                           />
                           <IconButton
                              aria-label = "Logout"
                              disableRipple = { true }
                              onClick = { () => mutation.mutate() }
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
                           onChange = { () => dispatch(toggleTheme()) }
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