const express = require("express");

function createAdminDailyClosesRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listCloses);
  router.get("/preview", controller.preview);
  router.get("/accounts/:accountId/movements", controller.listAccountMovements);
  router.post("/", controller.createClose);
  return router;
}

module.exports = createAdminDailyClosesRouter;
