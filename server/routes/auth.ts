import express from "express";
import { authenticateJWT } from "@/server/session";

import { login, logout, fetchAuthentication } from "@/server/controllers/auth";

const authRouter = express.Router();

authRouter.get("/", fetchAuthentication);
authRouter.post("/login", authenticateJWT(false), login);
authRouter.post("/logout", authenticateJWT(true), logout);

export default authRouter;