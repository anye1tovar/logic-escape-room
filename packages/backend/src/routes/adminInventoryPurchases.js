const express = require("express");

function createAdminInventoryPurchasesRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listPurchases);
  router.post("/", controller.createPurchase);
  return router;
}

module.exports = createAdminInventoryPurchasesRouter;
