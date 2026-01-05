const express = require("express");

function createAdminHolidaysRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listHolidays);
  router.post("/", controller.createHoliday);
  router.delete("/:date", controller.deleteHoliday);
  return router;
}

module.exports = createAdminHolidaysRouter;

