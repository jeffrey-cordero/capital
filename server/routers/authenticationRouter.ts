import express from "express";
import { authenticateJWT } from "@/lib/api/authentication";

import * as controller from "@/controllers/authController";

const authRouter = express.Router();

authRouter.get("/", controller.GET);
authRouter.post("/login", authenticateJWT(false), controller.LOGIN);
authRouter.post("/logout", authenticateJWT(true), controller.LOGOUT);

export default authRouter;