const express = require("express");

function createAdminFinancialAccountsRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listAccounts);
  router.post("/", controller.createAccount);
  router.patch("/:id", controller.updateAccount);
  router.get("/:id/movements", controller.listMovements);
  return router;
}

module.exports = createAdminFinancialAccountsRouter;
