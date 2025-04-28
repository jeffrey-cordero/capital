import { IconButton, type IconButtonProps, styled } from "@mui/material";

/**
 * Props for the Expand component
 *
 * @property {boolean} expand - Whether the component is expanded
 */
interface ExpandProps extends IconButtonProps {
   expand: boolean;
}

/**
 * Styled IconButton that rotates based on the current expanded state
 *
 * @param {ExpandProps} props - Expand component props
 * @returns {StyledComponent} The Expand component
 */
const Expand = styled(({ expand, ...other }: ExpandProps) => { // eslint-disable-line
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

export default Expand;