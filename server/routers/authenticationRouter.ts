import express from "express";

import * as controller from "@/controllers/authenticationController";
import { authenticateRefreshToken, authenticateToken } from "@/lib/middleware";

const authenticationRouter = express.Router();

/**
 * Validates a user session via their JWT token - GET /authentication/
 *
 * @requires {string} req.cookies.access_token - Authentication token
 */
authenticationRouter.get("/", controller.GET);

/**
 * Authenticates a user and creates their session - POST /authentication/login
 *
 * @requires {string} req.body.username - Username credential
 * @requires {string} req.body.password - Password credential
 */
authenticationRouter.post("/login", authenticateToken(false), controller.LOGIN);

/**
 * Refreshes authentication tokens - POST /authentication/refresh
 *
 * @requires {string} req.cookies.refresh_token - Refresh token
 */
authenticationRouter.post("/refresh", authenticateRefreshToken(), controller.REFRESH);

/**
 * Terminates a user session - POST /authentication/logout
 *
 * @requires {string} req.cookies.access_token - Authentication token
 */
authenticationRouter.post("/logout", authenticateToken(true), controller.LOGOUT);

export default authenticationRouter;