/**
 * The props for the AreaGradient component.
 *
 * @interface AreaGradientProps
 * @property {string} color - The color of the gradient
 * @property {string} id - The id of the gradient
 */
interface AreaGradientProps {
   color: string;
   id: string;
}

/**
 * The AreaGradient component.
 *
 * @param {AreaGradientProps} props - The props for the AreaGradient component
 * @returns {React.ReactNode} The AreaGradient component
 */
export function AreaGradient({ color, id }: AreaGradientProps): React.ReactNode {
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