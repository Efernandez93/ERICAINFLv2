import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { AnalysisResult, GroundingSource } from '../types';

/**
 * FIREBASE CONFIGURATION
 */
const firebaseConfig = {
  apiKey: "AIzaSyDPJMHCJTBcdbI99rr9IwWVsklECYN9dkw",
  authDomain: "ericai-967a6.firebaseapp.com",
  databaseURL: "https://ericai-967a6-default-rtdb.firebaseio.com",
  projectId: "ericai-967a6",
  storageBucket: "ericai-967a6.firebasestorage.app",
  messagingSenderId: "370213861406",
  appId: "1:370213861406:web:ced0f5ed7819825d99d60f",
  measurementId: "G-573MPLTMT3"
};

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

// Initialize Firebase safely
let db: any = null;
let isFirebaseActive = false;

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseActive = true;
    console.log("[STORAGE] Firebase initialized successfully");
} catch (e) {
    console.warn("[STORAGE] Failed to initialize Firebase:", e);
}

export const StorageService = {
  
  isCloudActive: () => isFirebaseActive,

  /**
   * Saves analysis result to storage (Firebase + LocalStorage).
   */
  saveMatchup: async (gameId: string, data: CachedMatchup): Promise<void> => {
    const item: CacheItem = {
      timestamp: Date.now(),
      payload: data
    };

    // 1. Save to LocalStorage (Fast, immediate access for this user)
    try {
      localStorage.setItem(`${CACHE_PREFIX}${gameId}`, JSON.stringify(item));
    } catch (e) {
      console.warn("LocalStorage quota exceeded", e);
    }

    // 2. Save to Firebase (Shared access for all users)
    if (isFirebaseActive && db) {
      try {
        await setDoc(doc(db, "matchups", gameId), {
            ...item,
            createdAt: Timestamp.now()
        });
        console.log(`[STORAGE] Saved ${gameId} to Firestore`);
      } catch (e) {
        console.error("[STORAGE] Error saving to Firestore:", e);
      }
    }
  },

  /**
   * Retrieves analysis from storage.
   * Priority: LocalStorage (Fastest) -> Firestore (Shared)
   */
  getMatchup: async (gameId: string): Promise<CachedMatchup | null> => {
    // 1. Check LocalStorage first
    const localItemStr = localStorage.getItem(`${CACHE_PREFIX}${gameId}`);
    if (localItemStr) {
      try {
        const item: CacheItem = JSON.parse(localItemStr);
        if (Date.now() - item.timestamp < CACHE_EXPIRY_MS) {
          console.log(`[STORAGE] Hit Local Cache for ${gameId}`);
          return item.payload;
        } else {
            localStorage.removeItem(`${CACHE_PREFIX}${gameId}`);
        }
      } catch (e) { /* Ignore parse errors */ }
    }

    // 2. Check Firebase if local miss
    if (isFirebaseActive && db) {
        try {
            const docRef = doc(db, "matchups", gameId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as any; // Cast generic data
                // Basic expiry check on DB data (optional, but good for freshness)
                if (Date.now() - data.timestamp < CACHE_EXPIRY_MS) {
                     console.log(`[STORAGE] Hit Cloud Cache for ${gameId}`);
                     
                     // Re-hydrate local cache for next time
                     localStorage.setItem(`${CACHE_PREFIX}${gameId}`, JSON.stringify({
                         timestamp: data.timestamp,
                         payload: data.payload
                     }));

                     return data.payload as CachedMatchup;
                }
            }
        } catch (e) {
            console.error("[STORAGE] Error reading from Firestore:", e);
        }
    }

    return null;
  },

  /**
   * Returns a list of all game IDs currently in the cache.
   * Merges LocalStorage and Firestore availability.
   */
  getCachedGameIds: async (): Promise<string[]> => {
    const ids = new Set<string>();

    // Get Local IDs
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
            ids.add(key.replace(CACHE_PREFIX, ''));
        }
    });

    // Get Cloud IDs
    if (isFirebaseActive && db) {
        try {
            const querySnapshot = await getDocs(collection(db, "matchups"));
            querySnapshot.forEach((doc) => {
                ids.add(doc.id);
            });
        } catch (e) {
            console.warn("[STORAGE] Failed to fetch index from Firestore", e);
        }
    }

    return Array.from(ids);
  },

  /**
   * Clear local cache only (Admin utility)
   */
  clearLocalCache: (): void => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};
