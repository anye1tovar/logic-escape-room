function buildAdminSupplyPurchasesController(service) {
  async function listPurchases(req, res) {
    try {
      res.json(await service.listPurchases());
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createPurchase(req, res) {
    try {
      const purchase = await service.createPurchase(req.body, { user: req.user });
      res.status(purchase.duplicate ? 200 : 201).json(purchase);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return { listPurchases, createPurchase };
}

module.exports = buildAdminSupplyPurchasesController;
