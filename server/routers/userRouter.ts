import express from "express";

import * as controller from "@/controllers/userController";
import { authenticateToken } from "@/lib/middleware";

const usersRouter = express.Router();

/**
 * Creates a new user account - POST /users
 *
 * @requires {User} req.body - User data to insert
 */
usersRouter.post("/", authenticateToken(false), controller.POST);

/**
 * Updates an existing user account - PUT /users
 *
 * @requires {Partial<User>} req.body - User data to update
 */
usersRouter.put("/", authenticateToken(true), controller.PUT);

/**
 * Removes an existing user account - DELETE /users
 */
usersRouter.delete("/", authenticateToken(true), controller.DELETE);

export default usersRouter;