const express = require("express");

function createAdminCafeteriaProductsRouter(controller) {
  const router = express.Router();
  router.get("/categories", controller.listCategories);
  router.post("/categories", controller.createCategory);
  router.put("/categories/:id", controller.updateCategory);
  router.delete("/categories/:id", controller.deleteCategory);
  router.get("/", controller.listProducts);
  router.post("/", controller.createProduct);
  router.put("/:id", controller.updateProduct);
  router.delete("/:id", controller.deleteProduct);
  return router;
}

module.exports = createAdminCafeteriaProductsRouter;
