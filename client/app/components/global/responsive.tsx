/**
 * Props for the ResponsiveChartContainer component
 *
 * @interface ResponsiveChartContainerProps
 * @property {React.ReactNode} children - The children to render inside the container
 * @property {number} height - The height of the container
 */
interface ResponsiveChartContainerProps {
   children: React.ReactNode;
   height: number;
}

/**
 * A wrapper component for graphs to maintain a consistent height for responsive graphs
 *
 * @param {ResponsiveChartContainerProps} props - The component props
 * @param {React.ReactNode} props.children - The children to render inside the container
 * @param {number} props.height - The height of the container
 */
export default function ResponsiveChartContainer({ children, height }: ResponsiveChartContainerProps): React.ReactNode {
   return (
      <div
         style = {
            {
               position: "relative",
               height: height,
               maxHeight: height,
               margin: "auto"
            }
         }
      >
         <div
            style = {
               {
                  position: "absolute",
                  top: "0",
                  left: "0",
                  width: "100%",
                  height: "100%"
               }
            }
         >
            { children }
         </div>
      </div>
   );
}