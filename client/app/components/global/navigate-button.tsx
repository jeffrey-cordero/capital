import { useRef } from "react";

let navigationInterval: NodeJS.Timeout;;

function fetchDimensions(element: React.RefObject<HTMLButtonElement>, navigate: () => void): void {
   // Navigate to the next page if the element is fully covered by the viewport
   const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
   const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

   const dimensions = element.current?.getBoundingClientRect();
   const width = dimensions?.width || 0;
   const height = dimensions?.height || 0;

   if (width >= viewportWidth && height >= viewportHeight) {
      setTimeout(() => navigate(), 50);
   }
}

function transitionToPage(element: React.RefObject<HTMLButtonElement>, navigate: () => void): void {
   // Clear previous inner HTML and apply animation classes to cover the entire viewport
   setTimeout(() => {
      element.current.innerHTML = "";
      element.current.classList.add("circle");

      setTimeout(() => {
         element.current.classList.add("cover");
      }, 150);
   }, 400);

   navigationInterval = setInterval(() => {
      fetchDimensions(element, navigate);
   }, 100);

   window.addEventListener("beforeunload", function() {
      clearInterval(navigationInterval);
   });
}

interface NavigateButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>{
   navigate: () => void;
   submission?: boolean;
}

export default function NavigateButton(props: NavigateButtonProps) {
   const { navigate, submission, children, ...rest } = props;
   const buttonRef = useRef<HTMLButtonElement>(null);

   return (
      <button
         { ...rest }
         onClick = { () => submission !== false && buttonRef.current && transitionToPage(buttonRef as React.RefObject<HTMLButtonElement>, navigate) }
         ref = { buttonRef }
      >
         { children }
      </button>
   );
}