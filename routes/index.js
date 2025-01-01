const express = require("express");
const router = express.Router();

const registration = require("../controllers/authentication/register");

router.get("/api", (request, result) => {
   console.log(request);

   result.render("index", { title: "Express" });
});

// Handle registration and login requests
router.post("/register", registration.register);

module.exports = router;