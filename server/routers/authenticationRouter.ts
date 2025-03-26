import express from "express";

import * as controller from "@/controllers/authenticationController";
import { authenticateToken } from "@/lib/middleware";

const authenticationRouter = express.Router();

/**
 * GET /authentication/
 *    req.cookies: { token: string }
 */
authenticationRouter.get("/", controller.GET);

/**
 * POST /authentication/login
 *    req.body: { username: string, password: string }
 */
authenticationRouter.post("/login", authenticateToken(false), controller.LOGIN);

/**
 * POST /authentication/logout
 *    req.cookies: { token: string }
 */
authenticationRouter.post("/logout", authenticateToken(true), controller.LOGOUT);

export default authenticationRouter;