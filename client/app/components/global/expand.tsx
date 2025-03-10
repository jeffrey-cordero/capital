import { IconButton, type IconButtonProps, styled } from "@mui/material";

interface ExpandProps extends IconButtonProps {
   expand: boolean;
}

export const Expand = styled(({ expand, ...other }: ExpandProps) => { // eslint-disable-line
   return <IconButton { ...other } />;
})(({ theme }) => ({
   margin: "0",
   padding: "0 8px",
   transition: theme.transitions.create("transform", {
      duration: theme.transitions.duration.standard,
      easing: theme.transitions.easing.easeInOut
   }),
   variants: [
      {
         props: ({ expand }) => !expand,
         style: {
            transform: "rotate(0deg)"
         }
      },
      {
         props: ({ expand }) => !!expand,
         style: {
            transform: "rotate(180deg)"
         }
      }
   ]
}));