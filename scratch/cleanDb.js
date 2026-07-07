import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBW6LMdPFaE-r03pf5VV577WWd0nJzOzvc",
  authDomain: "elrade-936c2.firebaseapp.com",
  projectId: "elrade-936c2",
  storageBucket: "elrade-936c2.firebasestorage.app",
  messagingSenderId: "981886130398",
  appId: "1:981886130398:web:49e8807a565bbca8308a4f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function cleanDatabase() {
  const collectionsToClean = ['orders', 'expenses', 'agents', 'salary_payments'];
  
  for (const colName of collectionsToClean) {
    console.log(`Cleaning collection: ${colName}...`);
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      console.log(`Found ${snapshot.size} documents in ${colName}. deleting...`);
      
      const docs = snapshot.docs;
      // تقسيم الحذف لباتشات متتالية خفيفة (كل باتش 400 مستند)
      for (let i = 0; i < docs.length; i += 400) {
        const chunk = docs.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const document of chunk) {
          batch.delete(doc(db, colName, document.id));
        }
        await batch.commit();
        console.log(`Cleared batch ${Math.floor(i/400) + 1} of ${Math.ceil(docs.length/400)}`);
        await delay(200); // فاصل زمني لتجنب القفل
      }
      
      console.log(`Successfully cleared ${colName}.`);
    } catch (e) {
      console.error(`Error cleaning ${colName}:`, e.message);
    }
  }
  console.log("Database clean up finished successfully (Merchants collection was preserved).");
  process.exit(0);
}

cleanDatabase();
