import "@/styles/landing.scss";

import React from "react";
import { useRef } from "react";
import { Container, Image } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export function meta() {
   return [
      { title: "Capital" },
      { name: "description", content: "Finance Tracker" }
   ];
}

function checkDimensions(element: React.RefObject<HTMLButtonElement>) {
   const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
   const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

   const componentDimensions = element.current.getBoundingClientRect();
   const elementWidth = componentDimensions.width;
   const elementHeight = componentDimensions.height;

   if (elementWidth >= viewportWidth || elementHeight >= viewportHeight) {
      console.log("Oversized element detected");
   }
}

let dimensionInterval: NodeJS.Timeout;

function transitionToPage(element: React.RefObject<HTMLButtonElement>) {
   console.log(element);
   setTimeout(() => {
      element.current.innerHTML = "";
      element.current.classList.add("fade");
   }, 400);

   setTimeout(() => {
      element.current.classList.add("overtaken");
   }, 500);

   dimensionInterval = setInterval(() => {
      checkDimensions(element);
   }, 100);

   window.addEventListener("beforeunload", function() {
      clearInterval(dimensionInterval);
   });
}

export default function Landing() {
   const navigate = useNavigate();
   const buttonRef = useRef<HTMLButtonElement>(null);

   return (
      <Container className = "landing">
         <div className = "image">
            <Image
               src = { `${SERVER_URL}/resources/landing/landing.jpg` }
               alt = "Landing Page Image"
            />
         </div>
         <div className = "text">
            <h1>Capital</h1>
            <p> A data-driven finance tracker created for the intelligent acquisition of capital.</p>
         </div>
         <div className = "buttons">
            <button
               ref = { buttonRef }
               onClick = {
                  () => {
                     navigate("/login");
                     if (buttonRef.current) {
                        transitionToPage(buttonRef as React.RefObject<HTMLButtonElement>);
                     }
                  }
               }
            >
               Log In
            </button>
         </div>
      </Container>
   );
}