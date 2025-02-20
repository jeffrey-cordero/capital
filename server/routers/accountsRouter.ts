import express from "express";

import * as controller from "@/controllers/userController";
import { authenticateJWT } from "@/lib/authentication/middleware";

const usersRouter = express.Router();

// POST (/home/accounts)
// PUT (/home/accounts/:id, /home/accounts/order)
// DELETE (/home/accounts/:id)

export default usersRouter;