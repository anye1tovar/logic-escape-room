const express = require("express");

function createAdminReservationsRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listReservations);
  router.post("/", controller.listReservations);
  router.post("/:id/timer/start", controller.startTimer);
  router.post("/:id/timer/save", controller.saveTimer);
  router.put("/:id", controller.updateReservation);
  router.delete("/:id", controller.deleteReservation);
  return router;
}

module.exports = createAdminReservationsRouter;
