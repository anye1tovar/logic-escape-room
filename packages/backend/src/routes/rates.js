const express = require("express");

function createRatesRouter(controller) {
  const router = express.Router();

  router.get("/", controller.listRates);

  return router;
}

module.exports = createRatesRouter;
