function buildAdminVisitAccountsController(service) {
  async function listVisitAccounts(req, res) {
    try {
      const visits = await service.listVisitAccounts(req.query);
      res.json(visits);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createManualVisit(req, res) {
    try {
      const visit = await service.createManualVisit(req.body, {
        user: req.user,
      });
      res.status(201).json(visit);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listPaymentFinancialAccounts(req, res) {
    try {
      const accounts = await service.listPaymentFinancialAccounts();
      res.json(accounts);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function getVisitAccount(req, res) {
    try {
      const visit = await service.getVisitAccount(req.params.id);
      res.json(visit);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function openFromReservation(req, res) {
    try {
      const visit = await service.openFromReservation(
        req.params.reservationId,
        req.body,
        { user: req.user }
      );
      res.status(201).json(visit);
    } catch (err) {
      res.status(err.status || 500).json({
        error: err.message,
        visitAccountId: err.visitAccountId,
      });
    }
  }

  async function updateVisitAccount(req, res) {
    try {
      const visit = await service.updateVisitAccount(req.params.id, req.body);
      res.json(visit);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function closeVisitAccount(req, res) {
    try {
      const visit = await service.closeVisitAccount(req.params.id, req.body, {
        user: req.user,
      });
      res.json(visit);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function cancelVisitAccount(req, res) {
    try {
      const visit = await service.cancelVisitAccount(req.params.id, req.body, {
        user: req.user,
      });
      res.json(visit);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listOrderItems(req, res) {
    try {
      const items = await service.listOrderItems(req.params.id);
      res.json(items);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createOrderItem(req, res) {
    try {
      const item = await service.createOrderItem(req.params.id, req.body, {
        user: req.user,
      });
      res.status(201).json(item);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateOrderItemQuantity(req, res) {
    try {
      const item = await service.updateOrderItemQuantity(
        req.params.id,
        req.params.itemId,
        req.body,
        { user: req.user }
      );
      res.json(item);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function cancelOrderItem(req, res) {
    try {
      const item = await service.cancelOrderItem(
        req.params.id,
        req.params.itemId,
        req.body,
        { user: req.user }
      );
      res.json(item);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listVisitPayments(req, res) {
    try {
      const payments = await service.listVisitPayments(req.params.id);
      res.json(payments);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createVisitPayment(req, res) {
    try {
      const payment = await service.createVisitPayment(req.params.id, req.body, {
        user: req.user,
      });
      res.status(201).json(payment);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function voidVisitPayment(req, res) {
    try {
      const payment = await service.voidVisitPayment(
        req.params.id,
        req.params.paymentId,
        req.body,
        { user: req.user }
      );
      res.json(payment);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    listVisitAccounts,
    listPaymentFinancialAccounts,
    getVisitAccount,
    createManualVisit,
    openFromReservation,
    updateVisitAccount,
    closeVisitAccount,
    cancelVisitAccount,
    listOrderItems,
    createOrderItem,
    updateOrderItemQuantity,
    cancelOrderItem,
    listVisitPayments,
    createVisitPayment,
    voidVisitPayment,
  };
}

module.exports = buildAdminVisitAccountsController;
