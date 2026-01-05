const express = require("express");

function createAdminRoomsRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listRooms);
  router.post("/", controller.createRoom);
  router.put("/:id", controller.updateRoom);
  router.delete("/:id", controller.deleteRoom);
  return router;
}

module.exports = createAdminRoomsRouter;

