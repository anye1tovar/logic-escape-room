function buildAdminFinancialAccountsController(service) {
  async function listAccounts(req, res) {
    try {
      const accounts = await service.listAccounts();
      res.json(accounts);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createAccount(req, res) {
    try {
      const account = await service.createAccount(req.body, { user: req.user });
      res.status(201).json(account);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateAccount(req, res) {
    try {
      const account = await service.updateAccount(req.params.id, req.body);
      res.json(account);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listMovements(req, res) {
    try {
      const movements = await service.listMovements(req.params.id, req.query);
      res.json(movements);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    listAccounts,
    createAccount,
    updateAccount,
    listMovements,
  };
}

module.exports = buildAdminFinancialAccountsController;
