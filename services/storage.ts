
import { AnalysisResult, GroundingSource } from '../types';

const CACHE_PREFIX = 'eric_ai_cache_v1_';
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 Hours

export interface CachedMatchup {
  data: AnalysisResult | null;
  sources: GroundingSource[];
  rawText: string;
}

interface CacheItem {
  timestamp: number;
  payload: CachedMatchup;
}

export const StorageService = {
  /**
   * Saves analysis result to storage.
   * Currently uses localStorage (Browser specific).
   * TODO: Replace with Firebase/Supabase call for shared caching across users.
   */
  saveMatchup: (gameId: string, data: CachedMatchup): void => {
    const item: CacheItem = {
      timestamp: Date.now(),
      payload: data
    };
    try {
      localStorage.setItem(`${CACHE_PREFIX}${gameId}`, JSON.stringify(item));
    } catch (e) {
      console.warn("Storage quota exceeded or error saving to cache", e);
    }
  },

  /**
   * Retrieves analysis from storage if valid and not expired.
   */
  getMatchup: (gameId: string): CachedMatchup | null => {
    const itemStr = localStorage.getItem(`${CACHE_PREFIX}${gameId}`);
    if (!itemStr) return null;

    try {
      const item: CacheItem = JSON.parse(itemStr);
      
      // Check Expiry
      if (Date.now() - item.timestamp > CACHE_EXPIRY_MS) {
        localStorage.removeItem(`${CACHE_PREFIX}${gameId}`);
        return null;
      }
      
      return item.payload;
    } catch (e) {
      return null;
    }
  },

  /**
   * Returns a list of all game IDs currently in the cache.
   */
  getCachedGameIds: (): string[] => {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_PREFIX))
      .map(key => key.replace(CACHE_PREFIX, ''));
  },

  /**
   * Clear all cached data
   */
  clearCache: (): void => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};
