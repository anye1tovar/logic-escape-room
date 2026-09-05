const express = require("express");

function createAdminFinancialDashboardRouter(controller) {
  const router = express.Router();
  router.get("/", controller.report);
  router.get("/export.csv", controller.exportCsv);
  return router;
}

module.exports = createAdminFinancialDashboardRouter;
