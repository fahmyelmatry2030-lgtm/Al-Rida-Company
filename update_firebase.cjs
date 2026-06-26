const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Imports
content = content.replace(
  "import OrderModal from './OrderModal';",
  `import OrderModal from './OrderModal';
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';`
);

// 2. State Initialization
// Replace LocalStorage state with empty arrays + add migration state
content = content.replace(
  /  const \[orders, setOrders\] = useState\(\(\) => \{[\s\S]*? INITIAL_ORDERS;\n  \}\);/,
  "  const [orders, setOrders] = useState([]);"
);

content = content.replace(
  /  const \[employees, setEmployees\] = useState\(\(\) => \{[\s\S]*?return \[\];\n  \}\);/,
  "  const [employees, setEmployees] = useState([]);"
);

content = content.replace(
  /  const \[merchants, setMerchants\] = useState\(\(\) => JSON\.parse\(localStorage\.getItem\('shipping_merchants'\) \|\| '\[\]'\)\);/,
  "  const [merchants, setMerchants] = useState([]);"
);
content = content.replace(
  /  const \[agents, setAgents\] = useState\(\(\) => JSON\.parse\(localStorage\.getItem\('shipping_agents'\) \|\| '\[\]'\)\);/,
  "  const [agents, setAgents] = useState([]);"
);
content = content.replace(
  /  const \[expenses, setExpenses\] = useState\(\(\) => JSON\.parse\(localStorage\.getItem\('shipping_expenses'\) \|\| '\[\]'\)\);/,
  "  const [expenses, setExpenses] = useState([]);"
);

// Remove LocalStorage Save Effects
content = content.replace(/  \/\/ Save to LocalStorage\n[\s\S]*?(?=\n  const calculateNet)/, `
  // --- Firebase Sync ---
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), snap => setOrders(snap.docs.map(d => d.data())));
    const unsubEmployees = onSnapshot(collection(db, 'employees'), snap => setEmployees(snap.docs.map(d => d.data())));
    const unsubMerchants = onSnapshot(collection(db, 'merchants'), snap => setMerchants(snap.docs.map(d => d.data())));
    const unsubAgents = onSnapshot(collection(db, 'agents'), snap => setAgents(snap.docs.map(d => d.data())));
    const unsubExpenses = onSnapshot(collection(db, 'expenses'), snap => setExpenses(snap.docs.map(d => d.data())));
    return () => { unsubOrders(); unsubEmployees(); unsubMerchants(); unsubAgents(); unsubExpenses(); };
  }, []);

  const migrateFromLocal = async () => {
    if(!window.confirm('هل تريد ترحيل البيانات المحلية إلى Firebase؟ هذا الإجراء سيرفع كل البيانات الموجودة على جهازك لتصبح متاحة للجميع.')) return;
    try {
      const localOrders = JSON.parse(localStorage.getItem('shipping_orders') || '[]');
      const localEmp = JSON.parse(localStorage.getItem('shipping_employees') || '[]');
      const localMer = JSON.parse(localStorage.getItem('shipping_merchants') || '[]');
      const localAg = JSON.parse(localStorage.getItem('shipping_agents') || '[]');
      const localExp = JSON.parse(localStorage.getItem('shipping_expenses') || '[]');
      
      for(const item of localOrders) await setDoc(doc(db, 'orders', item.id), item);
      for(const item of localEmp) await setDoc(doc(db, 'employees', item.id), item);
      for(const item of localMer) await setDoc(doc(db, 'merchants', item.id), item);
      for(const item of localAg) await setDoc(doc(db, 'agents', item.id), item);
      for(const item of localExp) await setDoc(doc(db, 'expenses', item.id), item);
      
      alert('تم الترحيل بنجاح!');
    } catch(err) {
      alert('خطأ في الترحيل: يرجى التأكد من إضافة بيانات Firebase بشكل صحيح في src/firebase.js\\n\\n' + err.message);
    }
  };
`);

// 3. Update CRUD Operations
content = content.replace(
  /  const handleSaveEntity = \(setter, modalSetter, savedItem\) => \{[\s\S]*?modalSetter\(\{ isOpen: false, data: null \}\);\n  \};/,
  `  const handleSaveEntity = async (collectionName, modalSetter, savedItem) => {
    try {
      await setDoc(doc(db, collectionName, savedItem.id), savedItem);
      modalSetter({ isOpen: false, data: null });
    } catch(err) {
      alert('خطأ في الحفظ: ' + err.message);
    }
  };`
);

content = content.replace(
  /  const handleOrderChange = \(id, field, value\) => \{[\s\S]*?return order;\n    \}\)\);\n  \};/,
  `  const handleOrderChange = async (id, field, value) => {
    const order = orders.find(o => o.id === id);
    if (!order || (order.settled && field !== 'settled')) return;
    
    let updatedOrder = { ...order, [field]: value };
    if (field === 'status') {
      const zeroCollectedStatuses = ['لاغي', 'غير متاح', 'عدم رد', 'بدون شحن', 'تهرب', 'مؤجل', 'رفض شحن'];
      if (zeroCollectedStatuses.includes(value)) updatedOrder.collected = 0;
      else if (['تم التسليم', 'اوت زون', 'نزول'].includes(value)) updatedOrder.collected = updatedOrder.total;
    }
    
    try {
      await setDoc(doc(db, 'orders', id), updatedOrder);
    } catch(err) {
      alert('خطأ في التحديث: ' + err.message);
    }
  };`
);

