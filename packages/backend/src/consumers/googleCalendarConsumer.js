const crypto = require("crypto");

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwtRs256({ header, payload, privateKey }) {
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(data);
  signer.end();
  const signature = signer.sign(privateKey);
  return `${data}.${base64UrlEncode(signature)}`;
}

async function requestServiceAccountToken({
  serviceAccountEmail,
  privateKey,
  scope,
}) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = signJwtRs256({
    header: { alg: "RS256", typ: "JWT" },
    payload: {
      iss: serviceAccountEmail,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    privateKey,
  });

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Failed to get Google token: ${res.status} ${text}`);
    err.status = 502;
    throw err;
  }

  const json = await res.json();
  const accessToken = json.access_token;
  const expiresIn = Number(json.expires_in) || 3600;

  if (!accessToken) {
    const err = new Error("Google token response missing access_token.");
    err.status = 502;
    throw err;
  }

  return { accessToken, expiresAt: Date.now() + expiresIn * 1000 };
}

module.exports = async function initGoogleCalendarConsumer(googleConfig = {}) {
  const calendarId = String(googleConfig.calendarId || "").trim();
  const serviceAccountEmail = String(
    googleConfig.serviceAccountEmail || ""
  ).trim();
  const privateKeyRaw = String(googleConfig.serviceAccountPrivateKey || "");
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n").trim();

  if (!calendarId || !serviceAccountEmail || !privateKey) return null;

  const scope = "https://www.googleapis.com/auth/calendar.events";
  let cachedToken = null;

  async function getAccessToken() {
    if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
      return cachedToken.accessToken;
    }

    cachedToken = await requestServiceAccountToken({
      serviceAccountEmail,
      privateKey,
      scope,
    });
    return cachedToken.accessToken;
  }

  async function createEvent({
    summary,
    description,
    startDateTime,
    endDateTime,
    timeZone,
    attendees,
  }) {
    const accessToken = await getAccessToken();

    const payload = {
      summary: summary || "Reserva Logic Escape Room",
      description: description || "",
      start: { dateTime: startDateTime, timeZone: timeZone || "UTC" },
      end: { dateTime: endDateTime, timeZone: timeZone || "UTC" },
      attendees: (Array.isArray(attendees) ? attendees : [])
        .filter(Boolean)
        .map((email) => ({ email })),
    };

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(
        `Failed to create Google Calendar event: ${res.status} ${text}`
      );
      err.status = 502;
      throw err;
    }

    const json = await res.json();
    return {
      id: json.id,
      htmlLink: json.htmlLink,
    };
  }

  return { createEvent };
};

