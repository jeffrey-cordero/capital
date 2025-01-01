exports.sendError = function (res, code, id, message) {
   return res.status(code).json({
      status: "Error",
      id: id,
      message: message
   });
};

exports.sendSuccess = function (res, message, data={}) {
   return res.status(200).json({
      status: "Success",
      message: message,
      data: data
   });
};