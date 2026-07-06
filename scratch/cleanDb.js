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

async function cleanDatabase() {
  const collectionsToClean = ['orders', 'expenses', 'agents', 'salary_payments'];
  
  for (const colName of collectionsToClean) {
    console.log(`Cleaning collection: ${colName}...`);
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      console.log(`Found ${snapshot.size} documents in ${colName}. deleting in parallel batches...`);
      
      const docs = snapshot.docs;
      const chunks = [];
      for (let i = 0; i < docs.length; i += 100) {
        chunks.push(docs.slice(i, i + 100));
      }
      
      for (const chunk of chunks) {
        const promises = chunk.map(document => deleteDoc(doc(db, colName, document.id)));
        await Promise.all(promises);
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
