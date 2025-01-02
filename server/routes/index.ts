import express from "express";
const router = express.Router();
import { sendSuccess } from "../controllers/api/response";

import registration from "../controllers/authentication/register";

router.get("/api", (request, result) => {
   return sendSuccess(result, "API is working");
});

// Handle registration and login requests
router.post("/register", registration.register);

module.exports = router;