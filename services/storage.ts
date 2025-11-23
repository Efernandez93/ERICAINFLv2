
import { AnalysisResult, GroundingSource } from '../types';
import { supabase } from './supabase';

/**
 * STORAGE SERVICE (HYBRID)
 *
 * 1. Tries to use Supabase PostgreSQL first.
 * 2. If Supabase fails (network, config missing, permission), falls back to LocalStorage.
 * 3. Handles quota limits for LocalStorage.
 * 4. Circuit Breaker: If cloud fails hard (e.g. DB not accessible), it disables cloud for the session.
 */

const CACHE_PREFIX = 'eric_ai_cache_v1_';
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 Hours

const SCHEDULE_CACHE_PREFIX = 'eric_ai_schedule_v1_';
const SCHEDULE_EXPIRY_MS = 1000 * 60 * 60 * 6; // 6 hours

// Circuit breaker flag to prevent spamming errors if DB is down/missing
let isCloudDisabled = false;

export interface CachedMatchup {
  data: AnalysisResult | null;
  sources: GroundingSource[];
  rawText: string;
}

export interface ScheduleCache {
  week: string;
  games: any[];
  timestamp: number;
}

interface CacheItem {
  timestamp: number;
  payload: CachedMatchup;
}

export const StorageService = {

  // Returns true if Supabase is configured AND hasn't failed yet
  isCloudActive: () => !!supabase && !isCloudDisabled,

  /**
   * ACTUALLY tests the connection.
   * Returns true if we can reach Supabase, false otherwise.
   */
  verifyConnection: async (): Promise<boolean> => {
    if (!supabase) {
      isCloudDisabled = true;
      return false;
    }

    try {
      // Try to read from the matchups table (even if empty)
      // This tests connectivity without requiring a specific document
      const { error } = await supabase
        .from('matchups')
        .select('id')
        .limit(1);

      if (error) {
        console.warn(`[STORAGE] Connection Verification Failed: ${error.message}`);
        isCloudDisabled = true;
        return false;
      }

      console.log('[STORAGE] Connection Verified: ONLINE');
      isCloudDisabled = false;
      return true;
    } catch (e: any) {
      console.warn(`[STORAGE] Connection Verification Failed: ${e.message}`);
      isCloudDisabled = true;
      return false;
    }
  },

  /**
   * Saves analysis result to Storage (Cloud -> Fallback Local).
   */
  saveMatchup: async (gameId: string, data: CachedMatchup): Promise<void> => {
    const item: CacheItem = {
      timestamp: Date.now(),
      payload: data
    };

    // 1. Try Supabase
    if (supabase && !isCloudDisabled) {
      try {
        const { error } = await supabase
          .from('matchups')
          .upsert({
            id: gameId,
            timestamp: item.timestamp,
            data: item.payload.data,
            sources: item.payload.sources,
            raw_text: item.payload.rawText
          });

        if (error) {
          console.warn(`[STORAGE] Supabase save failed: ${error.message}`);
          // If permissions or connection issues, disable cloud for this session
          if (error.message.includes('permission') || error.message.includes('connection')) {
            isCloudDisabled = true;
          }
        } else {
          console.log(`[STORAGE] Saved ${gameId} to Supabase`);
          return; // Success, exit
        }
      } catch (e: any) {
        console.warn(`[STORAGE] Supabase save failed: ${e.message}`);
        isCloudDisabled = true;
      }
    }

    // 2. Fallback to LocalStorage
    const key = `${CACHE_PREFIX}${gameId}`;
    const value = JSON.stringify(item);

    try {
      localStorage.setItem(key, value);
      console.log(`[STORAGE] Saved ${gameId} to LocalStorage`);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        StorageService.pruneCache();
        try {
          localStorage.setItem(key, value);
        } catch (retryError) {
          console.error('[STORAGE] Failed to save even after pruning', retryError);
        }
      }
    }
  },

  /**
   * Retrieves analysis from Storage (Cloud -> Fallback Local).
   */
  getMatchup: async (gameId: string): Promise<CachedMatchup | null> => {

    // 1. Try Supabase
    if (supabase && !isCloudDisabled) {
      try {
        const { data, error } = await supabase
          .from('matchups')
          .select('*')
          .eq('id', gameId)
          .single();

        if (error) {
          // 'PGRST116' is "not found" error - not a critical failure
          if (error.code !== 'PGRST116') {
            console.warn(`[STORAGE] Supabase read failed: ${error.message}`);
            if (error.message.includes('permission') || error.message.includes('connection')) {
              isCloudDisabled = true;
            }
          }
        } else if (data) {
          // Check expiry
          if (Date.now() - data.timestamp < CACHE_EXPIRY_MS) {
            console.log(`[STORAGE] Hit Supabase Cache for ${gameId}`);
            return {
              data: data.data,
              sources: data.sources || [],
              rawText: data.raw_text || ''
            };
          }
        }
      } catch (e: any) {
        console.warn(`[STORAGE] Supabase read failed: ${e.message}`);
        isCloudDisabled = true;
      }
    }

    // 2. Fallback to LocalStorage
    const localItemStr = localStorage.getItem(`${CACHE_PREFIX}${gameId}`);
    if (!localItemStr) return null;

    try {
      const item: CacheItem = JSON.parse(localItemStr);
      if (Date.now() - item.timestamp < CACHE_EXPIRY_MS) {
        console.log(`[STORAGE] Hit Local Cache for ${gameId}`);
        return item.payload;
      } else {
        localStorage.removeItem(`${CACHE_PREFIX}${gameId}`);
        return null;
      }
    } catch (e) {
      return null;
    }
  },

  /**
   * Returns a list of cached game IDs from BOTH LocalStorage and Cloud.
   * This ensures devices sync their "ready" status.
   */
  getCachedGameIds: async (): Promise<string[]> => {
    const ids = new Set<string>();

    // 1. LocalStorage (Always check this first, it's instant)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        ids.add(key.replace(CACHE_PREFIX, ''));
      }
    }

    // 2. Supabase (If connected, fetch list of all analyzed games)
    if (supabase && !isCloudDisabled) {
      try {
        const { data, error } = await supabase
          .from('matchups')
          .select('id');

        if (error) {
          console.warn('[STORAGE] Failed to fetch cloud IDs:', error.message);
          if (error.message.includes('permission') || error.message.includes('connection')) {
            isCloudDisabled = true;
          }
        } else if (data) {
          data.forEach((row: { id: string }) => {
            ids.add(row.id);
          });
          console.log(`[STORAGE] Synced ${data.length} games from Supabase`);
        }
      } catch (e: any) {
        console.warn('[STORAGE] Failed to fetch cloud IDs:', e.message);
        isCloudDisabled = true;
      }
    }

    return Array.from(ids);
  },

  pruneCache: () => {
    const items: { key: string; timestamp: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const item: CacheItem = JSON.parse(localStorage.getItem(key) || '{}');
          items.push({ key, timestamp: item.timestamp || 0 });
        } catch (e) {
          items.push({ key, timestamp: 0 });
        }
      }
    }
    items.sort((a, b) => a.timestamp - b.timestamp);
    items.slice(0, 5).forEach(item => localStorage.removeItem(item.key));
  },

  /**
   * Saves NFL schedule to Supabase + LocalStorage cache
   * Schedules are cached for 6 hours (shorter than matchups since they update weekly)
   * Schedules are now shared across all users via Supabase!
   */
  saveSchedule: async (week: string, games: any[]): Promise<void> => {
    const cacheKey = `${SCHEDULE_CACHE_PREFIX}${week}`;
    const cache: ScheduleCache = {
      week,
      games,
      timestamp: Date.now()
    };

    // 1. Try Supabase (Cloud) - Share schedule with all users
    if (supabase && !isCloudDisabled) {
      try {
        const { error } = await supabase
          .from('schedules')
          .upsert({
            id: week,
            week,
            games,
            timestamp: Date.now()
          });

        if (error) {
          console.warn(`[STORAGE] Supabase schedule save failed: ${error.message}`);
          if (error.message.includes('permission') || error.message.includes('connection')) {
            isCloudDisabled = true;
          }
        } else {
          console.log(`[STORAGE] Saved schedule for ${week} to Supabase`);
        }
      } catch (e: any) {
        console.warn(`[STORAGE] Supabase schedule save failed: ${e.message}`);
        isCloudDisabled = true;
      }
    }

    // 2. Fallback to LocalStorage
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cache));
      console.log(`[STORAGE] Saved schedule for ${week} to LocalStorage`);
    } catch (e: any) {
      console.warn(`[STORAGE] Failed to cache schedule: ${e.message}`);
    }
  },

  /**
   * Retrieves cached NFL schedule from Supabase (Cloud) first, then LocalStorage
   * Returns null if not found or expired (6 hour TTL)
   * Schedules are now shared across all users!
   */
  getSchedule: async (week: string): Promise<any[] | null> => {
    const cacheKey = `${SCHEDULE_CACHE_PREFIX}${week}`;

    // 1. Try Supabase (Cloud) - Get shared schedule
    if (supabase && !isCloudDisabled) {
      try {
        const { data, error } = await supabase
          .from('schedules')
          .select('*')
          .eq('id', week)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.warn(`[STORAGE] Supabase read schedule failed: ${error.message}`);
            if (error.message.includes('permission') || error.message.includes('connection')) {
              isCloudDisabled = true;
            }
          }
        } else if (data) {
          // Check expiry
          if (Date.now() - data.timestamp < SCHEDULE_EXPIRY_MS) {
            console.log(`[STORAGE] Hit Supabase schedule cache for ${week}`);
            return data.games;
          }
        }
      } catch (e: any) {
        console.warn(`[STORAGE] Supabase read schedule failed: ${e.message}`);
        isCloudDisabled = true;
      }
    }

    // 2. Fallback to LocalStorage
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    try {
      const cache: ScheduleCache = JSON.parse(cached);
      if (Date.now() - cache.timestamp < SCHEDULE_EXPIRY_MS) {
        console.log(`[STORAGE] Hit LocalStorage schedule cache for ${week}`);
        return cache.games;
      } else {
        localStorage.removeItem(cacheKey);
        return null;
      }
    } catch (e) {
      console.warn(`[STORAGE] Failed to parse schedule cache: ${e}`);
      return null;
    }
  },

  /**
   * Gets cache statistics for display in UI
   */
  getCacheStats: async (): Promise<{
    totalGames: number;
    totalSchedules: number;
    isCloudConnected: boolean;
    localStorageSize: number;
  }> => {
    const ids = new Set<string>();
    let localStorageSize = 0;

    // Count games in LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        ids.add(key.replace(CACHE_PREFIX, ''));
        const item = localStorage.getItem(key);
        if (item) localStorageSize += item.length;
      }
    }

    let totalSchedules = 0;
    // Count schedules in LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SCHEDULE_CACHE_PREFIX)) {
        totalSchedules++;
      }
    }

    let cloudGameCount = 0;
    if (supabase && !isCloudDisabled) {
      try {
        const { data, error } = await supabase
          .from('matchups')
          .select('id', { count: 'exact' });

        if (!error && data) {
          cloudGameCount = data.length;
        }
      } catch (e) {
        // Silently fail
      }
    }

    return {
      totalGames: Math.max(ids.size, cloudGameCount),
      totalSchedules,
      isCloudConnected: supabase !== null && !isCloudDisabled,
      localStorageSize
    };
  }
};
