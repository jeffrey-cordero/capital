import express from "express";

import * as controller from "@/controllers/userController";
import { authenticateJWT } from "@/lib/api/authentication";

const usersRouter = express.Router();

usersRouter.post("/", authenticateJWT(false), controller.POST);
usersRouter.put("/", authenticateJWT(true), controller.PUT);
usersRouter.delete("/", authenticateJWT(true), controller.DELETE);

export default usersRouter;