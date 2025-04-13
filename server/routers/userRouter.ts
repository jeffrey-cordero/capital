import express from "express";

import * as controller from "@/controllers/userController";
import { authenticateToken } from "@/lib/middleware";

const usersRouter = express.Router();

/**
 * GET /users/:id
 *    req.params.id: User ID
 */
usersRouter.get("/:id", authenticateToken(true), controller.GET);

/**
 * POST /users
 *    req.body: User
 */
usersRouter.post("/", authenticateToken(false), controller.POST);

/**
 * PUT /users
 *    req.body: Partial<User>
 */
usersRouter.put("/", authenticateToken(true), controller.PUT);

/**
 * DELETE /users
 */
usersRouter.delete("/", authenticateToken(true), controller.DELETE);

export default usersRouter;