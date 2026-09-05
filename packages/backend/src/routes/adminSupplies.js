const express = require("express");

function createAdminSuppliesRouter(controller) {
  const router = express.Router();
  router.get("/categories", controller.listCategories);
  router.get("/", controller.listSupplies);
  router.post("/", controller.createSupply);
  router.put("/:id", controller.updateSupply);
  router.delete("/:id", controller.deleteSupply);
  return router;
}

module.exports = createAdminSuppliesRouter;