content = content.replace(
  /  const handleSaveOrder = \(savedOrder\) => \{[\s\S]*?\}\);\n  \};/,
  `  const handleSaveOrder = async (savedOrder) => {
    try {
      await setDoc(doc(db, 'orders', savedOrder.id), savedOrder);
    } catch(err) {
      alert('خطأ: ' + err.message);
    }
  };`
);

content = content.replace(
  /  const deleteRow = \(id\) => \{[\s\S]*?filter\(o => o\.id !== id\)\);\n  \};/,
  `  const deleteRow = async (id) => {
    const order = orders.find(o => o.id === id);
    if (order?.settled) return alert('لا يمكن حذف طلب تم تقفيله.');
    if (window.confirm('هل أنت متأكد من مسح هذا الطلب؟')) {
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch(err) {
        alert('خطأ: ' + err.message);
      }
    }
  };`
);

content = content.replace(
  /  const settleOrders = \(\) => \{[\s\S]*?\}\);\n    \}\n  \};/,
  `  const settleOrders = async () => {
    const ordersToSettle = filteredOrders.filter(o => !o.settled);
    if (ordersToSettle.length === 0) return alert('لا يوجد طلبات جديدة للتقفيل.');
    const unsetStatuses = ordersToSettle.filter(o => !o.status);
    if (unsetStatuses.length > 0) return alert(\`يوجد \${unsetStatuses.length} طلبات بدون حالة (موقف). يرجى تحديد حالة كل الطلبات قبل التقفيل.\`);
    
    if (window.confirm(\`هل تريد تقفيل \${ordersToSettle.length} طلب\${selectedCompany !== 'الكل' ? ' لشركة ' + selectedCompany : ''}؟\\n\\nبعد التقفيل لن تتمكن من تعديل هذه الطلبات.\`)) {
      try {
        for (const o of ordersToSettle) {
          await setDoc(doc(db, 'orders', o.id), { ...o, settled: true });
        }
      } catch(err) {
        alert('خطأ أثناء التقفيل: ' + err.message);
      }
    }
  };`
);

// Modals onSave calls
content = content.replace(
  /onSave=\{\(data\) => handleSaveEntity\(setMerchants, setActiveMerchantModal, data\)\}/g,
  `onSave={(data) => handleSaveEntity('merchants', setActiveMerchantModal, data)}`
);
content = content.replace(
  /onSave=\{\(data\) => handleSaveEntity\(setAgents, setActiveAgentModal, data\)\}/g,
  `onSave={(data) => handleSaveEntity('agents', setActiveAgentModal, data)}`
);
content = content.replace(
  /onSave=\{\(data\) => handleSaveEntity\(setExpenses, setActiveExpenseModal, data\)\}/g,
  `onSave={(data) => handleSaveEntity('expenses', setActiveExpenseModal, data)}`
);
content = content.replace(
  /onSave=\{\(data\) => handleSaveEntity\(setEmployees, setActiveEmployeeModal, data\)\}/g,
  `onSave={(data) => handleSaveEntity('employees', setActiveEmployeeModal, data)}`
);

// Also need to handle deleteArrayItem
content = content.replace(
  /  const addArrayItem =[\s\S]*?const deleteArrayItem = \(setter, id, msg\) => \{ if\(window.confirm\(msg\)\) setter\(prev => prev.filter\(item => item\.id !== id\)\); \};\n  const handleArrayChange =[\s\S]*?;/,
  `  const deleteArrayItem = async (collectionName, id, msg) => {
    if (window.confirm(msg)) {
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch(err) {
        alert('خطأ: ' + err.message);
      }
    }
  };`
);

// Delete buttons
content = content.replace(
  /onClick=\{\(\) => deleteArrayItem\(setMerchants, m\.id, 'مسح هذا التاجر؟'\)\}/g,
  "onClick={() => deleteArrayItem('merchants', m.id, 'مسح هذا التاجر؟')}"
);
content = content.replace(
  /onClick=\{\(\) => deleteArrayItem\(setAgents, a\.id, 'مسح هذا المندوب؟'\)\}/g,
  "onClick={() => deleteArrayItem('agents', a.id, 'مسح هذا المندوب؟')}"
);
content = content.replace(
  /onClick=\{\(\) => deleteArrayItem\(setExpenses, exp\.id, 'مسح هذا المصروف؟'\)\}/g,
  "onClick={() => deleteArrayItem('expenses', exp.id, 'مسح هذا المصروف؟')}"
);
content = content.replace(
  /onClick=\{\(\) => deleteArrayItem\(setEmployees, emp\.id, 'مسح الموظف؟'\)\}/g,
  "onClick={() => deleteArrayItem('employees', emp.id, 'مسح الموظف؟')}"
);

// Add Migrate Data button next to title
content = content.replace(
  /<div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">/,
  `<div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
             <button onClick={migrateFromLocal} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow transition-colors">
               🚀 ترحيل البيانات القديمة للسيرفر
             </button>
          </div>`
);

fs.writeFileSync('src/App.jsx', content);
console.log('Firebase integration script applied.');
