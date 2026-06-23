import {
  getMarketingConsentForTracking,
  hasMarketingConsent,
} from "./marketingConsent";

type MetaPixelPayload = Record<string, unknown>;
type MetaPixelFunction = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: MetaPixelFunction;
};

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: Window["fbq"];
  }
}

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
let isPixelInitialized = false;

function isPublicRoute() {
  if (typeof window === "undefined") return false;
  return !window.location.pathname.startsWith("/admin");
}

function insertPixelScript() {
  if (typeof document === "undefined") return;
  if (document.getElementById("meta-pixel-script")) return;

  const script = document.createElement("script");
  script.id = "meta-pixel-script";
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
}

function createFbqShim(): MetaPixelFunction {
  const fbqShim: MetaPixelFunction = (...args: unknown[]) => {
    fbqShim.callMethod
      ? fbqShim.callMethod(...args)
      : fbqShim.queue?.push(args);
  };
  return fbqShim;
}

export function initMetaPixel() {
  if (!PIXEL_ID || isPixelInitialized || !hasMarketingConsent() || !isPublicRoute()) {
    return false;
  }

  if (window.fbq) {
    isPixelInitialized = true;
    return true;
  }

  const fbq: MetaPixelFunction = window.fbq || createFbqShim();

  if (!window.fbq) {
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;
  }

  insertPixelScript();
  window.fbq("init", PIXEL_ID);
  isPixelInitialized = true;
  return true;
}

export function trackMetaEvent(
  eventName: string,
  params: MetaPixelPayload = {},
  eventId?: string
) {
  if (!PIXEL_ID || !hasMarketingConsent() || !isPublicRoute()) return;
  initMetaPixel();
  if (!window.fbq) return;

  const options = eventId ? { eventID: eventId } : undefined;
  window.fbq("track", eventName, params, options);
}

export function generateMetaEventId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}.${random}`;
}

export function getMetaCookie(name: "_fbp" | "_fbc") {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!cookie) return null;
  return decodeURIComponent(cookie.slice(name.length + 1));
}

export function getMetaTrackingPayload(eventIds?: Record<string, string>) {
  return {
    consent: getMarketingConsentForTracking(),
    eventIds: eventIds || {},
    fbp: getMetaCookie("_fbp"),
    fbc: getMetaCookie("_fbc"),
    sourceUrl: typeof window !== "undefined" ? window.location.href : null,
  };
}

export async function trackServerMetaEvent(
  eventName: "Contact" | "Search" | "ViewContent",
  customData: MetaPixelPayload = {},
  eventId = generateMetaEventId(eventName.toLowerCase())
) {
  if (!PIXEL_ID || !hasMarketingConsent() || !isPublicRoute()) return;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "";

  try {
    await fetch(`${apiBase}/api/tracking/meta-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventId,
        sourceUrl: typeof window !== "undefined" ? window.location.href : null,
        tracking: getMetaTrackingPayload(),
        customData,
      }),
    });
  } catch (err) {
    console.error("Failed to send Meta server event", err);
  }
}
