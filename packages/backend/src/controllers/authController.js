function buildAuthController(service) {
  async function login(req, res) {
    try {
      const { email, password } = req.body || {};
      const result = await service.login({ email, password });
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    login,
  };
}

module.exports = buildAuthController;

