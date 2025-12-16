function buildRoomsController(service) {
  async function listRooms(req, res) {
    try {
      const rooms = await service.listRooms();
      res.json(rooms);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function getRoom(req, res) {
    try {
      const { id } = req.params;
      const room = await service.getRoom(id);
      if (!room) return res.status(404).json({ error: "Not found" });
      res.json(room);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  return { listRooms, getRoom };
}

module.exports = buildRoomsController;
