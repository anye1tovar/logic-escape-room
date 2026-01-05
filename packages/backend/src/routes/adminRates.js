const express = require("express");

function createAdminRatesRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listRates);
  router.post("/", controller.createRate);
  router.put("/:id", controller.updateRate);
  router.delete("/:id", controller.deleteRate);
  return router;
}

module.exports = createAdminRatesRouter;

