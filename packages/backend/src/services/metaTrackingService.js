function buildMetaTrackingService(metaCapiService) {
  const allowedEvents = new Set(["Contact", "Search", "ViewContent"]);

  async function sendWebsiteEvent(input = {}, context = {}) {
    if (!metaCapiService) return { skipped: true, reason: "disabled" };

    const eventName = String(input.eventName || "").trim();
    if (!allowedEvents.has(eventName)) {
      const err = new Error("Unsupported Meta event");
      err.status = 400;
      throw err;
    }

    if (input?.tracking?.consent?.marketing !== true) {
      return { skipped: true, reason: "no_consent" };
    }

    const customData = { ...(input.customData || {}) };
    if (eventName === "Search") {
      const currency = String(customData.currency || "").trim().toUpperCase();
      customData.currency = /^[A-Z]{3}$/.test(currency) ? currency : "COP";

      const value = Number(customData.value);
      customData.value = Number.isFinite(value) && value >= 0 ? value : 0;
    }

    const event = metaCapiService.buildWebsiteEvent({
      eventName,
      eventId: input.eventId,
      sourceUrl: input.sourceUrl || input?.tracking?.sourceUrl || context.sourceUrl,
      request: {
        ip: context.ip,
        userAgent: context.userAgent,
      },
      tracking: {
        fbp: input?.tracking?.fbp,
        fbc: input?.tracking?.fbc,
      },
      userData: input.userData || {},
      customData,
    });

    return metaCapiService.sendEvents([event]);
  }

  return {
    sendWebsiteEvent,
  };
}

module.exports = buildMetaTrackingService;
