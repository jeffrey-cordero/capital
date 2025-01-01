const asyncHandler = require("express-async-handler");

exports.register = asyncHandler(async (request, result) => {
   const { email, password } = request.body;
   
   result.status(200).json({ email, password });
});