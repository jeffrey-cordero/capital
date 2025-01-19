import { faMarker } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import useMediaQuery from "@mui/material/useMediaQuery";
import { BrowserView, MobileView } from "react-device-detect";
import PerfectScrollbar from "react-perfect-scrollbar";

export const drawerWidth = 260;
export const appDrawerWidth = 320;

// const NavItem = ({ item, level }) => {
//    const theme = useTheme();
//    const dispatch = useDispatch();
//    const customization = useSelector((state) => state.customization);
//    const matchesSM = useMediaQuery(theme.breakpoints.down('lg'));

//    const Icon = item.icon;
//    const itemIcon = item?.icon ? (
//        <Icon stroke={1.5} size="1.3rem" />
//    ) : (
//        <FiberManualRecordIcon
//            sx={{
//                width: customization.isOpen.findIndex((id) => id === item?.id) > -1 ? 8 : 6,
//                height: customization.isOpen.findIndex((id) => id === item?.id) > -1 ? 8 : 6
//            }}
//            fontSize={level > 0 ? 'inherit' : 'medium'}
//        />
//    );

//    let itemTarget = '_self';
//    if (item.target) {
//        itemTarget = '_blank';
//    }

//    let listItemProps = {
//        component: forwardRef((props, ref) => <Link ref={ref} {...props} to={item.url} target={itemTarget} />)
//    };
//    if (item?.external) {
//        listItemProps = { component: 'a', href: item.url, target: itemTarget };
//    }

//    const itemHandler = (id) => {
//        dispatch({ type: MENU_OPEN, id });
//        if (matchesSM) dispatch({ type: SET_MENU, opened: false });
//    };

//    // active menu item on page load
//    useEffect(() => {
//        const currentIndex = document.location.pathname
//            .toString()
//            .split('/')
//            .findIndex((id) => id === item.id);
//        if (currentIndex > -1) {
//          dispatch({ type: MENU_OPEN, id: item.id });
//        }
//        // eslint-disable-next-line
//    }, []);

//    return (
//        <ListItemButton
//            {...listItemProps}
//            disabled={item.disabled}
//            sx={{
//                borderRadius: `${customization.borderRadius}px`,
//                mb: 0.5,
//                alignItems: 'flex-start',
//                backgroundColor: level > 1 ? 'transparent !important' : 'inherit',
//                py: level > 1 ? 1 : 1.25,
//                pl: `${level * 24}px`
//            }}
//            selected={customization.isOpen.findIndex((id) => id === item.id) > -1}
//            onClick={() => itemHandler(item.id)}
//        >
//            <ListItemIcon sx={{ my: 'auto', minWidth: !item?.icon ? 18 : 36 }}>{itemIcon}</ListItemIcon>
//            <ListItemText
//                primary={
//                    <Typography variant={customization.isOpen.findIndex((id) => id === item.id) > -1 ? 'h5' : 'body1'} color="inherit">
//                        {item.title}
//                    </Typography>
//                }
//                secondary={
//                    item.caption && (
//                        <Typography variant="caption" sx={{ ...theme.typography.subMenuCaption }} display="block" gutterBottom>
//                            {item.caption}
//                        </Typography>
//                    )
//                }
//            />
//            {item.chip && (
//                <Chip
//                    color={item.chip.color}
//                    variant={item.chip.variant}
//                    size={item.chip.size}
//                    label={item.chip.label}
//                    avatar={item.chip.avatar && <Avatar>{item.chip.avatar}</Avatar>}
//                />
//            )}
//        </ListItemButton>
//    );
// };

export default function SideBar({ drawerOpen, drawerToggle, window }: any) {
   const theme = useTheme();
   const matchUpMd = useMediaQuery(theme.breakpoints.up("md"));

   const drawer = (
      <>
         <Box sx = { { display: { xs: "block", md: "none" } } }>
            <Box sx = { { display: "flex", p: 2, mx: "auto" } }>
               <FontAwesomeIcon icon = { faMarker } />
            </Box>
         </Box>
         <BrowserView>
            <PerfectScrollbar
               component = "div"
               style = {
                  {
                     height: !matchUpMd ? "calc(100vh - 56px)" : "calc(100vh - 88px)",
                     paddingLeft: "16px",
                     paddingRight: "16px"
                  }
               }
            >
               { /* <MenuList />
           <MenuCard /> */ }
               <Stack
                  direction = "row"
                  justifyContent = "center"
                  sx = { { mb: 2 } }
               >
                  { /* <Chip label={import.meta.env.VITE_APP_VERSION} disabled chipcolor="secondary" size="small" sx={{ cursor: 'pointer' }} /> */ }
               </Stack>
            </PerfectScrollbar>
         </BrowserView>
         <MobileView>
            <Box sx = { { px: 2 } }>
               { /* <MenuList />
           <MenuCard /> */ }
               <Stack
                  direction = "row"
                  justifyContent = "center"
                  sx = { { mb: 2 } }
               >
                  { /* <Chip label={import.meta.env.VITE_APP_VERSION} disabled chipcolor="secondary" size="small" sx={{ cursor: 'pointer' }} /> */ }
               </Stack>
            </Box>
         </MobileView>
      </>
   );

   const container = window !== undefined ? () => window.document.body : undefined;

   return (
      <Box
         aria-label = "mailbox folders"
         component = "nav"
         sx = { { flexShrink: { md: 0 }, width: matchUpMd ? drawerWidth : "auto" } }
      >
         <Drawer
            ModalProps = { { keepMounted: true } }
            anchor = "left"
            color = "inherit"
            container = { container }
            onClose = { drawerToggle }
            open = { drawerOpen }
            sx = {
               {
                  "& .MuiDrawer-paper": {
                     width: drawerWidth,
                     background: theme.palette.background.default,
                     color: theme.palette.text.primary,
                     borderRight: "none",
                     [theme.breakpoints.up("md")]: {
                        top: "88px"
                     }
                  }
               }
            }
            variant = { matchUpMd ? "persistent" : "temporary" }
         >
            { drawer }
         </Drawer>
      </Box>
   );
};