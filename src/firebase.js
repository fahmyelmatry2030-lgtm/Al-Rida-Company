import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: استبدل هذه القيم بالقيم الخاصة بمشروعك من Firebase Console
const firebaseConfig = {
  apiKey: "ضع_الكود_هنا",
  authDomain: "ضع_الكود_هنا",
  projectId: "ضع_الكود_هنا",
  storageBucket: "ضع_الكود_هنا",
  messagingSenderId: "ضع_الكود_هنا",
  appId: "ضع_الكود_هنا"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
