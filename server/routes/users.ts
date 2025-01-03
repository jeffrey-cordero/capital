import express from "express";
const usersRouter = express.Router();

import registrationController from "../controllers/authentication/register";

// Handle registration and login requests
usersRouter.post("/register", registrationController);

export default usersRouter;