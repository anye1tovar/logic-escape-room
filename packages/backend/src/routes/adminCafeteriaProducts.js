const express = require("express");

function createAdminCafeteriaProductsRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listProducts);
  router.post("/", controller.createProduct);
  router.put("/:id", controller.updateProduct);
  router.delete("/:id", controller.deleteProduct);
  return router;
}

module.exports = createAdminCafeteriaProductsRouter;
