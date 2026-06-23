const express = require("express");

function createMetaTrackingRouter(controller) {
  const router = express.Router();
  router.post("/meta-event", controller.createEvent);
  return router;
}

module.exports = createMetaTrackingRouter;
