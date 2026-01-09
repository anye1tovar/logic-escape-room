const express = require("express");

function createAdminUsersRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listUsers);
  router.post("/", controller.createUser);
  router.patch("/:id", controller.updateUser);
  router.post("/:id/reset-password", controller.resetPassword);
  return router;
}

module.exports = createAdminUsersRouter;
