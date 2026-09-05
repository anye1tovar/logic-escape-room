const express = require("express");

function createAdminReportsRouter(controller) {
  const router = express.Router();
  router.get("/dashboard", controller.dashboard);
  router.get("/financial-movements", controller.listFinancialMovements);
  router.get("/sales-orders", controller.listSalesReport);
  router.get("/products-ranking", controller.listProductsRanking);
  router.get("/rooms-ranking", controller.listRoomsRanking);
  router.get("/inventory-movements", controller.listInventoryMovements);
  router.get("/visits", controller.listVisitReport);
  router.get("/cafeteria-profit", controller.cafeteriaProfit);
  router.get("/cafeteria-profit/export.csv", controller.exportCafeteriaProfitCsv);
  router.get("/export.csv", controller.exportCsv);
  return router;
}

module.exports = createAdminReportsRouter;
