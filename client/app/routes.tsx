import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
   layout("routes/layout.tsx", [
      route("/", "routes/index.tsx"),
      route("register", "routes/auth/register.tsx"),
      route("login", "routes/auth/login.tsx"),
   ]),

   layout("routes/home/layout.tsx", [
      route("home", "routes/home/index.tsx"),
   ]),
] satisfies RouteConfig;
