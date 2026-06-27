import { db } from './firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

export const setupDefaultAdmin = async () => {
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (snap.empty) {
      await setDoc(doc(db, 'users', 'admin'), {
        id: 'admin', username: 'admin', password: 'admin', role: 'admin', name: 'المدير'
      });
      console.log('Default admin created');
    }
  } catch (err) {
    console.error('Setup error:', err);
  }
};
