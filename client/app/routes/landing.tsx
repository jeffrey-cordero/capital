import { useQuery } from '@tanstack/react-query';
import type { Route } from '../+types/root';


async function fetchData(): Promise<any> {
  const response = await fetch("http://localhost:8000/api");

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  } else {
    console.log(response);

    return response.json();
  }
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Capital" },
    { name: "description", content: "Finance Tracker" },
  ];
}

export default function Landing() {
  const { data, isLoading, error } = useQuery({ queryKey: ["test"], queryFn: fetchData });

  if (isLoading) return <div>Loading...</div>;

  if (error instanceof Error) return <div>Error: {error.message}</div>;

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Welcome to MyApp</h5>
          <p className="card-text">
            This is a simple React app styled with Bootstrap.
          </p>
          <a href="#" className="btn btn-primary">
            Learn More
          </a>
        </div>
      </div>
    </div>
  );
}
