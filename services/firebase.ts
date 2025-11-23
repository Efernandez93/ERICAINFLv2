import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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

let app;
let db: any = null;

try {
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("[FIREBASE] Initialized with project:", firebaseConfig.projectId);
    } else {
        console.warn("[FIREBASE] Config missing. Running in Local Mode.");
    }
} catch (e) {
    console.error("[FIREBASE] Initialization failed:", e);
}

export { db };