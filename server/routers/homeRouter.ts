import express from "express";

import * as accountsController from "@/controllers/accountsController";
import * as homeController from "@/controllers/homeController";
import { authenticateJWT } from "@/lib/authentication/middleware";

const homeRouter = express.Router();

homeRouter.get("/", authenticateJWT(true), homeController.GET);

homeRouter.get("/accounts", authenticateJWT(true), accountsController.GET);
homeRouter.post("/accounts", authenticateJWT(true), accountsController.POST);
homeRouter.put("/accounts/order", authenticateJWT(true), accountsController.PUT);
homeRouter.put("/accounts/:id", authenticateJWT(true), accountsController.PUT);
homeRouter.delete("/accounts/:id", authenticateJWT(true), accountsController.DELETE);

export default homeRouter;