function buildAdminUsersController(service) {
  async function listUsers(req, res) {
    try {
      const users = await service.listUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function createUser(req, res) {
    try {
      const user = await service.createUser(req.body);
      res.json(user);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateUser(req, res) {
    try {
      const id = Number(req.params.id);
      const user = await service.updateUser(id, req.body);
      res.json(user);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function resetPassword(req, res) {
    try {
      const id = Number(req.params.id);
      const result = await service.resetPassword(id, req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    listUsers,
    createUser,
    updateUser,
    resetPassword,
  };
}

module.exports = buildAdminUsersController;
