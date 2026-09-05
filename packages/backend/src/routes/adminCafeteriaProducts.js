const express = require("express");

function createAdminCafeteriaProductsRouter(controller) {
  const router = express.Router();
  router.get("/promotions", controller.listPromotions);
  router.post("/promotions", controller.createPromotion);
  router.delete("/promotions/:id", controller.deletePromotion);
  router.get("/categories", controller.listCategories);
  router.post("/categories", controller.createCategory);
  router.put("/categories/:id", controller.updateCategory);
  router.delete("/categories/:id", controller.deleteCategory);
  router.get("/", controller.listProducts);
  router.post("/", controller.createProduct);
  router.get("/:id/inventory-movements", controller.listInventoryMovements);
  router.post("/:id/inventory-movements", controller.createInventoryMovement);
  router.post("/:id/physical-count", controller.setPhysicalCount);
  router.get("/:id/inventory-batches", controller.listInventoryBatches);
  router.post("/:id/write-off-expired", controller.writeOffExpiredBatches);
  router.put("/:id", controller.updateProduct);
  router.delete("/:id", controller.deleteProduct);
  return router;
}

module.exports = createAdminCafeteriaProductsRouter;
