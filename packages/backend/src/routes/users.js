const express = require("express");

function createUsersRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listUsers);
  return router;
}

module.exports = createUsersRouter;

