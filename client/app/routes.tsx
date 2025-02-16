import { layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
   layout("routes/layout.tsx", [
      route("/", "routes/page.tsx"),
      route("register", "routes/authentication/register.tsx"),
      route("login", "routes/authentication/login.tsx")
   ]),

   layout("routes/home/layout.tsx", [
      route("home", "routes/home/page.tsx"),
      route("home/accounts", "routes/home/accounts/page.tsx")
   ])
] satisfies RouteConfig;