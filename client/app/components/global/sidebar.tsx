import { faBars, faHamburger, faHome } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  IconButton,
  Toolbar,
  Box,
} from "@mui/material";
import { useState } from "react";

const Sidebar = () => {
   const [isOpen, setIsOpen] = useState(false);
 
   const toggleDrawer = () => {
     setIsOpen(!isOpen);
   };
 
   return (
     <Box sx={{ display: "flex" }}>
       {/* Top App Bar */}
       <Toolbar
         sx={{
           display: "flex",
           justifyContent: "space-between",
           color: "black",
         }}
       >
         <IconButton color="inherit" onClick={toggleDrawer}>
           <FontAwesomeIcon icon = {faBars} />
         </IconButton>
       </Toolbar>
 
       {/* Sidebar Drawer */}
       <Drawer anchor="left" open={isOpen} onClose={toggleDrawer}>
         <Box
           sx={{ width: 250 }}
           role="presentation"
           onClick={toggleDrawer}
           onKeyDown={toggleDrawer}
         >
           <List>
            <ListItemIcon>
               <FontAwesomeIcon icon = {faHome} />
            </ListItemIcon>
            <ListItemText primary="Home" />

           </List>
         </Box>
       </Drawer>
     </Box>
   );
 };
 
 export default Sidebar;