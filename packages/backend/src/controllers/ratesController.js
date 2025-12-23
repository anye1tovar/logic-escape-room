function buildRatesController(service) {
  async function listRates(req, res) {
    try {
      const { dayType } = req.query;
      const rates = await service.listRates(dayType);
      res.json(rates);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  return { listRates };
}

module.exports = buildRatesController;
