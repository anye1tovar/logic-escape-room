function buildAdminReportsController(service) {
  async function dashboard(req, res) {
    try {
      const data = await service.dashboard(req.query);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listFinancialMovements(req, res) {
    try {
      const data = await service.listFinancialMovements(req.query);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listSalesReport(req, res) {
    try {
      const data = await service.listSalesReport(req.query);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listInventoryMovements(req, res) {
    try {
      const data = await service.listInventoryMovements(req.query);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listProductsRanking(req, res) {
    try {
      const data = await service.listProductsRanking(req.query);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listRoomsRanking(req, res) {
    try {
      const data = await service.listRoomsRanking(req.query);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listVisitReport(req, res) {
    try {
      const data = await service.listVisitReport(req.query);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function cafeteriaProfit(req, res) {
    try {
      res.json(await service.cafeteriaProfit(req.query));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function exportCafeteriaProfitCsv(req, res) {
    try {
      const file = await service.exportCafeteriaProfitCsv(req.query);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.filename}"`,
      );
      res.send(file.content);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
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
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    dashboard,
    listFinancialMovements,
    listSalesReport,
    listInventoryMovements,
    listProductsRanking,
    listRoomsRanking,
    listVisitReport,
    cafeteriaProfit,
    exportCafeteriaProfitCsv,
    exportCsv,
  };
}

module.exports = buildAdminReportsController;
