import { IconButton, type IconButtonProps, styled } from "@mui/material";

/**
 * The props for the Expand component
 *
 * @interface ExpandProps
 * @extends {IconButtonProps} - Inherits all props from the MUI `IconButton` component
 * @property {boolean} expand - Whether the component is expanded
 */
interface ExpandProps extends IconButtonProps {
   expand: boolean;
}

/**
 * The Expand component, a styled version of the MUI `IconButton` component.
 *
 * @param {ExpandProps} props - The props for the Expand component
 * @returns {React.ReactNode} The Expand component
 */
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
            transform: "rotate(0deg)"  // Icon is in the collapsed state.
         }
      },
      {
         props: ({ expand }) => !!expand,
         style: {
            transform: "rotate(180deg)"  // Icon is in the expanded state.
         }
      }
   ]
}));