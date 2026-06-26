import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCsg_Zk0TTJrFCVgZjy4I07TYG1pb8eGeg",
  authDomain: "elrade.firebaseapp.com",
  projectId: "elrade",
  storageBucket: "elrade.firebasestorage.app",
  messagingSenderId: "1954163201",
  appId: "1:1954163201:web:495659dfd256359b486e00",
  measurementId: "G-LE5WMY2WNH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
