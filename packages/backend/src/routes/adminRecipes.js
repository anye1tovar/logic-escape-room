const express = require("express");

function createAdminRecipesRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listProducts);
  router.post("/preview", controller.preview);
  router.post("/", controller.saveDraft);
  router.get("/product/:productId", controller.getProductRecipes);
  router.post("/:id/activate", controller.activate);
  router.delete("/:id", controller.deleteDraft);
  return router;
}

module.exports = createAdminRecipesRouter;
