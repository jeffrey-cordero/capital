import express from "express";

import * as controller from "@/controllers/authenticationController";
import { authenticateToken } from "@/lib/middleware";

const authenticationRouter = express.Router();

/**
 * Authentication router for handling user authentication and authorization
 * methods
 */
authenticationRouter.get("/", controller.GET);
authenticationRouter.post("/login", authenticateToken(false), controller.LOGIN);
authenticationRouter.post("/logout", authenticateToken(true), controller.LOGOUT);

export default authenticationRouter;