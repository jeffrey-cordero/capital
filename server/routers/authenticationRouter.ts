import express from "express";

import * as controller from "@/controllers/authenticationController";
import { authenticateJWT } from "@/lib/api/authentication";

const authenticationRouter = express.Router();

authenticationRouter.get("/", controller.GET);
authenticationRouter.post("/login", authenticateJWT(false), controller.LOGIN);
authenticationRouter.post("/logout", authenticateJWT(true), controller.LOGOUT);

export default authenticationRouter;