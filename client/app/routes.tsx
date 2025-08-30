import { layout, route, type RouteConfig } from "@react-router/dev/routes";

/**
 * Application routing configuration, which defines the landing and dashboard
 * routes with their respective layout and page components
 */
export default [
   layout("routes/authentication/layout.tsx", [
      layout("routes/layout.tsx", [
         route("/", "routes/page.tsx"),
         route("register", "routes/authentication/register.tsx"),
         route("login", "routes/authentication/login.tsx"),
      ]),
      layout("routes/dashboard/layout.tsx", [
         route("dashboard", "routes/dashboard/page.tsx"),
         route("dashboard/accounts", "routes/dashboard/accounts/page.tsx"),
         route("dashboard/budgets", "routes/dashboard/budgets/page.tsx"),
         route("dashboard/settings", "routes/dashboard/settings/page.tsx")
      ])
   ])
] satisfies RouteConfig;