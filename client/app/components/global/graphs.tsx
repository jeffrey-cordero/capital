
export function AreaGradient({ color, id }: { color: string; id: string }) {
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