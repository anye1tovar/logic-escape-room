const express = require("express");

function createAdminCostAllocationRulesRouter(controller) {
  const router = express.Router();
  router.get("/", controller.list);
  router.post("/", controller.create);
  router.patch("/:id", controller.update);
  router.post("/simulate", controller.simulate);
  router.get("/summary", controller.summary);
  return router;
}

module.exports = createAdminCostAllocationRulesRouter;
