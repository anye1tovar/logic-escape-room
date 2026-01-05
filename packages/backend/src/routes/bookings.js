const express = require("express");

function createBookingsRouter(controller) {
  const router = express.Router();

  router.get("/availability", controller.getAvailability);
  router.get("/quote", controller.getQuote);
  router.get("/consult/:code", controller.getBookingStatusByConsultCode);
  router.get("/", controller.listBookings);
  router.post("/", controller.createBooking);
  router.get("/:id", controller.getBooking);

  return router;
}

module.exports = createBookingsRouter;
