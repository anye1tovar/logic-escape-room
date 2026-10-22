const express = require("express");

function createAdminInventoryAlertsRouter(controller) {
  const router = express.Router();
  router.get("/", controller.inventoryAlerts);
  return router;
}

module.exports = createAdminInventoryAlertsRouter;
