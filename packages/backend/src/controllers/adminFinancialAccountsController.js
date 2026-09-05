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

  async function createExpense(req, res) {
    try {
      const expense = await service.createExpense(req.body, { user: req.user });
      res.status(201).json(expense);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateExpense(req, res) {
    try {
      const expense = await service.updateExpense(req.params.id, req.body, {
        user: req.user,
      });
      res.json(expense);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function voidExpense(req, res) {
    try {
      const expense = await service.voidExpense(req.params.id, {
        user: req.user,
      });
      res.json(expense);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listExpenses(req, res) {
    try {
      const expenses = await service.listExpenses(req.query);
      res.json(expenses);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createOwnerContribution(req, res) {
    try {
      const contribution = await service.createOwnerContribution(req.body, {
        user: req.user,
      });
      res.status(201).json(contribution);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateOwnerContribution(req, res) {
    try {
      const contribution = await service.updateOwnerContribution(
        req.params.id,
        req.body,
        { user: req.user }
      );
      res.json(contribution);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function voidOwnerContribution(req, res) {
    try {
      const contribution = await service.voidOwnerContribution(req.params.id, {
        user: req.user,
      });
      res.json(contribution);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listOwnerContributions(req, res) {
    try {
      const contributions = await service.listOwnerContributions();
      res.json(contributions);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createTransfer(req, res) {
    try {
      const transfer = await service.createTransfer(req.body, {
        user: req.user,
      });
      res.status(201).json(transfer);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateTransfer(req, res) {
    try {
      const transfer = await service.updateTransfer(req.params.id, req.body, {
        user: req.user,
      });
      res.json(transfer);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function voidTransfer(req, res) {
    try {
      const transfer = await service.voidTransfer(req.params.id, {
        user: req.user,
      });
      res.json(transfer);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listTransfers(req, res) {
    try {
      const transfers = await service.listTransfers();
      res.json(transfers);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    listAccounts,
    createAccount,
    updateAccount,
    listMovements,
    createExpense,
    updateExpense,
    voidExpense,
    listExpenses,
    createOwnerContribution,
    updateOwnerContribution,
    voidOwnerContribution,
    listOwnerContributions,
    createTransfer,
    updateTransfer,
    voidTransfer,
    listTransfers,
  };
}

module.exports = buildAdminFinancialAccountsController;
