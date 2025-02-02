import express from "express";
import { authenticateJWT } from "@/session";
import { createUser, updateUser, deleteUser } from "@/controllers/userController";

const usersRouter = express.Router();

usersRouter.post("/", authenticateJWT(false), createUser);
usersRouter.put("/", authenticateJWT(true), updateUser);
usersRouter.delete("/", authenticateJWT(true), deleteUser);

export default usersRouter;