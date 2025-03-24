import { layout, route, type RouteConfig } from "@react-router/dev/routes";

/**
 * The routes for the application for the react-router provider mapping to their respective base components and/or layouts.
 *
 * @returns {RouteConfig} The routes
 */
export default [
   layout("routes/authentication/layout.tsx", [
      route("/", "routes/page.tsx"),
      route("register", "routes/authentication/register.tsx"),
      route("login", "routes/authentication/login.tsx")
   ]),

   layout("routes/dashboard/layout.tsx", [
      route("dashboard", "routes/dashboard/page.tsx"),
      route("dashboard/accounts", "routes/dashboard/accounts/page.tsx"),
      route("dashboard/budgets", "routes/dashboard/budgets/page.tsx")
   ])
] satisfies RouteConfig;