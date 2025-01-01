const express = require("express");
const router = express.Router();
const message = require("../controllers/api/response");

const registration = require("../controllers/authentication/register");

router.get("/api", (request, result) => {
   return message.sendSuccess(result, "API is working");
});

// Handle registration and login requests
router.post("/register", registration.register);

module.exports = router;