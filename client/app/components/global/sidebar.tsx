import { faBank, faBarsStaggered, faChartLine, faHome, faIdCard, faMoon, faNewspaper, faPieChart, faPlaneArrival, faQuoteLeft, faRightFromBracket, faSun, faUnlockKeyhole, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconButton, Stack, Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Drawer, { drawerClasses } from "@mui/material/Drawer";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router";

import { toggle } from "@/redux/slices/theme";
import type { RootState } from "@/redux/store";
import { logout } from "@/redux/slices/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clearAuthentication } from "@/lib/auth";

const landing = [{
   path: "/",
   title: "Landing",
   icon: faPlaneArrival
}, {
   path: "/login",
   title: "Login",
   icon: faUnlockKeyhole
}, {
   path: "/register",
   title: "Register",
   icon: faIdCard
}
];

const home = [{
   path: "/home",
   title: "Home",
   icon: faHome
}, {
   path: "/accounts",
   title: "Accounts",
   icon: faBank
}, {
   path: "/budget",
   title: "Budget",
   icon: faPieChart
}, {
   path: "/home/#finances",
   title: "Finances",
   icon: faChartLine
}, {
   path: "/home/#news",
   title: "News",
   icon: faNewspaper
}, {
   path: "/home/#quotes",
   title: "Quotes",
   icon: faQuoteLeft
}];

export function SideBar() {
   const [open, setOpen] = useState(false);
   const authenticated = useSelector((state: RootState) => state.auth.value);
   const theme = useTheme();

   return (
      <Box>
         <IconButton
            onClick={() => setOpen(true)}
            sx={
               {
                  position: "absolute",
                  top: 15,
                  left: 15,
                  color: theme.palette.primary.main
               }
            }
         >
            <FontAwesomeIcon icon={faBarsStaggered} />
         </IconButton>
         <Drawer
            onClose={() => setOpen(false)}
            open={open}
            sx={
               {
                  [`& .${drawerClasses.paper}`]: {
                     pt: 2.5,
                     pr: 1.5,
                     overflow: "unset",
                     width: "250px",
                     borderColor: alpha(theme.palette.grey[500], 0.08),
                     zIndex: 1101
                  }
               }
            }
         >
            <SideBarContent links={authenticated ? home : landing} />
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
};

function SideBarContent(props: SideBarContentProps) {
   const { links } = props;
   const dispatch = useDispatch();
   const queryClient = useQueryClient();
   const theme = useTheme();
   const location = useLocation();
   
   const mutation = useMutation({
      mutationFn: clearAuthentication,
      onSuccess: () => {
         // Update cached authentication status
         queryClient.setQueriesData({ queryKey: "auth" }, false);

         // Update Redux store
         dispatch(logout());

         // Navigate to the login page
         window.location.reload();
      },
      onError: (error: any) => {
         console.error(error);
      }
   });

   return (
      <Box sx={{ position: "relative", height: "100%", textAlign: "center" }}>
         <Stack>
            <Box
               alt="Logo"
               component="img"
               src="logo.svg"
               sx={{ width: 125, height: "auto", }}
            />
            <Typography variant="h4" sx={{ fontWeight: "fontWeightBold", color: theme.palette.primary.main }}>
               Capital
            </Typography>
         </Stack>

         <Box
            component="nav"
            sx={{ display: "flex", height: "100%", flexDirection: "column", justifyContent: "space-between" }}
         >
            <Box
               component="ul"
               sx={{ gap: 0.5, pl: 1.5 }}
            >
               {
                  links.map((link) => {
                     const isActivated = link.path === location.pathname;

                     return (
                        <ListItem
                           disableGutters={true}
                           disablePadding={true}
                           key={link.title}
                        >
                           <ListItemButton
                              disableGutters={true}
                              href={link.path}
                              sx={
                                 {
                                    pl: 2,
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
                                       bgcolor: alpha(theme.palette.primary.main, 0.08),
                                       color: theme.palette.primary.main,
                                       "&:hover": {
                                          bgcolor: alpha(theme.palette.primary.main, 0.16)
                                       }
                                    })
                                 }
                              }
                           >
                              <Box
                                 component="span"
                                 sx={{ width: 24, height: 24 }}
                              >
                                 <FontAwesomeIcon icon={link.icon} />
                              </Box>

                              <Box
                                 component="span"
                                 flexGrow={1}
                              >
                                 {link.title}
                              </Box>
                           </ListItemButton>
                        </ListItem>
                     );
                  })
               }
            </Box>
            <Box
               sx={{
                  position: "relative",
                  mb: 22
               }}
            >
               {
                  links === home ? (
                     <Box>
                        <Box
                           sx={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              mb: 1,
                           }}
                        >
                           <Box
                              component="img"
                              src="/logo.svg"
                              alt="Profile"
                              sx={{
                                 width: 64,
                                 height: 64,
                                 borderRadius: "50%",
                                 border: `2px solid ${theme.palette.primary.main}`,
                              }}
                           />
                        </Box>
                        <Stack
                           direction="row"
                           sx={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                           }}
                        >
                           <IconButton
                              aria-label="Logout"
                              onClick={() => mutation.mutate()}
                              sx={{
                                 color: theme.palette.error.main,
                              }}
                              size="medium"
                              disableRipple={true}
                           >
                              <FontAwesomeIcon icon={faRightFromBracket} />
                           </IconButton>
                           <IconButton
                              aria-controls="color-scheme-menu"
                              aria-expanded="true"
                              aria-haspopup="true"
                              data-screenshot="toggle-mode"
                              onClick={() => dispatch(toggle())}
                              size="medium"
                              disableRipple={true}
                           >
                              <FontAwesomeIcon
                                 icon={theme.palette.mode === "light" ? faSun : faMoon}
                                 color={theme.palette.mode === "light" ? "#FFD700" : theme.palette.primary.main}
                              />
                           </IconButton>
                        </Stack>
                     </Box>
                  ) : (
                     <Box>
                        <IconButton
                           aria-controls="color-scheme-menu"
                           aria-expanded="true"
                           aria-haspopup="true"
                           data-screenshot="toggle-mode"
                           onClick={() => dispatch(toggle())}
                           size="medium"
                           disableRipple={true}
                        >
                           <FontAwesomeIcon
                              icon={theme.palette.mode === "light" ? faSun : faMoon}
                              color={theme.palette.mode === "light" ? "#FFD700" : theme.palette.primary.main}
                           />
                        </IconButton>
                     </Box>
                  )
               }
            </Box>
         </Box>
      </Box>
   );
}