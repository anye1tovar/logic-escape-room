function buildAdminRoomsController(service) {
  async function listRooms(req, res) {
    try {
      const rooms = await service.listRooms();
      res.json(rooms);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function createRoom(req, res) {
    try {
      const created = await service.createRoom(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateRoom(req, res) {
    try {
      const updated = await service.updateRoom(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function deleteRoom(req, res) {
    try {
      const result = await service.deleteRoom(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return { listRooms, createRoom, updateRoom, deleteRoom };
}

module.exports = buildAdminRoomsController;

