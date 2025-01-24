import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import { useTheme } from '@mui/material/styles';
import ListItemButton from '@mui/material/ListItemButton';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import { useLocation } from 'react-router';
import { alpha } from '@mui/material/styles';

export type SidebarContentProps = {
   open: boolean;
   onClose: () => void;
   data: {
      path: string;
      title: string;
      icon: React.ReactNode;
      info?: React.ReactNode;
   }[];
   slots?: {
      topArea?: React.ReactNode;
      bottomArea?: React.ReactNode;
   };
   sx?: SxProps<Theme>;
};

export function Sidebar(props: SidebarContentProps) {
   const { open, onClose, data, slots, sx } = props;
   const theme = useTheme();

   return (
      <Drawer
         open={open}
         onClose={onClose}
         sx={{
            [`& .${drawerClasses.paper}`]: {
               pt: 2.5,
               pr: 2.5,
               overflow: 'unset',
               bgcolor: theme.palette.common.white,
               width: '250px',
               borderColor: alpha(theme.palette.grey[500], 0.08),
               zIndex: 1101,
               ...sx,
            },
         }}
      >
         <SideBarContent open={open} onClose={onClose} data={data} slots={slots} />
      </Drawer>
   );
}

export function SideBarContent(props: SidebarContentProps) {
   const { data, sx } = props;
   const theme = useTheme();
   const location = useLocation();

   return (
      <>
         <Box
            component="img"
            src="logo.svg"
            alt="Logo"
            sx={{ width: 125, height: "auto" }}
         />
         <Box component="nav" display="flex" flex="1 1 auto" flexDirection="column" sx={sx}>
            <Box component="ul" gap={0.5} display="flex" flexDirection="column" paddingLeft={"20px"}>
               {data.map((item) => {
                  const isActivated = item.path === location.pathname;

                  return (
                     <ListItem disableGutters disablePadding key={item.title}>
                        <ListItemButton
                           disableGutters
                           href={item.path}
                           sx={{
                              pl: 2,
                              py: 1,
                              gap: 2,
                              pr: 1.5,
                              borderRadius: 0.75,
                              typography: 'body2',
                              fontWeight: 'fontWeightMedium',
                              color: theme.palette.text.secondary,
                              minHeight: '44px',
                              ...(isActivated && {
                                 fontWeight: 'fontWeightSemiBold',
                                 bgcolor: alpha(theme.palette.primary.main, 0.08),
                                 color: theme.palette.primary.main,
                                 '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.16),
                                 },
                              }),
                           }}
                        >
                           <Box component="span" sx={{ width: 24, height: 24 }}>
                              {item.icon}
                           </Box>

                           <Box component="span" flexGrow={1}>
                              {item.title}
                           </Box>

                           {item.info && item.info}
                        </ListItemButton>
                     </ListItem>
                  );
               })}
            </Box>
         </Box>
      </>
   );
}
