function buildAdminRecipesController(service) {
  async function listProducts(req, res) {
    try {
      res.json(await service.listProducts());
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function getProductRecipes(req, res) {
    try {
      res.json(await service.getProductRecipes(req.params.productId));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function preview(req, res) {
    try {
      res.json(await service.preview(req.body));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function saveDraft(req, res) {
    try {
      res.status(201).json(await service.saveDraft(req.body, { user: req.user }));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function activate(req, res) {
    try {
      res.json(await service.activate(req.params.id, { user: req.user }));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function deleteDraft(req, res) {
    try {
      res.json(await service.deleteDraft(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return { listProducts, getProductRecipes, preview, saveDraft, activate, deleteDraft };
}

module.exports = buildAdminRecipesController;
