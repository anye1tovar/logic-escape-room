function buildMetaTrackingController(service) {
  async function createEvent(req, res) {
    try {
      const result = await service.sendWebsiteEvent(req.body, {
        ip: req.ip,
        userAgent: req.get("user-agent") || "",
        sourceUrl: req.get("referer") || req.get("referrer") || "",
      });
      res.status(result?.skipped ? 202 : 200).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    createEvent,
  };
}

module.exports = buildMetaTrackingController;
