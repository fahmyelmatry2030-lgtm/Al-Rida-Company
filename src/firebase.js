import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBW6LMdPFaE-r03pf5VV577WWd0nJzOzvc",
  authDomain: "elrade-936c2.firebaseapp.com",
  projectId: "elrade-936c2",
  storageBucket: "elrade-936c2.firebasestorage.app",
  messagingSenderId: "981886130398",
  appId: "1:981886130398:web:49e8807a565bbca8308a4f",
  measurementId: "G-R8Q0L0CXQT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize Firestore with persistent local cache (IndexedDB)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

