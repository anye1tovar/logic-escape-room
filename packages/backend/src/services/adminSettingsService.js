function buildAdminSettingsService(consumer) {
  async function listSettings() {
    const rows = await consumer.listSettings();
    return (rows || []).map((r) => ({ key: r.key, value: r.value }));
  }

  async function setSetting(key, input) {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      const err = new Error("key is required");
      err.status = 400;
      throw err;
    }
    const value = String(input?.value ?? "");
    await consumer.setSetting({ key: normalizedKey, value });
    return { ok: true };
  }

  async function deleteSetting(key) {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      const err = new Error("key is required");
      err.status = 400;
      throw err;
    }
    const res = await consumer.deleteSetting(normalizedKey);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { ok: true };
  }

  return { listSettings, setSetting, deleteSetting };
}

module.exports = buildAdminSettingsService;

