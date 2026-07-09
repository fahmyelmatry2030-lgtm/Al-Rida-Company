import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBW6LMdPFaE-r03pf5VV577WWd0nJzOzvc",
  authDomain: "elrade-936c2.firebaseapp.com",
  projectId: "elrade-936c2",
  storageBucket: "elrade-936c2.appspot.com",
  messagingSenderId: "360057416416",
  appId: "1:360057416416:web:656f4d0d0f28e20f18c8e6",
  measurementId: "G-7Z52V8V1T9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const getActiveOrdersLimitDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().split('T')[0];
};

async function migrateData() {
  const limitStr = getActiveOrdersLimitDate();
  console.log('Oldest allowed active date (limitStr):', limitStr);
  
  const snap = await getDocs(collection(db, 'orders'));
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log('Total orders:', orders.length);

  let updates = 0;
  const promises = [];

  for (const order of orders) {
    let shouldUpdate = false;
    let archivedStatus = order.archived;

    // Strict boolean mapping
    if (order.archived === undefined || order.archived === null || order.archived === "false" || order.archived === "") {
        archivedStatus = false;
    } else if (order.archived === "true") {
        archivedStatus = true;
    }

    // Migration rule: If date is older than limitStr and it's active, force archive it
    if (order.date && order.date < limitStr && archivedStatus !== true) {
        archivedStatus = true;
    }

    if (order.archived !== archivedStatus) {
        shouldUpdate = true;
    }

    if (shouldUpdate) {
        promises.push(updateDoc(doc(db, 'orders', order.id), { archived: archivedStatus }));
        updates++;
    }
  }

  console.log(`Need to update ${updates} orders.`);
  
  // Batch update 100 at a time
  for (let i = 0; i < promises.length; i += 100) {
    console.log(`Updating batch ${i} to ${i + 100}...`);
    await Promise.all(promises.slice(i, i + 100));
  }

  console.log('Migration completed successfully!');
}

migrateData().catch(console.error);
