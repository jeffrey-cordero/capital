import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from "react-redux";
import { toggleTheme } from "../redux/slices/theme";
import type { Route } from '../+types/root';

async function fetchData(): Promise<Object> {
  const response = await fetch("http://localhost:8000/api");

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

export default function Landing() {
  // Redux
  const dispatch = useDispatch();
  const theme = useSelector((state: any) => state.theme.theme);

  // React-Query
  const { data, isLoading, error } = useQuery({ queryKey: ["test"], queryFn: fetchData });

  //   isLoading&& return <div>Loading...</div>;
  // error instanceof Error && return <div>Error: {error.message}</div>;

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Welcome to MyApp</h5>
          <p className="card-text">
            This is a simple React app styled with Bootstrap.
          </p>
          <button 
            onClick={() => dispatch(toggleTheme())} 
            className="btn btn-primary">
            Theme: { theme }
          </button>
        </div>
      </div>
    </div>
  );
}
