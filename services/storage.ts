import { AnalysisResult, GroundingSource } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * STORAGE SERVICE (HYBRID)
 * 
 * 1. Tries to use Firebase Firestore first.
 * 2. If Firebase fails (network, config missing, permission), falls back to LocalStorage.
 * 3. Handles quota limits for LocalStorage.
 * 4. Circuit Breaker: If cloud fails hard (e.g. DB not created), it disables cloud for the session.
 */

const CACHE_PREFIX = 'eric_ai_cache_v1_';
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 Hours

// Circuit breaker flag to prevent spamming errors if DB is down/missing
let isCloudDisabled = false;

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

  // Returns true if Firebase is configured AND hasn't failed yet
  isCloudActive: () => !!db && !isCloudDisabled,

  /**
   * Saves analysis result to Storage (Cloud -> Fallback Local).
   */
  saveMatchup: async (gameId: string, data: CachedMatchup): Promise<void> => {
    const item: CacheItem = {
      timestamp: Date.now(),
      payload: data
    };

    // 1. Try Firebase
    if (db && !isCloudDisabled) {
        try {
            const docRef = doc(db, "matchups", gameId);
            await setDoc(docRef, item);
            console.log(`[STORAGE] Saved ${gameId} to Firestore`);
            return; // Success, exit
        } catch (e: any) {
            console.warn(`[STORAGE] Firestore save failed: ${e.code || e.message}`);
            // If the database doesn't exist or permissions are wrong, stop trying for this session
            if (e.code === 'not-found' || e.code === 'permission-denied' || e.code === 'unavailable') {
                console.warn("[STORAGE] Disabling Cloud Storage for this session. Please check Firebase Console setup.");
                isCloudDisabled = true;
            }
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
            console.error("[STORAGE] Failed to save even after pruning", retryError);
        }
      }
    }
  },

  /**
   * Retrieves analysis from Storage (Cloud -> Fallback Local).
   */
  getMatchup: async (gameId: string): Promise<CachedMatchup | null> => {
    
    // 1. Try Firebase
    if (db && !isCloudDisabled) {
        try {
            const docRef = doc(db, "matchups", gameId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const item = docSnap.data() as CacheItem;
                // Check Expiry (Optional for cloud, but good practice)
                if (Date.now() - item.timestamp < CACHE_EXPIRY_MS) {
                    console.log(`[STORAGE] Hit Firestore Cache for ${gameId}`);
                    return item.payload;
                }
            }
        } catch (e: any) {
            console.warn(`[STORAGE] Firestore read failed: ${e.code || e.message}`);
            if (e.code === 'not-found' || e.code === 'permission-denied' || e.code === 'unavailable') {
                isCloudDisabled = true;
            }
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
   * Returns a list of cached game IDs (Local Only for speed, or could expand to query firestore)
   * Currently keeps this local for immediate UI feedback.
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

  pruneCache: () => {
    const items: {key: string, timestamp: number}[] = [];
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
  }
};