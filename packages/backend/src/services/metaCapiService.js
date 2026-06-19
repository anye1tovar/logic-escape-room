const crypto = require("crypto");

function buildMetaCapiService(config = {}) {
  const enabled = Boolean(config.enabled && config.pixelId && config.accessToken);
  const apiVersion = config.apiVersion || "v20.0";

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function hash(value) {
    const normalized = normalize(value);
    if (!normalized) return undefined;
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  function hashPhone(value) {
    const normalized = String(value || "").replace(/\D/g, "");
    if (!normalized) return undefined;
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  function cleanObject(input) {
    return Object.fromEntries(
      Object.entries(input || {}).filter(([, value]) => {
        if (value == null) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "object") return Object.keys(value).length > 0;
        return value !== "";
      })
    );
  }

  function buildUserData({ userData = {}, request = {}, tracking = {} }) {
    return cleanObject({
      ph: hashPhone(userData.phone),
      fn: hash(userData.firstName),
      ln: hash(userData.lastName),
      external_id: hash(userData.externalId),
      client_ip_address: request.ip,
      client_user_agent: request.userAgent,
      fbp: tracking.fbp,
      fbc: tracking.fbc,
    });
  }

  async function sendEvents(events) {
    if (!enabled) return { skipped: true, reason: "disabled" };
    const data = (Array.isArray(events) ? events : [events]).filter(Boolean);
    if (data.length === 0) return { skipped: true, reason: "empty" };

    const url = new URL(
      `https://graph.facebook.com/${apiVersion}/${config.pixelId}/events`
    );
    url.searchParams.set("access_token", config.accessToken);

    const body = {
      data,
      ...(config.testEventCode
        ? { test_event_code: config.testEventCode }
        : {}),
    };

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        console.error("Meta CAPI request failed", response.status, payload);
      }
      return { ok: response.ok, status: response.status, payload };
    } catch (err) {
      console.error("Meta CAPI request failed", err);
      return { ok: false, error: err.message };
    }
  }

  function buildWebsiteEvent({
    eventName,
    eventId,
    sourceUrl,
    request,
    tracking,
    userData,
    customData,
    actionSource = "website",
  }) {
    return cleanObject({
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: actionSource,
      event_source_url: sourceUrl,
      user_data: buildUserData({ userData, request, tracking }),
      custom_data: cleanObject(customData),
    });
  }

  return {
    buildWebsiteEvent,
    sendEvents,
  };
}

module.exports = buildMetaCapiService;
