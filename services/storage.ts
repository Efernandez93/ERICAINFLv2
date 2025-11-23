import { AnalysisResult, GroundingSource } from '../types';

/**
 * STORAGE SERVICE (LOCAL ONLY)
 * 
 * Migrated from Firebase to LocalStorage to resolve connection/permission errors.
 * Vercel Blob requires a server-side token exchange which is not available
 * in this client-side Vite application. 
 * 
 * This service implements a robust LocalStorage pattern with LRU (Least Recently Used)
 * eviction if the quota is exceeded.
 */

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
  
  // Always return true for local mode
  isCloudActive: () => false,

  /**
   * Saves analysis result to LocalStorage.
   * Handles quota limits by removing oldest entries.
   */
  saveMatchup: async (gameId: string, data: CachedMatchup): Promise<void> => {
    const item: CacheItem = {
      timestamp: Date.now(),
      payload: data
    };

    const key = `${CACHE_PREFIX}${gameId}`;
    const value = JSON.stringify(item);

    try {
      localStorage.setItem(key, value);
      console.log(`[STORAGE] Saved ${gameId} to LocalStorage`);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn("[STORAGE] Quota exceeded. Cleaning up old cache...");
        StorageService.pruneCache();
        try {
            // Try one more time after pruning
            localStorage.setItem(key, value);
        } catch (retryError) {
            console.error("[STORAGE] Failed to save even after pruning", retryError);
        }
      }
    }
  },

  /**
   * Retrieves analysis from LocalStorage.
   */
  getMatchup: async (gameId: string): Promise<CachedMatchup | null> => {
    const localItemStr = localStorage.getItem(`${CACHE_PREFIX}${gameId}`);
    
    if (!localItemStr) return null;

    try {
      const item: CacheItem = JSON.parse(localItemStr);
      
      // Check Expiry
      if (Date.now() - item.timestamp < CACHE_EXPIRY_MS) {
        console.log(`[STORAGE] Hit Local Cache for ${gameId}`);
        return item.payload;
      } else {
        console.log(`[STORAGE] Expired Cache for ${gameId}`);
        localStorage.removeItem(`${CACHE_PREFIX}${gameId}`);
        return null;
      }
    } catch (e) { 
        console.error("Cache Parse Error", e);
        return null; 
    }
  },

  /**
   * Returns a list of all game IDs currently in the cache.
   */
  getCachedGameIds: async (): Promise<string[]> => {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
            ids.push(key.replace(CACHE_PREFIX, ''));
        }
    }
    return ids;
  },

  /**
   * Helper to remove oldest items when storage is full
   */
  pruneCache: () => {
    const items: {key: string, timestamp: number}[] = [];
    
    // 1. Gather all cache items
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
            try {
                const item: CacheItem = JSON.parse(localStorage.getItem(key) || '{}');
                items.push({ key, timestamp: item.timestamp || 0 });
            } catch (e) {
                // Corrupt item, mark for deletion
                items.push({ key, timestamp: 0 }); 
            }
        }
    }

    // 2. Sort by oldest first
    items.sort((a, b) => a.timestamp - b.timestamp);

    // 3. Remove the oldest 5 items
    const itemsToRemove = items.slice(0, 5);
    itemsToRemove.forEach(item => {
        localStorage.removeItem(item.key);
        console.log(`[STORAGE] Pruned ${item.key}`);
    });
  },

  /**
   * Clear local cache only (Admin utility)
   */
  clearLocalCache: (): void => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log("[STORAGE] Cache Cleared");
  }
};