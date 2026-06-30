// Script to delete all documents from 'orders' and 'expenses' collections in Firestore
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBW6LMdPFaE-r03pf5VV577WWd0nJzOzvc",
  authDomain: "elrade-936c2.firebaseapp.com",
  projectId: "elrade-936c2",
  storageBucket: "elrade-936c2.firebasestorage.app",
  messagingSenderId: "981886130398",
  appId: "1:981886130398:web:49e8807a565bbca8308a4f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearCollection(collectionName) {
  console.log(`\nDeleting all documents from '${collectionName}'...`);
  const snapshot = await getDocs(collection(db, collectionName));
  
  if (snapshot.empty) {
    console.log(`  '${collectionName}' is already empty.`);
    return 0;
  }

  let count = 0;
  // Use batched writes (max 500 per batch)
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const docSnap of snapshot.docs) {
    batch.delete(doc(db, collectionName, docSnap.id));
    batchCount++;
    count++;

    if (batchCount === 500) {
      await batch.commit();
      console.log(`  Deleted batch of 500 (total: ${count})`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`  ✅ Deleted ${count} documents from '${collectionName}'.`);
  return count;
}

async function main() {
  console.log("=== Clearing Firestore Data ===");
  
  const ordersCount = await clearCollection("orders");
  const expensesCount = await clearCollection("expenses");
  
  console.log(`\n=== Done ===`);
  console.log(`Total deleted: ${ordersCount + expensesCount} documents`);
  
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
