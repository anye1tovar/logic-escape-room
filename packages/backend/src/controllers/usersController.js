function buildUsersController(service) {
  async function listUsers(req, res) {
    try {
      const users = await service.listUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  return {
    listUsers,
  };
}

module.exports = buildUsersController;

