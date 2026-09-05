const express = require("express");

function createAdminSupplyPurchasesRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listPurchases);
  router.post("/", controller.createPurchase);
  return router;
}

module.exports = createAdminSupplyPurchasesRouter;
