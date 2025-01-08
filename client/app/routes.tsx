import { layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
   layout("routes/layout.tsx", [
      route("/", "routes/page.tsx"),
      route("register", "routes/auth/register.tsx"),
      route("login", "routes/auth/login.tsx")
   ]),

   layout("routes/home/layout.tsx", [
      route("home", "routes/home/page.tsx")
   ])
] satisfies RouteConfig;