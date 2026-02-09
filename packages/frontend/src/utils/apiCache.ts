/**
 * Simple cache utility using localStorage with expiration.
 */

const CACHE_PREFIX = "api_cache_";
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

type CacheEntry<T> = {
    data: T;
    timestamp: number;
    ttl: number;
};

export function getFromCache<T>(key: string): T | null {
    try {
        const item = localStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;

        const entry: CacheEntry<T> = JSON.parse(item);
        const now = Date.now();

        if (now - entry.timestamp > entry.ttl) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }

        return entry.data;
    } catch (e) {
        console.warn("Failed to retrieve from cache", e);
        return null;
    }
}

export function saveToCache<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS) {
    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttlMs,
        };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (e) {
        console.warn("Failed to save to cache", e);
    }
}

export function clearCache(key: string) {
    try {
        localStorage.removeItem(CACHE_PREFIX + key);
    } catch (e) {
        console.warn("Failed to clear cache", e);
    }
}
