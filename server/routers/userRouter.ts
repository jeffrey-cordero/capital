import express from "express";

import * as controller from "@/controllers/userController";
import { authenticateToken } from "@/lib/middleware";

const usersRouter = express.Router();

/**
 * POST /users
 *    req.body: User
 */
usersRouter.post("/", authenticateToken(false), controller.POST);

export default usersRouter;