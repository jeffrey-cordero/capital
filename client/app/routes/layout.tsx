import { useSelector } from "react-redux";
import { Outlet } from "react-router";

import Loading from "@/components/global/loading";
import type { RootState } from "@/redux/store";

/**
 * Layout wrapper for landing pages to display loading state when authenticated users
 * are trying to access the landing pages.
 *
 * @returns {React.ReactNode} The landing layout component
 */
export default function Layout(): React.ReactNode {
   const authenticated = useSelector((state: RootState) => state.authentication.value);

   return authenticated ? <Loading /> : <Outlet />;
}