import express from "express";

import * as controller from "@/controllers/userController";
import { authenticateToken } from "@/lib/authentication/middleware";

const usersRouter = express.Router();

usersRouter.post("/", authenticateToken(false), controller.POST);

export default usersRouter;