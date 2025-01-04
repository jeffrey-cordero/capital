import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from "react-redux";
import { toggleTheme } from "../redux/slices/theme";
import type { Route } from '../+types/root';
import { Container, Image, Col } from 'react-bootstrap';

import "../styles/landing.scss";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

async function fetchData(): Promise<Object> {
  const response = await fetch(`${SERVER_URL}/api`);

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  } else {
    console.log(response);

    return response.json();
  }
}

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Capital" },
    { name: "description", content: "Finance Tracker" },
  ];
}


function checkDimensions (element: HTMLElement) {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const componentDimensions = element.getBoundingClientRect();
  const elementWidth = componentDimensions.width;
  const elementHeight = componentDimensions.height;

  if (elementWidth >= viewportWidth || elementHeight >= viewportHeight) {
    console.log("Oversized element detected");
  }
}

let dimensionInterval: NodeJS.Timeout;

function transitionToPage (element: HTMLElement) {
  setTimeout(() => {
    element.innerHTML = "";
    element.classList.add("fade");
  }, 400);

  setTimeout(() => {
    element.classList.add("overtaken");
  }, 500);

  dimensionInterval = setInterval(() => {
    checkDimensions(element);
  }, 100);

  window.addEventListener("beforeunload", function () {
     clearInterval(dimensionInterval);
  });

  // End the animation early for large screens
  setTimeout(() => {
    //  window.location.assign(link);
  }, 5000);
}


export default function Landing() {
  // Redux
  const dispatch = useDispatch();
  const theme = useSelector((state: any) => state.theme.theme);

  // React-Query
  // const { data, isLoading, error } = useQuery({ queryKey: ["test"], queryFn: fetchData });

  //   isLoading&& return <div>Loading...</div>;
  // error instanceof Error && return <div>Error: {error.message}</div>;

  return (
    <Container className="main">
      <Col className='image'>
          <Image 
          src={`${SERVER_URL}/resources/landing/landing.jpg`}
          alt="Landing Page Image"
          height={300}
        />
      </Col>
      <Col className='text'>
        <h1>Capital</h1>
        <p> A data-driven finance tracker created for the intelligent acquisition of capital.</p>
      </Col>
      <Col>
      <button 
        id = "theme-toggle"
          onClick={() => {
            dispatch(toggleTheme());
            transitionToPage(document.getElementById("theme-toggle") as HTMLButtonElement);
          }} 
          className="btn btn-primary">
          Theme: { theme }
        </button>
      </Col>
    </Container> 
  );
}
