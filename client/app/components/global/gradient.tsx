/**
 * Props for the AreaGradient component
 *
 * @property {string} color - Gradient color
 * @property {string} id - Unique gradient identifier
 */
interface AreaGradientProps {
   color: string;
   id: string;
}

/**
 * SVG gradient definition for area charts
 *
 * @param {AreaGradientProps} props - Area gradient props
 * @returns {React.ReactNode} The AreaGradient component
 */
export default function AreaGradient({ color, id }: AreaGradientProps): React.ReactNode {
   return (
      <defs>
         <linearGradient
            id = { id }
            x1 = "50%"
            x2 = "50%"
            y1 = "0%"
            y2 = "100%"
         >
            <stop
               offset = "0%"
               stopColor = { color }
               stopOpacity = { 0.3 }
            />
            <stop
               offset = "100%"
               stopColor = { color }
               stopOpacity = { 0 }
            />
         </linearGradient>
      </defs>
   );
}