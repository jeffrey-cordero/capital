import express from "express";
import { authenticateJWT } from "@/lib/api/authentication";

import * as controller from "@/controllers/authenticationController";

const authenticationRouter = express.Router();

authenticationRouter.get("/", controller.GET);
authenticationRouter.post("/login", authenticateJWT(false), controller.LOGIN);
authenticationRouter.post("/logout", authenticateJWT(true), controller.LOGOUT);

export default authenticationRouter;