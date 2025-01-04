import express from "express";
import createController from "@/controllers/users/create";
import updateController from "@/controllers/users/update";
import deleteController from "@/controllers/users/delete";
import { authenticateJWT } from "@/session";

const usersRouter = express.Router();

usersRouter.post("/", authenticateJWT(false), createController);
usersRouter.put("/", authenticateJWT(true), updateController);
usersRouter.delete("/", authenticateJWT(true), deleteController);

export default usersRouter;