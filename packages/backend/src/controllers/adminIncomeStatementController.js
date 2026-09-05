function buildAdminIncomeStatementController(service) {
  async function report(req, res) {
    try {
      res.json(await service.report(req.query));
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  }

  async function exportCsv(req, res) {
    try {
      const file = await service.exportCsv(req.query);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.filename}"`,
      );
      res.send(file.content);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  }

  return { report, exportCsv };
}

module.exports = buildAdminIncomeStatementController;
