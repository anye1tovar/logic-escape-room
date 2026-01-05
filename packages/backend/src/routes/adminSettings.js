const express = require("express");

function createAdminSettingsRouter(controller) {
  const router = express.Router();
  router.get("/", controller.listSettings);
  router.put("/:key", controller.setSetting);
  router.delete("/:key", controller.deleteSetting);
  return router;
}

module.exports = createAdminSettingsRouter;

