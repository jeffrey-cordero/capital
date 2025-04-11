import { layout, route, type RouteConfig } from "@react-router/dev/routes";

/**
 * Routing configuration for the application via react-router.
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
      route("dashboard/budgets", "routes/dashboard/budgets/page.tsx"),
      route("dashboard/settings", "routes/dashboard/settings/page.tsx")
   ])
] satisfies RouteConfig;