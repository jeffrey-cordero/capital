import express from "express";

import * as controller from "@/controllers/authenticationController";
import { authenticateToken } from "@/lib/authentication/middleware";

const authenticationRouter = express.Router();

authenticationRouter.get("/", controller.GET);
authenticationRouter.post("/login", authenticateToken(false), controller.LOGIN);
authenticationRouter.post("/logout", authenticateToken(true), controller.LOGOUT);

export default authenticationRouter;