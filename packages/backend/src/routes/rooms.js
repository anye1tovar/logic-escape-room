const express = require("express");

function createRoomsRouter(controller) {
  const router = express.Router();

  router.get("/", controller.listRooms);
  router.get("/:id", controller.getRoom);

  return router;
}

module.exports = createRoomsRouter;
