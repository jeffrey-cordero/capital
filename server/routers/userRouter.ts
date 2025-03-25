import express from "express";

import * as controller from "@/controllers/userController";
import { authenticateToken } from "@/lib/middleware";

const usersRouter = express.Router();

/**
 * User router for handling user creation/update requests
 */
usersRouter.post("/", authenticateToken(false), controller.POST);

export default usersRouter;