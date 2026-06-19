export type MarketingConsent = {
  marketing: boolean;
  answeredAt: string;
};

const CONSENT_STORAGE_KEY = "logicCookieConsent";

function parseConsent(value: string | null): MarketingConsent | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<MarketingConsent>;
    if (typeof parsed.marketing !== "boolean") return null;
    if (typeof parsed.answeredAt !== "string") return null;
    return {
      marketing: parsed.marketing,
      answeredAt: parsed.answeredAt,
    };
  } catch {
    return null;
  }
}

export function getMarketingConsent(): MarketingConsent | null {
  if (typeof window === "undefined") return null;
  return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
}

export function hasMarketingConsent() {
  return getMarketingConsent()?.marketing === true;
}

export function saveMarketingConsent(marketing: boolean): MarketingConsent {
  const consent = {
    marketing,
    answeredAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    window.dispatchEvent(
      new CustomEvent("logic:marketing-consent-changed", { detail: consent })
    );
  }

  return consent;
}

export function getMarketingConsentForTracking() {
  const consent = getMarketingConsent();
  return {
    marketing: consent?.marketing === true,
    answeredAt: consent?.answeredAt ?? null,
  };
}
