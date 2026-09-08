/**
 * User location — detected via IP (no permission prompt, no API key) and
 * cached in localStorage. Used to localise currency and store suggestions.
 */

export type UserLocation = {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
};

const STORAGE_KEY = "giftgenie:location";

export function getStoredLocation(): UserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredLocation(loc: UserLocation | null): void {
  if (typeof window === "undefined") return;
  try {
    if (loc) localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage can throw in private-browsing modes — losing the cache is fine.
  }
}

// Keyless, HTTPS, CORS-enabled IP geolocation. Never throws — a failed
// detection should never block the chat from working.
export async function detectLocation(): Promise<UserLocation | null> {
  try {
    const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (!data?.success || !data.country) return null;
    return {
      city: data.city || undefined,
      region: data.region || undefined,
      country: data.country || undefined,
      countryCode: data.country_code || undefined,
    };
  } catch {
    return null;
  }
}
