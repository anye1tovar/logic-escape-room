const express = require("express");

function createAdminFinancialAccountsRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listAccounts);
  router.post("/", controller.createAccount);
  router.get("/operation-accounts", controller.listAccounts);
  router.get("/expenses", controller.listExpenses);
  router.post("/expenses", controller.createExpense);
  router.patch("/expenses/:id", controller.updateExpense);
  router.delete("/expenses/:id", controller.voidExpense);
  router.get("/owner-contributions", controller.listOwnerContributions);
  router.post("/owner-contributions", controller.createOwnerContribution);
  router.patch("/owner-contributions/:id", controller.updateOwnerContribution);
  router.delete("/owner-contributions/:id", controller.voidOwnerContribution);
  router.get("/transfers", controller.listTransfers);
  router.post("/transfers", controller.createTransfer);
  router.patch("/transfers/:id", controller.updateTransfer);
  router.delete("/transfers/:id", controller.voidTransfer);
  router.patch("/:id", controller.updateAccount);
  router.get("/:id/movements", controller.listMovements);
  return router;
}

module.exports = createAdminFinancialAccountsRouter;
