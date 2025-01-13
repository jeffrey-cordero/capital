
import Router from "@/components/auth/router";
import Sidebar from "@/components/global/sidebar";

export default function Layout() {
   return (
      <>
         <Sidebar />
         <Router home = { true } />
      </>
   )
}