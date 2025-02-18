import Router from "@/components/authentication/router";

export default function Layout() {
   return (
      <Router secure = { true } />
   );
}