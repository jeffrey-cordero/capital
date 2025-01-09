import Spinner from "react-bootstrap/Spinner";

export default function Loading() {
   return (
      <div className = "main">
         <Spinner
            animation = "border"
            className = "loading"
         >
            <span className = "visually-hidden">Loading...</span>
         </Spinner>
      </div>
   );
}