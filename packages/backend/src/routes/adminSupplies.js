const express = require("express");

function createAdminSuppliesRouter(controller) {
  const router = express.Router();
  router.get("/categories", controller.listCategories);
  router.get("/", controller.listSupplies);
  router.post("/", controller.createSupply);
  router.get("/:id/recipes", controller.listSupplyRecipeUsages);
  router.get("/:id/usage", controller.getSupplyUsageDetails);
  router.get("/:id/batches", controller.listBatches);
  router.put("/:id/batches/:batchId", controller.updateBatch);
  router.post("/:id/batches/:batchId/discard", controller.discardBatch);
  router.get("/:id/inventory-movements", controller.listInventoryMovements);
  router.post("/:id/inventory-movements", controller.createInventoryMovement);
  router.post("/:id/physical-count", controller.setPhysicalCount);
  router.put("/:id", controller.updateSupply);
  router.delete("/:id", controller.deleteSupply);
  return router;
}

module.exports = createAdminSuppliesRouter;
