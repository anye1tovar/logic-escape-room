const express = require("express");

function createAdminVisitAccountsRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listVisitAccounts);
  router.post("/", controller.createManualVisit);
  router.get("/payment-accounts", controller.listPaymentFinancialAccounts);
  router.post(
    "/from-reservation/:reservationId",
    controller.openFromReservation
  );
  router.get("/:id", controller.getVisitAccount);
  router.get("/:id/order-items", controller.listOrderItems);
  router.post("/:id/order-items", controller.createOrderItem);
  router.patch("/:id/order-items/:itemId", controller.updateOrderItemQuantity);
  router.post("/:id/order-items/:itemId/cancel", controller.cancelOrderItem);
  router.get("/:id/payments", controller.listVisitPayments);
  router.post("/:id/payments", controller.createVisitPayment);
  router.post("/:id/payments/:paymentId/void", controller.voidVisitPayment);
  router.patch("/:id", controller.updateVisitAccount);
  router.post("/:id/close", controller.closeVisitAccount);
  router.post("/:id/cancel", controller.cancelVisitAccount);
  return router;
}

module.exports = createAdminVisitAccountsRouter;
