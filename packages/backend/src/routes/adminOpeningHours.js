const express = require("express");

function createAdminOpeningHoursRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listOpeningHours);
  router.put("/", controller.upsertOpeningHour);
  return router;
}

module.exports = createAdminOpeningHoursRouter;

