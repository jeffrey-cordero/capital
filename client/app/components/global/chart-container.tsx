/**
 * Props for the ChartContainer component
 *
 * @property {React.ReactNode} children - Content to render inside the container
 * @property {number} height - Container height in pixels
 */
interface ChartContainerProps {
   children: React.ReactNode;
   height: number;
}

/**
 * Wrapper component for charts to maintain a consistent responsive height
 *
 * @param {ChartContainerProps} props - Chart container props
 */
export default function ChartContainer({ children, height }: ChartContainerProps): React.ReactNode {
   return (
      <div
         style = { { position: "relative", height: height, maxHeight: height, margin: "auto" } }
      >
         <div
            style = { { position: "absolute", top: "0", left: "0", width: "100%", height: "100%" } }
         >
            { children }
         </div>
      </div>
   );
}