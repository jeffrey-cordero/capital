
import Router from "@/components/auth/router";
import { Sidebar, type SidebarContentProps } from "@/components/global/sidebar";
import { faBank, faBarsStaggered, faGears, faHome, faPieChart } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconButton } from "@mui/material";
import { useState } from "react";

export default function Layout() {
   const [open, setOpen] = useState(false);
   
   const sidebarProps: SidebarContentProps = {
      open: open,
      onClose: () => setOpen(false),
      data: [{
         path: "/home",
         title: "Home",
         icon: <FontAwesomeIcon icon={faHome} />,
      }, {
         path: "/accounts",
         title: "Accounts",
         icon: <FontAwesomeIcon icon={faBank} />,
      }, {
         path: "/budget",
         title: "Budget",
         icon: <FontAwesomeIcon icon={faPieChart} />,
      }, {
         path: "/settings",
         title: "Settings",
         icon: <FontAwesomeIcon icon={faGears} />,
      }]
   }

   return (
      <div>
         <Sidebar {...sidebarProps} />
         <IconButton 
            sx={{ position: 'absolute', top: '10px', left: '10px' }} 
            onClick={() => setOpen(!open)}
            color="primary"
         >
            <FontAwesomeIcon icon={faBarsStaggered} />
         </IconButton>
         <Router home = { true } />
      </div>
   );
}