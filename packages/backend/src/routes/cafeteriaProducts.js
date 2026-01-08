const express = require("express");

function createCafeteriaProductsRouter(controller) {
  const router = express.Router();

  router.get("/", controller.listProducts);

  return router;
}

module.exports = createCafeteriaProductsRouter;

