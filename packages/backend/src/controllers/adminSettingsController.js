function buildAdminSettingsController(service) {
  async function listSettings(req, res) {
    try {
      const rows = await service.listSettings();
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function setSetting(req, res) {
    try {
      const result = await service.setSetting(req.params.key, req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function deleteSetting(req, res) {
    try {
      const result = await service.deleteSetting(req.params.key);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return { listSettings, setSetting, deleteSetting };
}

module.exports = buildAdminSettingsController;

