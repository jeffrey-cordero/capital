import type { Shadows } from "@mui/material";

/**
 * MUI shadows overrides.
 * @see https://mui.com/material-ui/customization/theming/
 */
export const shadows = (mode: "light" | "dark"): Shadows => {
   const color = mode === "dark" ?  "rgba(0, 0, 0, 0.45)" : "rgba(0, 0, 0, 0.08)";

   return [
      "none",
      `0px 0px 0px ${color}`,
      `0px 1px 2px ${color}`,
      `0px 1px 5px ${color}`,
      `0px 1px 8px ${color}`,
      `0px 1px 10px ${color}`,
      `0px 1px 14px ${color}`,
      `0px 1px 18px ${color}`,
      `0px 2px 16px ${color}`,
      `0px 3px 14px ${color}`,
      `0px 3px 16px ${color}`,
      `0px 4px 18px ${color}`,
      `0px 4px 20px ${color}`,
      `0px 5px 22px ${color}`,
      `0px 5px 24px ${color}`,
      `0px 5px 26px ${color}`,
      `0px 6px 28px ${color}`,
      `0px 6px 30px ${color}`,
      `0px 6px 32px ${color}`,
      `0px 7px 34px ${color}`,
      `0px 7px 36px ${color}`,
      `0px 8px 38px ${color}`,
      `0px 8px 40px ${color}`,
      `0px 8px 42px ${color}`,
      `0px 9px 44px ${color}`
   ];
};