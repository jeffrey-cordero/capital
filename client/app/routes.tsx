import { layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
   route("/", "routes/page.tsx"),
   route("register", "routes/authentication/register.tsx"),
   route("login", "routes/authentication/login.tsx"),

   layout("routes/dashboard/layout.tsx", [
      route("dashboard", "routes/dashboard/page.tsx"),
      route("dashboard/accounts", "routes/dashboard/accounts/page.tsx")
   ])
] satisfies RouteConfig;