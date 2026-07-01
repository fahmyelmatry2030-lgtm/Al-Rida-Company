import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Package, Users, Truck, FileSpreadsheet, Plus, Filter, ChevronDown, WalletCards, Printer, Download, Upload, Trash2, Search, Store, UserCircle, Receipt, CheckCircle, Lock, Calendar, MonitorSmartphone, Eye, Edit3, BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight, X, Archive } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import OrderModal from './OrderModal';
import Dashboard from './Dashboard';
import Waybill from './Waybill';
import TrackingPage from './TrackingPage';
import LoginPage from './LoginPage';
import UsersPage from './UsersPage';
import BarcodeScanner from './BarcodeScanner';
import { setupDefaultAdmin } from './setupUsers';
import { UserCog, ScanLine } from 'lucide-react';
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { MerchantModal, AgentModal, ExpenseModal, EmployeeModal } from './EntityModals';
import SalaryPage from './SalaryPage';

const STATUS_OPTIONS = [
  { label: 'تم التسليم', value: 'تم التسليم', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { label: 'جزئي', value: 'جزئي', color: 'bg-lime-100 text-lime-700 border-lime-300' },
  { label: 'لاغي', value: 'لاغي', color: 'bg-red-100 text-red-800 border-red-300' },
  { label: 'مؤجل', value: 'مؤجل', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { label: 'نزول', value: 'نزول', color: 'bg-sky-100 text-sky-800 border-sky-300' },
  { label: 'بدون شحن', value: 'بدون شحن', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { label: 'رفض شحن', value: 'رفض شحن', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { label: 'غير متاح', value: 'غير متاح', color: 'bg-slate-200 text-slate-700 border-slate-400' },
  { label: 'عدم رد', value: 'عدم رد', color: 'bg-gray-200 text-gray-700 border-gray-400' },
  { label: 'تهرب', value: 'تهرب', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { label: 'اوت زون', value: 'اوت زون', color: 'bg-teal-100 text-teal-800 border-teal-300' },
];

const today = () => new Date().toISOString().split('T')[0];

const INITIAL_ORDERS = [
  { id: '1', date: today(), sender: 'البدرشين الاثنين', code: '1', customerName: 'سارة فايق', center: 'شارع زكي بدوي', phone: '1270655688', count: 2, total: 1537, agent: 'ابو ذكري الثلاثاء', status: 'نزول', collected: 1537, commission: 20, returns: '', notes: '', company: 'مليكة جينز', settled: false },
  { id: '2', date: today(), sender: 'البدرشين الاثنين', code: '2', customerName: 'اسراء احمد', center: 'ليدين شعبان ميا', phone: '1222278011', count: 2, total: 1537, agent: 'سكر الاثنين', status: 'تم التسليم', collected: 1537, commission: 20, returns: '', notes: '', company: 'مليكة جينز', settled: false },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCompany, setSelectedCompany] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showSettled, setShowSettled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeDateTab, setActiveDateTab] = useState(today());
  const fileInputRef = useRef(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [activeMerchantModal, setActiveMerchantModal] = useState({ isOpen: false, data: null });
  const [activeAgentModal, setActiveAgentModal] = useState({ isOpen: false, data: null });
  const [activeExpenseModal, setActiveExpenseModal] = useState({ isOpen: false, data: null });
  const [activeEmployeeModal, setActiveEmployeeModal] = useState({ isOpen: false, data: null });
  const [waybillOrder, setWaybillOrder] = useState(null);
  const [waybillOrders, setWaybillOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState('25');
  const [showTracking, setShowTracking] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('currentUser')); } catch { return null; }
  });
  const [showScanner, setShowScanner] = useState(false);
  const [quickDispatchAgent, setQuickDispatchAgent] = useState('');
  const [quickDispatchCommission, setQuickDispatchCommission] = useState(20);
  const [quickDispatchInput, setQuickDispatchInput] = useState('');
  const [quickDispatchStatus, setQuickDispatchStatus] = useState({ text: '', type: '' });
  const [bulkDispatchFrom, setBulkDispatchFrom] = useState('');
  const [bulkDispatchTo, setBulkDispatchTo] = useState('');
  const [bulkDispatchMerchant, setBulkDispatchMerchant] = useState('');
  const [isQuickDispatchOpen, setIsQuickDispatchOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSaveEntity = async (collectionName, modalSetter, savedItem) => {
    try {
      await setDoc(doc(db, collectionName, savedItem.id), savedItem);
      modalSetter({ isOpen: false, data: null });
    } catch(err) {
      alert('خطأ في الحفظ: ' + err.message);
    }
  };

  // PWA Install Prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setIsInstalled(true); setInstallPrompt(null); });
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') setInstallPrompt(null);
  };
  
  // Core Data States
  const [orders, setOrders] = useState([]);

  const [employees, setEmployees] = useState([]);

  const [merchants, setMerchants] = useState([]);
  const [agents, setAgents] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salaryPayments, setSalaryPayments] = useState([]);

  const dateTabs = useMemo(() => {
    const dates = [];
    // Generate the last 7 consecutive days
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    // Ensure activeDateTab is included if user picked an older date from the calendar
    if (activeDateTab && !dates.includes(activeDateTab)) {
      dates.push(activeDateTab);
    }
    return dates.sort((a, b) => new Date(a) - new Date(b));
  }, [activeDateTab]);

  // Auto-archive oldest day if it's older than the 7-day window
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    
    // Generate the oldest allowed date (6 days ago, so total 7 days including today)
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const cutoffDate = `${yyyy}-${mm}-${dd}`;
    
    const unarchivedOrders = orders.filter(o => !o.archived);
    const ordersToAutoArchive = unarchivedOrders.filter(o => o.date <= cutoffDate);
    
    if (ordersToAutoArchive.length > 0) {
      const autoArchive = async () => {
        try {
          let batch = writeBatch(db);
          let count = 0;
          for (const order of ordersToAutoArchive) {
            batch.update(doc(db, 'orders', order.id), { archived: true });
            count++;
            if (count === 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
          if (count > 0) await batch.commit();
          console.log(`Auto-archived ${ordersToAutoArchive.length} orders older than ${cutoffDate}.`);
        } catch (err) {
          console.error('Error auto-archiving:', err);
        }
      };
      autoArchive();
    }
  }, [orders]);


  // --- Firebase Sync ---
  useEffect(() => {
    const handleSyncError = (err) => {
      console.error("Firebase Sync Error: ", err);
      if (err.code === 'permission-denied') {
        alert("تنبيه هام: تم رفض الوصول لقاعدة البيانات. يرجى التأكد من تغيير قواعد حماية Firestore (Rules) في لوحة تحكم Firebase لتصبح:\n\nallow read, write: if true;\n\nبدون ذلك، لن يتم حفظ أو مزامنة أي بيانات!");
      }
    };

    const unsubOrders = onSnapshot(collection(db, 'orders'), snap => setOrders(snap.docs.map(d => d.data())), handleSyncError);
    const unsubEmployees = onSnapshot(collection(db, 'employees'), snap => setEmployees(snap.docs.map(d => d.data())), handleSyncError);
    const unsubMerchants = onSnapshot(collection(db, 'merchants'), snap => setMerchants(snap.docs.map(d => d.data())), handleSyncError);
    const unsubAgents = onSnapshot(collection(db, 'agents'), snap => setAgents(snap.docs.map(d => d.data())), handleSyncError);
    const unsubExpenses = onSnapshot(collection(db, 'expenses'), snap => setExpenses(snap.docs.map(d => d.data())), handleSyncError);
    const unsubSalaries = onSnapshot(collection(db, 'salary_payments'), snap => setSalaryPayments(snap.docs.map(d => d.data())), handleSyncError);
    setupDefaultAdmin();
    return () => { 
      unsubOrders(); 
      unsubEmployees(); 
      unsubMerchants(); 
      unsubAgents(); 
      unsubExpenses(); 
      unsubSalaries(); 
    };
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
      alert('خطأ في الترحيل: يرجى التأكد من إضافة بيانات Firebase بشكل صحيح في src/firebase.js\n\n' + err.message);
    }
  };

  const calculateNet = (collected, shippingFee) => (Number(collected) || 0) - (Number(shippingFee) || 0);

  // --- Orders Logic ---
  const handleOrderChange = async (id, field, value) => {
    const order = orders.find(o => o.id === id);
    if (!order || (order.settled && field !== 'settled')) return;
    
    let updatedOrder = { ...order, [field]: value };
    if (field === 'status') {
      const zeroCollectedStatuses = ['لاغي', 'غير متاح', 'عدم رد', 'بدون شحن', 'تهرب', 'مؤجل', 'رفض شحن'];
      if (zeroCollectedStatuses.includes(value)) {
        updatedOrder.collected = 0;
        updatedOrder.shippingFee = 0;
      } else if (['تم التسليم', 'اوت زون', 'نزول'].includes(value)) {
        updatedOrder.collected = updatedOrder.total;
        const merchant = merchants.find(m => m.name === updatedOrder.company);
        updatedOrder.shippingFee = merchant ? Number(merchant.rate) || 0 : 0;
      }
    }
    
    try {
      await setDoc(doc(db, 'orders', id), updatedOrder);
    } catch(err) {
      alert('خطأ في التحديث: ' + err.message);
    }
  };

  const openAddModal = () => {
    setEditingOrder({
      id: Math.random().toString(36).substr(2, 9), date: activeDateTab, sender: '', code: '', customerName: '', center: '', phone: '', count: 1, total: 0, agent: '', status: '', collected: 0, commission: 20, returns: '', notes: '', company: '', settled: false, archived: false
    });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (order) => {
    if (order.settled) return;
    setEditingOrder({ ...order });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSaveOrder = async (savedOrder) => {
    try {
      await setDoc(doc(db, 'orders', savedOrder.id), savedOrder);
    } catch(err) {
      alert('خطأ: ' + err.message);
    }
  };

  const deleteRow = async (id) => {
    const order = orders.find(o => o.id === id);
    if (order?.settled) return alert('لا يمكن حذف طلب تم تقفيله.');
    if (window.confirm('هل أنت متأكد من مسح هذا الطلب؟')) {
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch(err) {
        alert('خطأ: ' + err.message);
      }
    }
  };

  const handleArchiveOrders = async (ordersToArchive) => {
    if (!window.confirm(`هل أنت متأكد من ترحيل ${ordersToArchive.length} طلب إلى سجل الشحنات؟`)) return;
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const order of ordersToArchive) {
        batch.update(doc(db, 'orders', order.id), { archived: true });
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    } catch(err) {
      alert('خطأ أثناء الترحيل: ' + err.message);
    }
  };

  // --- Dispatching / Distributing Logic ---
  const handleQuickDispatch = async (e) => {
    if (e) e.preventDefault();
    setQuickDispatchStatus({ text: '', type: '' });
    
    if (!quickDispatchAgent) {
      setQuickDispatchStatus({ text: 'يرجى اختيار المندوب أولاً.', type: 'error' });
      return;
    }
    
    const queryStr = quickDispatchInput.trim();
    if (!queryStr) return;
    
    let matches = orders.filter(o => !o.settled && (
      (o.code && o.code.toLowerCase() === queryStr.toLowerCase()) ||
      (o.phone && o.phone.endsWith(queryStr))
    ));
    
    if (matches.length === 0) {
      setQuickDispatchStatus({ text: `لم يتم العثور على أي شحنة غير مقفلة تطابق الكود أو رقم الهاتف: "${queryStr}"`, type: 'error' });
    } else if (matches.length === 1) {
      const orderToUpdate = matches[0];
      try {
        await setDoc(doc(db, 'orders', orderToUpdate.id), {
          ...orderToUpdate,
          agent: quickDispatchAgent,
          commission: Number(quickDispatchCommission) || 0
        });
        setQuickDispatchStatus({ text: `تم إسناد الشحنة [${orderToUpdate.customerName}] كود (${orderToUpdate.code}) للمندوب (${quickDispatchAgent}) بنجاح ✓`, type: 'success' });
        setQuickDispatchInput(''); // Clear input for next scan/type
      } catch (err) {
        setQuickDispatchStatus({ text: 'خطأ في التحديث: ' + err.message, type: 'error' });
      }
    } else {
      setQuickDispatchStatus({ 
        text: `تم العثور على أكثر من شحنة تطابق "${queryStr}". يرجى التوزيع يدوياً من الجدول أو تحديد أكواد دقيقة.`, 
        type: 'warning' 
      });
    }
  };

  const handleBulkDispatch = async (type, payload) => {
    setQuickDispatchStatus({ text: '', type: '' });
    if (!quickDispatchAgent) {
      setQuickDispatchStatus({ text: 'يرجى اختيار المندوب أولاً.', type: 'error' });
      return;
    }

    let targets = [];
    if (type === 'merchant') {
      const merchantName = payload.merchant;
      if (!merchantName) return;
      targets = orders.filter(o => !o.settled && o.company === merchantName);
    } else if (type === 'range') {
      const fromNum = Number(payload.from);
      const toNum = Number(payload.to);
      if (isNaN(fromNum) || isNaN(toNum)) {
        return setQuickDispatchStatus({ text: 'يرجى إدخال أرقام صحيحة لنطاق الأكواد.', type: 'error' });
      }
      targets = orders.filter(o => {
        if (o.settled) return false;
        const codeNum = Number(o.code);
        return !isNaN(codeNum) && codeNum >= fromNum && codeNum <= toNum;
      });
    }

    if (targets.length === 0) {
      setQuickDispatchStatus({ text: 'لم يتم العثور على أي شحنات غير مقفلة تطابق الفلتر المحدد.', type: 'warning' });
      return;
    }

    if (window.confirm(`هل أنت متأكد من إسناد عدد ${targets.length} شحنة للمندوب "${quickDispatchAgent}" بعمولة ${quickDispatchCommission} ج.م؟`)) {
      try {
        let count = 0;
        for (const o of targets) {
          await setDoc(doc(db, 'orders', o.id), {
            ...o,
            agent: quickDispatchAgent,
            commission: Number(quickDispatchCommission) || 0
          });
          count++;
        }
        setQuickDispatchStatus({ text: `تم إسناد عدد ${count} شحنة بنجاح للمندوب ${quickDispatchAgent} ✓`, type: 'success' });
        // Clear bulk fields
        setBulkDispatchFrom('');
        setBulkDispatchTo('');
        setBulkDispatchMerchant('');
      } catch (err) {
        setQuickDispatchStatus({ text: 'خطأ أثناء التوزيع الجماعي: ' + err.message, type: 'error' });
      }
    }
  };

  // --- Settlement Logic ---
  const settleOrders = async () => {
    const ordersToSettle = filteredOrders.filter(o => !o.settled);
    if (ordersToSettle.length === 0) return alert('لا يوجد طلبات جديدة للتقفيل.');
    const unsetStatuses = ordersToSettle.filter(o => !o.status);
    if (unsetStatuses.length > 0) return alert(`يوجد ${unsetStatuses.length} طلبات بدون حالة (موقف). يرجى تحديد حالة كل الطلبات قبل التقفيل.`);
    
    if (window.confirm(`هل تريد تقفيل ${ordersToSettle.length} طلب${selectedCompany !== 'الكل' ? ' لشركة ' + selectedCompany : ''}؟\n\nبعد التقفيل لن تتمكن من تعديل هذه الطلبات.`)) {
      try {
        for (const o of ordersToSettle) {
          await setDoc(doc(db, 'orders', o.id), { ...o, settled: true });
        }
        alert('تم تقفيل وحفظ الطلبات بنجاح!');
      } catch (err) {
        alert('خطأ أثناء التقفيل: ' + err.message);
      }
    }
  };

  // Search & Filter
  const companiesDropdown = ['الكل', ...new Set([...merchants.map(m => m.name), ...orders.map(o => o.company)].filter(Boolean))];

  const filteredOrders = useMemo(() => {
    let result = orders;
    // Agent sees only their own orders
    if (currentUser?.role === 'agent') {
      result = result.filter(o => o.agent === currentUser.name);
    }
    if (activeTab === 'company-summary' && selectedCompany !== 'الكل') {
      result = result.filter(o => o.company === selectedCompany);
    }
    if (activeTab === 'company-summary') {
      if (filterDateFrom) result = result.filter(o => o.date >= filterDateFrom);
      if (filterDateTo) result = result.filter(o => o.date <= filterDateTo);
    }
    if (activeTab === 'company-summary' && !showSettled) {
      result = result.filter(o => !o.settled);
    }
    if (activeTab === 'data-entry') {
      result = result.filter(o => !o.settled && o.date === activeDateTab);
    }
    if (activeTab === 'archive') {
      result = result.filter(o => !o.settled && o.date !== activeDateTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => 
        (o.code && o.code.toLowerCase().includes(q)) ||
        (o.phone && o.phone.includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.company && o.company.toLowerCase().includes(q))
      );
    }
    
    // Sort alphanumerically by code (natural sorting)
    return [...result].sort((a, b) => {
      const codeA = String(a.code || '');
      const codeB = String(b.code || '');
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [orders, activeTab, selectedCompany, searchQuery, filterDateFrom, filterDateTo, showSettled, currentUser]);

  const handleTableKeyDown = (e) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) return;
    
    const target = e.target;
    if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') return;

    const table = target.closest('table');
    if (!table) return;
    
    const inputs = Array.from(table.querySelectorAll('input:not([type="checkbox"]), select:not([disabled])'));
    const index = inputs.indexOf(target);
    if (index === -1) return;

    const row = target.closest('tr');
    const inputsInRow = Array.from(row.querySelectorAll('input:not([type="checkbox"]), select:not([disabled])'));
    const cols = inputsInRow.length;

    let nextIndex = index;

    if (e.key === 'ArrowRight') {
      nextIndex = index - 1; // RTL: right is previous
    } else if (e.key === 'ArrowLeft') {
      nextIndex = index + 1; // RTL: left is next
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      nextIndex = index + cols;
    } else if (e.key === 'ArrowUp') {
      nextIndex = index - cols;
    }

    if (nextIndex >= 0 && nextIndex < inputs.length) {
      e.preventDefault();
      inputs[nextIndex].focus();
      if (inputs[nextIndex].tagName === 'INPUT') {
        setTimeout(() => inputs[nextIndex].select(), 10);
      }
    }
  };

  const handleTablePaste = async (e) => {
    // Only intercept if we are pasting into the table container, but not inside a text input (so we don't mess up normal pasting)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('Text');
    if (!pastedData) return;

    const rows = pastedData.trim().split('\n').map(row => row.split('\t'));
    if (rows.length === 0 || rows[0].length < 2) return; // Basic validation: at least some columns

    e.preventDefault();
    if (!window.confirm(`هل تريد لصق وإضافة ${rows.length} شحنة جديدة؟`)) return;

    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const row of rows) {
        // Simple mapping based on expected Excel columns: (Adjust index as needed based on what they copy)
        // Usually: Date, Sender, Code, Name, Center, Phone, Count, Total, Agent, Status...
        // We will try a basic mapping: 0: Date, 1: Sender, 2: Code, 3: Name, 4: Center, 5: Phone, 6: Count, 7: Total
        // This is a generic approach.
        
        const newId = Math.random().toString(36).substr(2, 9);
        const orderDoc = {
          id: newId,
          date: row[0] || today(),
          sender: row[1] || '',
          code: row[2] || '',
          customerName: row[3] || '',
          center: row[4] || '',
          phone: row[5] || '',
          count: Number(row[6]) || 1,
          total: Number(row[7]) || 0,
          agent: row[8] || '',
          status: row[9] || '',
          collected: Number(row[10]) || 0,
          shippingFee: Number(row[11]) || 0,
          commission: Number(row[12]) || 20,
          returns: row[13] || '',
          notes: row[14] || '',
          company: row[1] || '', // Guessing company is sender
          settled: false,
          archived: false
        };
        batch.set(doc(db, 'orders', newId), orderDoc);
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      alert(`تم إضافة ${rows.length} شحنة بنجاح!`);
    } catch(err) {
      alert('خطأ في اللصق: ' + err.message);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setSelectedOrderIds([]);
  }, [activeTab, selectedCompany, searchQuery, filterDateFrom, filterDateTo, showSettled]);

  const totalPages = useMemo(() => {
    if (pageSize === 'الكل') return 1;
    return Math.ceil(filteredOrders.length / Number(pageSize));
  }, [filteredOrders, pageSize]);

  const paginatedOrders = useMemo(() => {
    if (pageSize === 'الكل') return filteredOrders;
    const start = (currentPage - 1) * Number(pageSize);
    return filteredOrders.slice(start, start + Number(pageSize));
  }, [filteredOrders, currentPage, pageSize]);

  const isAllSelected = useMemo(() => {
    if (paginatedOrders.length === 0) return false;
    return paginatedOrders.every(o => selectedOrderIds.includes(o.id));
  }, [paginatedOrders, selectedOrderIds]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      const paginatedIds = paginatedOrders.map(o => o.id);
      setSelectedOrderIds(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      const paginatedIds = paginatedOrders.map(o => o.id);
      setSelectedOrderIds(prev => [...new Set([...prev, ...paginatedIds])]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const summaryStats = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      acc.totalOrders++;
      acc.totalCollected += Number(order.collected) || 0;
      acc.totalCommission += Number(order.commission) || 0;
      
      const sFee = order.shippingFee !== undefined 
        ? Number(order.shippingFee) 
        : (order.commission !== undefined ? Number(order.commission) : (Number(merchants.find(m => m.name === order.company)?.rate) || 0));
      acc.totalNet += calculateNet(order.collected, sFee);
      
      if (order.status === 'تم التسليم') acc.delivered++;
      else if (['لاغي', 'رفض شحن'].includes(order.status)) acc.cancelled++;
      else if (['مؤجل', 'غير متاح', 'عدم رد', 'تهرب'].includes(order.status)) acc.pending++;
      return acc;
    }, { totalOrders: 0, totalCollected: 0, totalCommission: 0, totalNet: 0, delivered: 0, cancelled: 0, pending: 0 });
  }, [filteredOrders, merchants]);

  const hasUnsettledInView = filteredOrders.some(o => !o.settled);

  // Company Overall Profit
  const companyProfits = useMemo(() => {
    const totalCompanyNet = orders.reduce((sum, o) => {
      const isDelivered = ['تم التسليم', 'اوت زون', 'نزول', 'جزئي'].includes(o.status);
      if (!isDelivered) return sum;
      
      const sFee = o.shippingFee !== undefined 
        ? Number(o.shippingFee) 
        : (o.commission !== undefined ? Number(o.commission) : (Number(merchants.find(m => m.name === o.company)?.rate) || 0));
        
      const comm = o.shippingFee !== undefined 
        ? (Number(o.commission) || 0) 
        : 20;
        
      return sum + (sFee - comm);
    }, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) + salaryPayments.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
    return { totalCompanyNet, totalExpenses, netProfit: totalCompanyNet - totalExpenses };
  }, [orders, expenses, salaryPayments, merchants]);

  // CRUD helpers
  const deleteArrayItem = async (collectionName, id, msg) => {
    if (window.confirm(msg)) {
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch(err) {
        alert('خطأ: ' + err.message);
      }
    }
  };

  // Salaries
  const employeesList = useMemo(() => {
    return employees.map(emp => {
      const empOrders = orders.filter(o => o.agent === emp.name && emp.name.trim() !== '');
      const totalCommissions = empOrders.reduce((sum, order) => sum + (Number(order.commission) || 0), 0);
      const netSalary = (Number(emp.baseSalary) || 0) + totalCommissions - (Number(emp.deductions) || 0) - (Number(emp.advances) || 0);
      return { ...emp, ordersCount: empOrders.length, totalCommissions, netSalary };
    });
  }, [orders, employees]);

  // Export
  const exportOrdersToExcel = () => {
    const dataToExport = filteredOrders.map((order, i) => {
      const sFee = order.shippingFee !== undefined ? Number(order.shippingFee) : (Number(merchants.find(m => m.name === order.company)?.rate) || 0);
      const isCompanySummary = activeTab === 'company-summary';
      return {
        'م': i + 1, 'التاريخ': order.date, 'الراسل': order.sender, 'الكود': order.code, 'الاسم': order.customerName, 'المنطقه': order.center,
        'الرقم': order.phone, 'العدد': order.count, 'السعر': order.total, 'المندوب': order.agent, 'الموقف': order.status,
        'المحصل': order.collected, 
        [isCompanySummary ? 'سعر الشحن' : 'العمولة']: isCompanySummary ? sFee : (order.commission || 0), 
        'الصافي': calculateNet(order.collected, sFee),
        'المرتجعات': order.returns, 'ملاحظات': order.notes, 'الشركات': order.company, 'الحالة': order.settled ? 'تم التقفيل' : 'مفتوح',
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    if (activeTab === 'company-summary' && selectedCompany !== 'الكل') {
      const totalShippingFee = filteredOrders.reduce((sum, o) => sum + (o.shippingFee !== undefined ? Number(o.shippingFee) : (Number(merchants.find(m => m.name === o.company)?.rate) || 0)), 0);
      XLSX.utils.sheet_add_json(ws, [{}, { 'الإجمالي': 'الإجماليات:', 'المحصل': summaryStats.totalCollected, 'سعر الشحن': totalShippingFee, 'الصافي': summaryStats.totalNet }], { skipHeader: true, origin: -1 });
    }
    ws['!dir'] = 'rtl';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلبات");
    saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), activeTab === 'company-summary' ? `كشف_حساب_${selectedCompany}_${filterDateFrom}.xlsx` : `الطلبات.xlsx`);
  };

  const importOrdersFromExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          alert('الملف فارغ أو يحتوي على بيانات غير صالحة.');
          return;
        }

        // Helper to find value from row by checking a list of column aliases
        const findValue = (row, aliases) => {
          const rowKeys = Object.keys(row);
          // First pass: look for exact clean matches (ignoring all spaces/special chars)
          for (const alias of aliases) {
            const cleanAlias = alias.replace(/[\s\u00A0\u200B_\-\.]/g, '').toLowerCase();
            for (const rk of rowKeys) {
              const cleanRk = rk.trim().replace(/[\s\u00A0\u200B_\-\.]/g, '').toLowerCase();
              if (cleanRk === cleanAlias) {
                return row[rk];
              }
            }
          }
          // Second pass: look for partial matches (excluding short ambiguous keys)
          for (const alias of aliases) {
            if (alias.length < 3) continue; 
            const cleanAlias = alias.replace(/[\s\u00A0\u200B_\-\.]/g, '').toLowerCase();
            for (const rk of rowKeys) {
              const cleanRk = rk.trim().replace(/[\s\u00A0\u200B_\-\.]/g, '').toLowerCase();
              if (cleanRk.includes(cleanAlias)) {
                return row[rk];
              }
            }
          }
          return '';
        };

        const importedOrders = data.map(row => {
          const company = findValue(row, ['الشركات', 'الشركة', 'الشركه', 'company', 'merchant'])?.toString().trim() || '';
          const sender = findValue(row, ['الراسل', 'اسم الراسل', 'sender'])?.toString().trim() || '';
          const code = findValue(row, ['ك', 'الكود', 'رقم الشحنة', 'رقم الشحنه', 'رقم الأوردر', 'code', 'id'])?.toString().trim() || '';
          const customerName = findValue(row, ['الاسم', 'اسم العميل', 'اسم المستلم', 'المستلم', 'customer', 'name'])?.toString().trim() || '';
          const center = findValue(row, ['العنوان', 'المنطقه', 'المنطقة', 'المركز', 'address', 'center', 'region'])?.toString().trim() || '';
          const phone = findValue(row, ['الرقم', 'الهاتف', 'التليفون', 'رقم الهاتف', 'phone', 'mobile'])?.toString().trim() || '';
          const count = Number(findValue(row, ['العدد', 'count'])) || 1;
          const total = Number(findValue(row, ['الاجمالى', 'الاجمالي', 'السعر', 'الإجمالي', 'total', 'price'])) || 0;
          const agent = findValue(row, ['المناديب', 'المندوب', 'اسم المندوب', 'agent'])?.toString().trim() || '';
          const status = findValue(row, ['الموقف', 'الحالة', 'الحاله', 'status'])?.toString().trim() || '';
          const collected = Number(findValue(row, ['المحصل', 'collected'])) || 0;
          const commission = Number(findValue(row, ['العموله', 'العمولة', 'commission'])) || 20;
          const notes = findValue(row, ['ملاحظات', 'الملاحظات', 'البيان', 'notes'])?.toString().trim() || '';
          const returns = findValue(row, ['المرتجع', 'المرتجهات', 'returns'])?.toString().trim() || '';

          const merchantObj = merchants.find(m => m.name === (company || sender));
          const defaultRate = merchantObj ? Number(merchantObj.rate) || 0 : 0;
          const shippingFeeInput = findValue(row, ['سعر الشحن', 'الشحن', 'شحن', 'shippingFee', 'shipping_fee']);
          const shippingFee = shippingFeeInput !== '' ? (Number(shippingFeeInput) || 0) : defaultRate;

          return {
            id: Math.random().toString(36).substr(2, 9),
            date: today(),
            sender: sender || company,
            code,
            customerName,
            center,
            phone,
            count,
            total,
            agent,
            status,
            collected: status === 'تم التسليم' || status === 'جزئي' ? (collected || total) : collected,
            commission,
            shippingFee,
            returns,
            notes,
            company: company || sender,
            settled: false
          };
        });

        if (importedOrders.length > 0) {
          // Save all to Firestore
          for (const order of importedOrders) {
            await setDoc(doc(db, 'orders', order.id), order);
          }
          alert(`تم استيراد ${importedOrders.length} طلب بنجاح وحفظهم في قاعدة البيانات.`);
        }
      } catch (err) {
        alert('حدث خطأ أثناء استيراد الملف. تأكد أنه ملف إكسيل صحيح.');
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  // Status Badge
  const StatusBadge = ({ status }) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    if (!status) return <span className="text-xs text-slate-400 italic">بدون حالة</span>;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${opt?.color || 'bg-slate-100 text-slate-600 border-slate-200'} transition-all`}>
        {status === 'تم التسليم' && '✓ '}{status}
      </span>
    );
  };

  const NavButton = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => setActiveTab(id)} 
      className={`flex items-center rounded-xl transition-all duration-200 ${
        isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
      } ${
        activeTab === id ? 'bg-white/15 text-white shadow-lg shadow-white/5 backdrop-blur-sm border border-white/10' : 'text-white/60 hover:text-white/90 hover:bg-white/5'
      }`}
      title={label}
    >
      <Icon className="w-5 h-5" /> 
      {!isSidebarCollapsed && <span className="font-medium">{label}</span>}
    </button>
  );

  // Dashboard stats cards for data-entry
  const quickStats = useMemo(() => {
    const todayOrders = orders.filter(o => o.date === today() && !o.settled);
    const todayDelivered = todayOrders.filter(o => o.status === 'تم التسليم').length;
    const todayPending = todayOrders.filter(o => !o.status || ['مؤجل', 'نزول', 'غير متاح', 'عدم رد'].includes(o.status)).length;
    const todayTotal = todayOrders.reduce((s, o) => s + (Number(o.collected) || 0), 0);
    return { total: todayOrders.length, delivered: todayDelivered, pending: todayPending, collected: todayTotal };
  }, [orders]);

  const handleLogin = (user) => {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
    if (user.role === 'agent') setActiveTab('data-entry');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    setCurrentUser(null);
  };

  const handleScannerStatusUpdate = async (orderId, status) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    try {
      await setDoc(doc(db, 'orders', orderId), { ...order, status });
    } catch(err) { alert('خطأ: ' + err.message); }
  };

  // Role-based tab access
  const isAdmin = currentUser?.role === 'admin';
  const isSecretary = currentUser?.role === 'secretary';
  const isAgent = currentUser?.role === 'agent';

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (showTracking) {
    return <TrackingPage onBack={() => setShowTracking(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 flex font-sans" dir="rtl">

      {/* Sidebar */}
      <aside className={`bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col shadow-2xl z-20 sticky top-0 h-screen print:hidden overflow-y-auto custom-scrollbar shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}`}>
        <div className={`p-4 flex items-center justify-between border-b border-white/10 shrink-0 ${isSidebarCollapsed ? 'flex-col gap-3' : 'flex-row'}`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">شركة الرضا</h1>
                <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">Shipping Management</span>
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors mx-auto"
            title={isSidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            {isSidebarCollapsed ? <ChevronDown className="-rotate-90 w-5 h-5" /> : <ChevronDown className="rotate-90 w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {!isAgent && <NavButton id="dashboard" icon={TrendingUp} label="لوحة التحكم" />}
          <NavButton id="data-entry" icon={FileSpreadsheet} label={isAgent ? 'طلباتي' : 'الطلبات والإدخال'} />
          {!isAgent && <NavButton id="archive" icon={Archive} label="سجل الشحنات" />}
          {!isAgent && <NavButton id="company-summary" icon={BarChart3} label="تقفيل الشركات" />}
          {!isAgent && <div className="my-2 border-t border-white/5"></div>}
          {!isAgent && <NavButton id="merchants" icon={Store} label="التجار" />}
          {!isAgent && <NavButton id="agents" icon={UserCircle} label="المناديب" />}
          {(isAdmin) && <div className="my-2 border-t border-white/5"></div>}
          {isAdmin && <NavButton id="salaries" icon={WalletCards} label="المرتبات" />}
          {isAdmin && <NavButton id="expenses" icon={Receipt} label="الخزينة" />}
          <div className="my-2 border-t border-white/5"></div>
          {isAdmin && <NavButton id="users" icon={UserCog} label="المستخدمون" />}
          <div className="my-2 border-t border-white/5"></div>
          <button 
            onClick={() => setShowScanner(true)} 
            className={`flex items-center rounded-xl transition-all duration-200 text-white/60 hover:text-white/90 hover:bg-white/5 ${
              isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
            }`}
            title="ماسح الباركود"
          >
            <ScanLine className="w-5 h-5" /> 
            {!isSidebarCollapsed && <span className="font-medium">ماسح الباركود</span>}
          </button>
          <button 
            onClick={() => setShowTracking(true)} 
            className={`flex items-center rounded-xl transition-all duration-200 text-white/60 hover:text-white/90 hover:bg-white/5 ${
              isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
            }`}
            title="تتبع الشحنات"
          >
            <Eye className="w-5 h-5" /> 
            {!isSidebarCollapsed && <span className="font-medium">تتبع الشحنات</span>}
          </button>
        </nav>
        <div className="p-4 border-t border-white/5 shrink-0 flex flex-col gap-3">
          {!isInstalled && installPrompt && (
            <button onClick={handleInstall} className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20 text-sm w-full">
              <MonitorSmartphone className="w-4 h-4" /> 
              {!isSidebarCollapsed && 'تثبيت التطبيق'}
            </button>
          )}
          {isInstalled && (
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-medium" title="تم تثبيت التطبيق">
              <CheckCircle className="w-3 h-3" /> 
              {!isSidebarCollapsed && 'تم تثبيت التطبيق'}
            </div>
          )}
          {!isSidebarCollapsed ? (
            <div className="bg-white/5 rounded-xl p-3 mb-1">
              <p className="text-white/80 font-bold text-sm truncate">{currentUser?.name}</p>
              <p className="text-white/40 text-xs mt-0.5">{currentUser?.role === 'admin' ? '👑 مدير' : currentUser?.role === 'secretary' ? '📋 سكرتير' : '🚚 مندوب'}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center p-2 mb-1 text-white/60 text-lg" title={`${currentUser?.name} (${currentUser?.role === 'admin' ? 'مدير' : currentUser?.role === 'secretary' ? 'سكرتير' : 'مندوب'})`}>
              👤
            </div>
          )}
          <button 
            onClick={handleLogout} 
            className={`w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-bold py-2 rounded-xl transition-colors ${
              isSidebarCollapsed ? 'p-2' : ''
            }`}
            title="خروج من الحساب"
          >
            <X className="w-4 h-4" /> 
            {!isSidebarCollapsed && 'خروج من الحساب'}
          </button>
        </div>
        <p className="text-center text-[10px] text-white/20 mt-1">البيانات محفوظة على السيرفر ☁️</p>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-3 px-4 flex flex-col gap-4 max-h-screen overflow-y-auto w-full print:p-0 print:h-auto print:overflow-visible custom-scrollbar">
        
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              {activeTab === 'dashboard' && 'لوحة التحكم'}
              {activeTab === 'data-entry' && 'الطلبات والإدخال'}
              {activeTab === 'archive' && 'سجل الشحنات'}
              {activeTab === 'company-summary' && 'تقفيل الشركات'}
              {activeTab === 'merchants' && 'التجار والشركات'}
              {activeTab === 'agents' && 'المناديب'}
              {activeTab === 'salaries' && 'إدارة المرتبات'}
              {activeTab === 'expenses' && 'الخزينة والمصروفات'}
              {activeTab === 'users' && 'إدارة المستخدمين'}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(activeTab === 'data-entry' || activeTab === 'archive' || activeTab === 'company-summary') && (
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input type="text" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="pl-4 pr-9 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-48 text-sm shadow-sm" />
              </div>
            )}


            {(activeTab === 'data-entry' || activeTab === 'archive') && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsQuickDispatchOpen(true)} 
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95"
                >
                  🚚 توزيع سريع للمناديب
                </button>
                <button 
                  onClick={openAddModal} 
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" /> إضافة طلب
                </button>
              </div>
            )}
            {activeTab === 'merchants' && (
              <button onClick={() => setActiveMerchantModal({ isOpen: true, data: null })} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95">
                <Plus className="w-4 h-4" /> إضافة تاجر
              </button>
            )}
            {activeTab === 'agents' && (
              <button onClick={() => setActiveAgentModal({ isOpen: true, data: null })} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95">
                <Plus className="w-4 h-4" /> إضافة مندوب
              </button>
            )}
            {activeTab === 'expenses' && (
              <button onClick={() => setActiveExpenseModal({ isOpen: true, data: null })} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95">
                <Plus className="w-4 h-4" /> إضافة مصروف
              </button>
            )}
            {activeTab === 'salaries' && (
              <button onClick={() => setActiveEmployeeModal({ isOpen: true, data: null })} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95">
                <Plus className="w-4 h-4" /> إضافة موظف
              </button>
            )}

            {activeTab === 'company-summary' && (
              <>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="bg-transparent outline-none text-sm font-medium text-slate-700">
                    {companiesDropdown.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="bg-transparent outline-none text-xs" />
                  <span className="text-slate-300">—</span>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="bg-transparent outline-none text-xs" />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                  <input type="checkbox" checked={showSettled} onChange={e => setShowSettled(e.target.checked)} className="rounded border-slate-300 w-3.5 h-3.5" />
                  المقفّل
                </label>
              </>
            )}

            {(activeTab === 'company-summary' || activeTab === 'data-entry' || activeTab === 'archive') && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-xl text-xs font-medium shadow-sm transition-colors">
                  <Upload className="w-3.5 h-3.5" /> استيراد
                </button>
                <input type="file" ref={fileInputRef} onChange={importOrdersFromExcel} accept=".xlsx, .xls" className="hidden" />
                <button onClick={exportOrdersToExcel} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-xl text-xs font-medium shadow-sm transition-colors">
                  <Download className="w-3.5 h-3.5" /> تصدير
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-xl text-xs font-medium shadow-sm transition-colors">
                  <Printer className="w-3.5 h-3.5" /> طباعة
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-6">
           <h1 className="text-3xl font-bold mb-2">
             {activeTab === 'company-summary' ? (selectedCompany === 'الكل' ? `كشف حساب الشحنات` : `كشف حساب شركة: ${selectedCompany}`) : ''}
             {activeTab === 'data-entry' ? 'طلبات اليوم' : activeTab === 'archive' ? 'سجل الشحنات الشامل' : ''}
           </h1>
           <p className="text-gray-500">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>

        {/* ============ DASHBOARD ============ */}
        {activeTab === 'dashboard' && (
          <Dashboard orders={orders} merchants={merchants} agents={agents} expenses={expenses} companyProfits={companyProfits} />
        )}

        {/* ============ DATA ENTRY ============ */}
        {(activeTab === 'data-entry' || activeTab === 'archive') && (
          <>
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
              <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">طلبات اليوم</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><Package className="w-4 h-4 text-indigo-500" /></div>
                </div>
                <p className="text-3xl font-black text-slate-800">{quickStats.total}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">تم التسليم</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
                </div>
                <p className="text-3xl font-black text-emerald-600">{quickStats.delivered}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">قيد الانتظار</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-amber-500" /></div>
                </div>
                <p className="text-3xl font-black text-amber-600">{quickStats.pending}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">المحصل اليوم</span>
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center"><WalletCards className="w-4 h-4 text-violet-500" /></div>
                </div>
                <p className="text-2xl font-black text-violet-600">{quickStats.collected.toLocaleString()} <span className="text-sm font-medium text-violet-400">ج.م</span></p>
              </div>
            </div>



            {/* Orders Table — View Only */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1 flex flex-col">
              <div className="overflow-x-auto flex-1 custom-scrollbar" onKeyDown={handleTableKeyDown} onPaste={handleTablePaste} tabIndex="0">
                <table className="w-full text-sm text-right print:text-xs">
                  <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-550 font-bold sticky top-0 z-10">
                    <tr className="border-b border-slate-200">
                      <th className="px-1 py-2 text-center w-6">#</th>
                      <th className="px-1 py-2 text-center w-6 print:hidden">
                        <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="rounded border-slate-300 w-3 h-3 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      </th>
                      <th className="px-1 py-2 text-center min-w-[70px] max-w-[80px]">المراجعه</th>
                      <th className="px-1.5 py-2 min-w-[100px] max-w-[120px] text-right">الراسل</th>
                      <th className="px-1 py-2 text-center min-w-[50px] max-w-[60px]">ك</th>
                      <th className="px-1.5 py-2 min-w-[100px] max-w-[120px] text-right">الاسم</th>
                      <th className="px-1.5 py-2 min-w-[160px] max-w-[200px] text-right">العنوان</th>
                      <th className="px-1 py-2 text-center min-w-[95px] max-w-[110px]">الرقم</th>
                      <th className="px-1 py-2 text-center min-w-[45px] max-w-[55px]">العدد</th>
                      <th className="px-1 py-2 text-center min-w-[75px] max-w-[90px]">الاجمالى</th>
                      <th className="px-1.5 py-2 min-w-[110px] max-w-[130px] text-right">المناديب</th>
                      <th className="px-1 py-2 text-center min-w-[95px] max-w-[110px]">الموقف</th>
                      <th className="px-1 py-2 text-center min-w-[75px] max-w-[90px]">المحصل</th>
                      <th className="px-1 py-2 text-center min-w-[110px] max-w-[130px]">شحن / عمولة</th>
                      <th className="px-1 py-2 text-center min-w-[70px] max-w-[85px] font-bold text-indigo-600">الصافى</th>
                      <th className="px-1 py-2 text-center min-w-[80px] max-w-[95px]">المرتجع</th>
                      <th className="px-1.5 py-2 min-w-[120px] max-w-[150px] text-right">ملاحظات</th>
                      <th className="px-1.5 py-2 min-w-[90px] max-w-[110px] text-right">الشركات</th>
                      <th className="px-1 py-2 text-center w-14 print:hidden">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.length === 0 ? (
                      <tr><td colSpan="19" className="text-center py-20">
                        <div className="flex flex-col items-center gap-3">
                          <Package className="w-12 h-12 text-slate-200" />
                          <p className="text-slate-400 font-medium">لا توجد طلبات حالياً</p>
                          <button onClick={openAddModal} className="text-indigo-600 text-sm font-bold hover:underline">+ إضافة أول طلب</button>
                        </div>
                      </td></tr>
                    ) : paginatedOrders.map((order, index) => {
                      const isCanceled = ['لاغي', 'رفض شحن'].includes(order.status);
                      const isSelected = selectedOrderIds.includes(order.id);
                      return (
                        <tr key={order.id} onClick={() => !isAgent && openEditModal(order)} className={`border-b border-slate-100/80 ${isAgent ? '' : 'cursor-pointer'} transition-all duration-150 ${isCanceled ? 'opacity-50' : ''} ${isSelected ? 'bg-indigo-50/50' : order.settled ? 'bg-emerald-50/30' : 'hover:bg-indigo-50/40'}`}>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs text-slate-400 font-mono">{(currentPage - 1) * (pageSize === 'الكل' ? filteredOrders.length : Number(pageSize)) + index + 1}</span>
                            {order.settled && <Lock className="w-3 h-3 text-emerald-400 inline-block mr-1" />}
                          </td>
                          <td className="px-3 py-3 text-center print:hidden" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(order.id)} className="rounded border-slate-300 w-3.5 h-3.5 text-indigo-655 cursor-pointer" />
                          </td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <input 
                              key={order.id + '-review-' + (order.review || '')}
                              type="text" 
                              defaultValue={order.review || ''} 
                              disabled={isAgent}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val !== (order.review || '')) handleOrderChange(order.id, 'review', val);
                              }}
                              className="border border-slate-250 rounded px-2 py-1 text-sm font-semibold text-slate-800 w-14 text-center outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-3 py-2 text-slate-800 font-semibold whitespace-normal break-words max-w-[150px] text-[14px]">{order.sender || '—'}</td>
                          <td className="px-3 py-2 text-center text-slate-600 font-bold font-mono text-[14px]">{order.code || '—'}</td>
                          <td className="px-3 py-2 text-slate-900 font-extrabold whitespace-normal break-words max-w-[160px] text-[15px]">{order.customerName || '—'}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-normal break-words min-w-[150px] max-w-[180px] text-[14px]">{order.center || '—'}</td>
                          <td className="px-3 py-2 text-center font-mono font-semibold text-slate-600 text-[14px]" dir="ltr">{order.phone || '—'}</td>
                          <td className="px-3 py-2 text-center text-slate-700 font-extrabold text-[14px]">{order.count || 1}</td>
                          <td className="px-3 py-2 text-center font-black text-slate-850 text-[15px]">{Number(order.total || 0).toLocaleString()}</td>
                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            <input 
                              type="text"
                              value={order.agent || ''} 
                              onChange={(e) => handleOrderChange(order.id, 'agent', e.target.value)} 
                              disabled={isAgent}
                              placeholder="المندوب"
                              className="border border-slate-250 rounded px-2 py-1 text-sm font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 bg-white w-28 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <select 
                              value={order.status || ''} 
                              onChange={(e) => handleOrderChange(order.id, 'status', e.target.value)} 
                              className={`border rounded px-2 py-1 text-sm font-extrabold outline-none focus:ring-1 focus:ring-indigo-500 w-24 text-center ${
                                STATUS_OPTIONS.find(opt => opt.value === order.status)?.color || 'bg-slate-50 text-slate-700 border-slate-205'
                              }`}
                            >
                              <option value="">اختر الحالة...</option>
                              {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <input 
                              key={order.id + '-collected-' + (order.collected || 0)}
                              type="number" 
                              defaultValue={order.collected || 0} 
                              onBlur={(e) => {
                                const val = Number(e.target.value) || 0;
                                if (val !== order.collected) handleOrderChange(order.id, 'collected', val);
                              }}
                              className="border border-slate-250 rounded px-2 py-1 text-sm font-extrabold text-slate-800 w-16 text-center outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1 justify-center">
                              {/* Shipping Fee */}
                              <input 
                                key={order.id + '-shippingFee-' + (order.shippingFee !== undefined ? order.shippingFee : '')}
                                type="number" 
                                defaultValue={order.shippingFee !== undefined ? order.shippingFee : (order.commission !== undefined ? order.commission : (merchants.find(m => m.name === order.company)?.rate || 0))} 
                                disabled={isAgent}
                                onBlur={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  if (val !== order.shippingFee) handleOrderChange(order.id, 'shippingFee', val);
                                }}
                                className="border border-slate-250 rounded px-1 py-1 text-xs font-bold text-indigo-650 w-12 text-center outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                title="سعر الشحن للتاجر"
                                placeholder="شحن"
                              />
                              {/* Agent Commission */}
                              <input 
                                key={order.id + '-commission-' + (order.commission || 0)}
                                type="number" 
                                defaultValue={order.shippingFee !== undefined ? order.commission : 20} 
                                disabled={isAgent}
                                onBlur={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  if (val !== order.commission) handleOrderChange(order.id, 'commission', val);
                                }}
                                className="border border-slate-250 rounded px-1 py-1 text-xs font-semibold text-slate-700 w-10 text-center outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                title="عمولة المندوب"
                                placeholder="عمولة"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center font-black text-indigo-755 text-[15px]">
                            {(() => {
                              const sFee = order.shippingFee !== undefined ? Number(order.shippingFee) : (order.commission !== undefined ? Number(order.commission) : (Number(merchants.find(m => m.name === order.company)?.rate) || 0));
                              return calculateNet(order.collected, sFee).toLocaleString();
                            })()}
                          </td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <input 
                              key={order.id + '-returns-' + (order.returns || '')}
                              type="text" 
                              defaultValue={order.returns || ''} 
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val !== (order.returns || '')) handleOrderChange(order.id, 'returns', val);
                              }}
                              className="border border-slate-250 rounded px-2 py-1 text-sm font-semibold text-slate-700 w-16 text-center outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </td>
                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            <input 
                              key={order.id + '-notes-' + (order.notes || '')}
                              type="text" 
                              defaultValue={order.notes || ''} 
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val !== (order.notes || '')) handleOrderChange(order.id, 'notes', val);
                              }}
                              className="border border-slate-250 rounded px-2 py-1 text-sm font-semibold text-slate-750 w-28 outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </td>
                          <td className="px-3 py-2 text-indigo-750 font-extrabold whitespace-normal break-words max-w-[140px] text-[14px]">{order.company || '—'}</td>
                          <td className="px-2 py-2.5 text-center print:hidden" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setWaybillOrder(order)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="طباعة بوليصة">
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {!isAgent && (
                                <button onClick={() => openEditModal(order)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="تعديل">
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {!isAgent && !order.settled && (
                                <button onClick={() => deleteRow(order.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sheet Tabs */}
              <div className="flex items-center bg-slate-100 border-t border-slate-200 px-2 py-1.5 gap-1 overflow-x-auto custom-scrollbar print:hidden">
                <div className="relative flex items-center justify-center min-w-[32px] h-8 bg-white border border-slate-300 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors shadow-sm shrink-0" title="فتح شيت لتاريخ محدد">
                  <Calendar className="w-4 h-4" />
                  <input 
                    type="date" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value) setActiveDateTab(e.target.value);
                    }}
                  />
                </div>
                <div className="w-[1px] h-5 bg-slate-300 mx-1 shrink-0"></div>
                {dateTabs.map(dateStr => {
                  // Format YYYY-MM-DD to "Weekday DD/MM"
                  const parts = dateStr.split('-');
                  let displayDate = dateStr;
                  if (parts.length === 3) {
                    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                    const weekday = dateObj.toLocaleDateString('ar-EG', { weekday: 'long' });
                    displayDate = `${weekday} ${parts[2]}/${parts[1]}`;
                  }
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setActiveDateTab(dateStr)}
                      className={`px-5 py-2 rounded-t-lg text-sm font-bold transition-all whitespace-nowrap ${activeDateTab === dateStr ? 'bg-white text-indigo-700 border-t-4 border-indigo-500 shadow-sm' : 'text-slate-500 hover:bg-slate-200/60 border-t-4 border-transparent'}`}
                    >
                      {displayDate} {dateStr === today() && <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">اليوم</span>}
                    </button>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 p-4 bg-slate-50/50 print:hidden text-xs text-slate-500">
                <div>
                  عرض {filteredOrders.length === 0 ? 0 : Math.min(filteredOrders.length, (currentPage - 1) * (pageSize === 'الكل' ? filteredOrders.length : Number(pageSize)) + 1)} إلى {Math.min(filteredOrders.length, currentPage * (pageSize === 'الكل' ? filteredOrders.length : Number(pageSize)))} من أصل {filteredOrders.length} شحنة
                </div>
                
                {pageSize !== 'الكل' && totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button 
                      disabled={currentPage === 1} 
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all font-bold"
                    >
                      السابق
                    </button>
                    <span className="text-slate-600 px-2">
                      صفحة <strong className="text-slate-800">{currentPage}</strong> من <strong className="text-slate-800">{totalPages}</strong>
                    </span>
                    <button 
                      disabled={currentPage === totalPages} 
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all font-bold"
                    >
                      التالي
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">الصفوف بالصفحة:</span>
                  <select 
                    value={pageSize} 
                    onChange={(e) => {
                      setPageSize(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 px-2 py-1 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="250">250</option>
                    <option value="500">500</option>
                    <option value="1000">1000</option>
                    <option value="2000">2000</option>
                    <option value="3000">3000</option>
                    <option value="الكل">الكل</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============ COMPANY SUMMARY ============ */}
        {activeTab === 'company-summary' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 print:grid-cols-7">
              <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">عدد الطلبات</span>
                <p className="text-2xl font-black text-slate-800 mt-1">{summaryStats.totalOrders}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">تم التسليم</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{summaryStats.delivered}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">ملغي</span>
                <p className="text-2xl font-black text-red-500 mt-1">{summaryStats.cancelled}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">معلّق</span>
                <p className="text-2xl font-black text-amber-600 mt-1">{summaryStats.pending}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">المحصل</span>
                <p className="text-xl font-black text-emerald-600 mt-1">{summaryStats.totalCollected.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">العمولات</span>
                <p className="text-xl font-black text-slate-600 mt-1">{summaryStats.totalCommission.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-4 shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-20 h-20 bg-white/10 rounded-full -translate-x-8 -translate-y-8"></div>
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">الصافي</span>
                <p className="text-2xl font-black mt-1">{summaryStats.totalNet.toLocaleString()}</p>
                <span className="text-[10px] text-white/50">ج.م</span>
              </div>
            </div>

            {/* Settlement Action */}
            {hasUnsettledInView && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 print:hidden">
                <div>
                  <p className="font-bold text-amber-800">يوجد {filteredOrders.filter(o => !o.settled).length} طلب لم يتم تقفيلهم بعد</p>
                  <p className="text-xs text-amber-600 mt-0.5">بعد التقفيل لن تتمكن من تعديل هذه الطلبات</p>
                </div>
                <button onClick={settleOrders} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95">
                  <CheckCircle className="w-5 h-5" /> تقفيل الحساب ✓
                </button>
              </div>
            )}
            {!hasUnsettledInView && filteredOrders.length > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-3 print:hidden">
                <Lock className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-emerald-700">تم تقفيل جميع الطلبات ✓</span>
              </div>
            )}

            {/* Company Summary Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1 flex flex-col">
              <div className="overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-sm text-right print:text-xs">
                  <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-550 font-bold sticky top-0 z-10">
                    <tr className="border-b border-slate-200 whitespace-nowrap">
                      <th className="px-1 py-2 text-center w-6">#</th>
                      <th className="px-1 py-2 text-center w-6 print:hidden">
                        <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="rounded border-slate-300 w-3 h-3 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      </th>
                      <th className="px-1 py-2 text-center min-w-[70px] max-w-[80px]">المراجعه</th>
                      <th className="px-1.5 py-2 min-w-[100px] max-w-[120px] text-right">الراسل</th>
                      <th className="px-1 py-2 text-center min-w-[50px] max-w-[60px]">ك</th>
                      <th className="px-1.5 py-2 min-w-[100px] max-w-[120px] text-right">الاسم</th>
                      <th className="px-1.5 py-2 min-w-[160px] max-w-[200px] text-right">العنوان</th>
                      <th className="px-1 py-2 text-center min-w-[95px] max-w-[110px]">الرقم</th>
                      <th className="px-1 py-2 text-center min-w-[45px] max-w-[55px]">العدد</th>
                      <th className="px-1 py-2 text-center min-w-[75px] max-w-[90px]">الاجمالى</th>
                      <th className="px-1.5 py-2 min-w-[110px] max-w-[130px] text-right">المناديب</th>
                      <th className="px-1 py-2 text-center min-w-[95px] max-w-[110px]">الموقف</th>
                      <th className="px-1 py-2 text-center min-w-[75px] max-w-[90px]">المحصل</th>
                      <th className="px-1 py-2 text-center min-w-[60px] max-w-[75px]">الشحن</th>
                      <th className="px-1 py-2 text-center min-w-[70px] max-w-[85px] font-bold text-indigo-600">الصافى</th>
                      <th className="px-1 py-2 text-center min-w-[80px] max-w-[95px]">المرتجع</th>
                      <th className="px-1.5 py-2 min-w-[120px] max-w-[150px] text-right">ملاحظات</th>
                      <th className="px-1.5 py-2 min-w-[90px] max-w-[110px] text-right">الشركات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.length === 0 ? (
                      <tr><td colSpan="18" className="text-center py-24">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-2">
                            <Store className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="text-slate-500 font-bold text-lg">لا يوجد شحنات لهذه الشركة</p>
                          <p className="text-slate-400 text-sm">قم باستيراد ملف شيت الإكسيل أو أضف طلبات يدوياً</p>
                        </div>
                      </td></tr>
                    ) : paginatedOrders.map((order, index) => {
                      const isCanceled = ['لاغي', 'رفض شحن'].includes(order.status);
                      const isSelected = selectedOrderIds.includes(order.id);
                      return (
                        <tr key={order.id} className={`border-b border-slate-100/80 transition-colors whitespace-nowrap ${isCanceled ? 'opacity-50' : ''} ${isSelected ? 'bg-indigo-50/50' : order.settled ? 'bg-emerald-50/20' : 'hover:bg-slate-50/50'}`}>
                          <td className="px-3 py-3 text-center text-xs text-slate-400 font-mono">{(currentPage - 1) * (pageSize === 'الكل' ? filteredOrders.length : Number(pageSize)) + index + 1}</td>
                          <td className="px-3 py-3 text-center print:hidden" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(order.id)} className="rounded border-slate-300 w-3.5 h-3.5 text-indigo-650 cursor-pointer" />
                          </td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <input 
                              key={order.id + '-review-' + (order.review || '')}
                              type="text" 
                              defaultValue={order.review || ''} 
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val !== (order.review || '')) handleOrderChange(order.id, 'review', val);
                              }}
                              className="border border-slate-255 rounded px-2 py-1 text-sm font-semibold text-slate-800 w-14 text-center outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </td>
                          <td className="px-3 py-2 text-slate-800 font-semibold whitespace-normal break-words max-w-[150px] text-[14px]">{order.sender || '—'}</td>
                          <td className="px-3 py-2 text-center text-slate-600 font-bold font-mono text-[14px]">{order.code || '—'}</td>
                          <td className="px-3 py-2 text-slate-900 font-extrabold whitespace-normal break-words max-w-[160px] text-[15px]">{order.customerName || '—'}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-normal break-words min-w-[150px] max-w-[180px] text-[14px]">{order.center || '—'}</td>
                          <td className="px-3 py-2 text-center font-mono font-semibold text-slate-600 text-[14px]" dir="ltr">{order.phone || '—'}</td>
                          <td className="px-3 py-2 text-center text-slate-700 font-extrabold text-[14px]">{order.count || 1}</td>
                          <td className="px-3 py-2 text-center font-black text-slate-855 text-[15px]">{Number(order.total || 0).toLocaleString()}</td>
                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            <input 
                              type="text"
                              value={order.agent || ''} 
                              onChange={(e) => handleOrderChange(order.id, 'agent', e.target.value)} 
                              placeholder="المندوب"
                              className="border border-slate-255 rounded px-2 py-1 text-sm font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 bg-white w-28"
                            />
                          </td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <select 
                              value={order.status || ''} 
                              onChange={(e) => handleOrderChange(order.id, 'status', e.target.value)} 
                              className={`border rounded px-2 py-1 text-sm font-extrabold outline-none focus:ring-1 focus:ring-indigo-500 w-24 text-center ${
                                STATUS_OPTIONS.find(opt => opt.value === order.status)?.color || 'bg-slate-50 text-slate-700 border-slate-205'
                              }`}
                            >
                              <option value="">اختر الحالة...</option>
                              {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <input 
                              key={order.id + '-collected-' + (order.collected || 0)}
                              type="number" 
                              defaultValue={order.collected || 0} 
                              onBlur={(e) => {
                                const val = Number(e.target.value) || 0;
                                if (val !== order.collected) handleOrderChange(order.id, 'collected', val);
                              }}
                              className="border border-slate-255 rounded px-2 py-1 text-sm font-extrabold text-slate-800 w-16 text-center outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <input 
                              key={order.id + '-shippingFee-' + (order.shippingFee !== undefined ? order.shippingFee : '')}
                              type="number" 
                              defaultValue={order.shippingFee !== undefined ? order.shippingFee : (order.commission !== undefined ? order.commission : (merchants.find(m => m.name === order.company)?.rate || 0))} 
                              onBlur={(e) => {
                                const val = Number(e.target.value) || 0;
                                if (val !== order.shippingFee) handleOrderChange(order.id, 'shippingFee', val);
                              }}
                              className="border border-slate-255 rounded px-2 py-1 text-sm font-semibold text-slate-700 w-12 text-center outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </td>
                          <td className="px-3 py-2 text-center font-black text-indigo-755 text-[15px]">
                            {(() => {
                              const sFee = order.shippingFee !== undefined ? Number(order.shippingFee) : (order.commission !== undefined ? Number(order.commission) : (Number(merchants.find(m => m.name === order.company)?.rate) || 0));
                              return calculateNet(order.collected, sFee).toLocaleString();
                            })()}
                          </td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <input 
                              key={order.id + '-returns-' + (order.returns || '')}
                              type="text" 
                              defaultValue={order.returns || ''} 
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val !== (order.returns || '')) handleOrderChange(order.id, 'returns', val);
                              }}
                              className="border border-slate-255 rounded px-2 py-1 text-sm font-semibold text-slate-700 w-16 text-center outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </td>
                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            <input 
                              key={order.id + '-notes-' + (order.notes || '')}
                              type="text" 
                              defaultValue={order.notes || ''} 
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val !== (order.notes || '')) handleOrderChange(order.id, 'notes', val);
                              }}
                              className="border border-slate-255 rounded px-2 py-1 text-sm font-semibold text-slate-755 w-28 outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </td>
                          <td className="px-3 py-2 text-indigo-750 font-extrabold whitespace-normal break-words max-w-[140px] text-[14px]">{order.company || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 p-4 bg-slate-50/50 print:hidden text-xs text-slate-500">
                <div>
                  عرض {filteredOrders.length === 0 ? 0 : Math.min(filteredOrders.length, (currentPage - 1) * (pageSize === 'الكل' ? filteredOrders.length : Number(pageSize)) + 1)} إلى {Math.min(filteredOrders.length, currentPage * (pageSize === 'الكل' ? filteredOrders.length : Number(pageSize)))} من أصل {filteredOrders.length} شحنة
                </div>
                
                {pageSize !== 'الكل' && totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button 
                      disabled={currentPage === 1} 
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all font-bold"
                    >
                      السابق
                    </button>
                    <span className="text-slate-600 px-2">
                      صفحة <strong className="text-slate-800">{currentPage}</strong> من <strong className="text-slate-800">{totalPages}</strong>
                    </span>
                    <button 
                      disabled={currentPage === totalPages} 
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all font-bold"
                    >
                      التالي
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">الصفوف بالصفحة:</span>
                  <select 
                    value={pageSize} 
                    onChange={(e) => {
                      setPageSize(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 px-2 py-1 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="250">250</option>
                    <option value="500">500</option>
                    <option value="1000">1000</option>
                    <option value="2000">2000</option>
                    <option value="3000">3000</option>
                    <option value="الكل">الكل</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============ MERCHANTS ============ */}
        {activeTab === 'merchants' && (
          <div className="space-y-4">
            {merchants.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4"><Store className="w-8 h-8 text-indigo-300" /></div>
                <p className="text-slate-400 font-semibold">لا يوجد تجار بعد</p>
                <p className="text-slate-300 text-sm mt-1">اضغط "إضافة تاجر" للبدء</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {merchants.map((m, i) => (
                  <div key={m.id} className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-300 hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/20">
                          {(m.name || 'T').charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800">{m.name || '—'}</h3>
                          <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{m.phone || 'لا يوجد هاتف'}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setActiveMerchantModal({ isOpen: true, data: m })} className="p-2 rounded-xl text-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem('merchants', m.id, 'مسح هذا التاجر؟')} className="p-2 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 mb-1">العنوان</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{m.address || '—'}</p>
                      </div>
                      <div className="bg-indigo-50 rounded-xl p-3">
                        <p className="text-xs text-indigo-400 mb-1">سعر الشحن</p>
                        <p className="text-sm font-black text-indigo-700">{Number(m.rate || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span></p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ AGENTS ============ */}
        {activeTab === 'agents' && (
          <div className="space-y-4">
            {agents.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4"><Truck className="w-8 h-8 text-emerald-300" /></div>
                <p className="text-slate-400 font-semibold">لا يوجد مناديب بعد</p>
                <p className="text-slate-300 text-sm mt-1">اضغط "إضافة مندوب" للبدء</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agents.map((a, i) => {
                  const agentOrders = orders.filter(o => o.agent === a.name);
                  const delivered = agentOrders.filter(o => o.status === 'تم التسليم').length;
                  const rate = agentOrders.length > 0 ? Math.round((delivered / agentOrders.length) * 100) : 0;
                  return (
                    <div key={a.id} className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:border-emerald-100 transition-all duration-300 hover:-translate-y-0.5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-500/20">
                            {(a.name || 'A').charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800">{a.name || '—'}</h3>
                            <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{a.phone || 'لا يوجد هاتف'}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setActiveAgentModal({ isOpen: true, data: a })} className="p-2 rounded-xl text-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => deleteArrayItem('agents', a.id, 'مسح هذا المندوب؟')} className="p-2 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-slate-400">طلبات</p>
                          <p className="font-black text-slate-800">{agentOrders.length}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-emerald-500">تسليم</p>
                          <p className="font-black text-emerald-700">{delivered}</p>
                        </div>
                        <div className="bg-indigo-50 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-indigo-400">نسبة</p>
                          <p className="font-black text-indigo-700">{rate}%</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                        <span>📍 {a.zone || 'لا توجد منطقة'}</span>
                        <span>🚗 {a.vehicle || '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============ EXPENSES ============ */}
        {activeTab === 'expenses' && (
          <div className="flex flex-col gap-5 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 hover:shadow-md transition-all hover:-translate-y-0.5 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><ArrowUpRight className="w-5 h-5 text-emerald-500" /></div>
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">إيرادات</span>
                </div>
                <p className="text-3xl font-black text-slate-800">{companyProfits.totalCompanyNet.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">أرباح الشحنات • ج.م</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100 hover:shadow-md transition-all hover:-translate-y-0.5 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><ArrowDownRight className="w-5 h-5 text-red-500" /></div>
                  <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">مصروفات</span>
                </div>
                <p className="text-3xl font-black text-red-600">{companyProfits.totalExpenses.toLocaleString()}</p>
                <p className="text-xs text-red-400 mt-1">إجمالي المصروفات • ج.م</p>
              </div>
              <div className={`rounded-2xl p-5 shadow-xl border relative overflow-hidden transition-all hover:-translate-y-0.5 duration-200 ${companyProfits.netProfit >= 0 ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white border-indigo-500/20 shadow-indigo-500/25' : 'bg-gradient-to-br from-red-600 to-rose-700 text-white border-red-500/20 shadow-red-500/25'}`}>
                <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 translate-y-8"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-white" /></div>
                  <span className="text-xs font-bold text-white/70 bg-white/10 px-2 py-1 rounded-lg">صافي الربح</span>
                </div>
                <p className="text-3xl font-black relative z-10">{companyProfits.netProfit.toLocaleString()}</p>
                <p className="text-xs text-white/50 mt-1 relative z-10">بعد خصم المصروفات • ج.م</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Receipt className="w-4 h-4 text-red-500" /></div>
                <h3 className="font-bold text-slate-800">سجل المصروفات</h3>
                <span className="mr-auto text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{expenses.length} مصروف</span>
              </div>
              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-3"><Receipt className="w-7 h-7 text-red-200" /></div>
                  <p className="text-slate-400 font-semibold">لا توجد مصروفات مسجلة</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {expenses.map((exp, i) => (
                    <div key={exp.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 text-red-500 font-black text-sm">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{exp.notes || 'بدون بيان'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{exp.date}</p>
                      </div>
                      <p className="font-black text-xl text-red-600 shrink-0">{Number(exp.amount || 0).toLocaleString()} <span className="text-xs font-normal text-red-400">ج.م</span></p>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setActiveExpenseModal({ isOpen: true, data: exp })} className="p-2 rounded-xl text-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem('expenses', exp.id, 'مسح هذا المصروف؟')} className="p-2 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ SALARIES ============ */}
        {activeTab === 'salaries' && (
          <SalaryPage
            employees={employees}
            orders={orders}
            currentUser={currentUser}
          />
        )}


        {/* ============ USERS ============ */}
        {activeTab === 'users' && (
          <UsersPage currentUser={currentUser} />
        )}

      </main>

      {/* Order Modal */}
      <OrderModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingOrder(null); }}
        onSave={handleSaveOrder}
        order={editingOrder}
        merchants={merchants}
        agents={agents}
      />

      {/* Merchant Modal */}
      <MerchantModal
        isOpen={activeMerchantModal.isOpen}
        onClose={() => setActiveMerchantModal({ isOpen: false, data: null })}
        onSave={(data) => handleSaveEntity('merchants', setActiveMerchantModal, data)}
        initialData={activeMerchantModal.data}
      />

      {/* Agent Modal */}
      <AgentModal
        isOpen={activeAgentModal.isOpen}
        onClose={() => setActiveAgentModal({ isOpen: false, data: null })}
        onSave={(data) => handleSaveEntity('agents', setActiveAgentModal, data)}
        initialData={activeAgentModal.data}
      />

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={activeExpenseModal.isOpen}
        onClose={() => setActiveExpenseModal({ isOpen: false, data: null })}
        onSave={(data) => handleSaveEntity('expenses', setActiveExpenseModal, data)}
        initialData={activeExpenseModal.data}
      />

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={activeEmployeeModal.isOpen}
        onClose={() => setActiveEmployeeModal({ isOpen: false, data: null })}
        onSave={(data) => handleSaveEntity('employees', setActiveEmployeeModal, data)}
        initialData={activeEmployeeModal.data}
      />



      {/* Quick Dispatch Modal */}
      {isQuickDispatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm modal-overlay" onClick={() => { setIsQuickDispatchOpen(false); setQuickDispatchStatus({ text: '', type: '' }); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-100 animate-slideUp" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/30 to-indigo-100/10">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚚</span>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">لوحة التوزيع السريع للمناديب</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">توزيع الشحنات فردياً أو جماعياً بضغطة زر</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsQuickDispatchOpen(false);
                  setQuickDispatchStatus({ text: '', type: '' });
                }} 
                className="text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
              
              {/* 1. Base Agent & Commission Settings */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col gap-3">
                <h4 className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider">1. اختيار المندوب والعمولة الأساسية</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">المندوب المستهدف</label>
                    <select
                      value={quickDispatchAgent}
                      onChange={(e) => setQuickDispatchAgent(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">اختر المندوب...</option>
                      {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">عمولة التوصيل</label>
                    <input
                      type="number"
                      value={quickDispatchCommission}
                      onChange={(e) => setQuickDispatchCommission(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Status Message Display */}
              {quickDispatchStatus.text && (
                <div className={`text-xs font-bold px-3 py-2 rounded-lg border ${
                  quickDispatchStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  quickDispatchStatus.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                } animate-fadeIn`}>
                  {quickDispatchStatus.text}
                </div>
              )}

              {/* 2. Single Dispatch Mode (Barcode / Phone) */}
              <div className="border border-slate-100 p-4 rounded-xl flex flex-col gap-2.5">
                <h4 className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider">2. توزيع فردي سريع (بالمسح أو الهاتف)</h4>
                <form onSubmit={handleQuickDispatch} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="امسح الباركود أو اكتب آخر 4 أرقام من الهاتف..."
                    value={quickDispatchInput}
                    onChange={(e) => setQuickDispatchInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition-all active:scale-95"
                  >
                    تعيين
                  </button>
                </form>
              </div>

              {/* 3. Bulk Dispatch Modes */}
              <div className="border border-slate-100 p-4 rounded-xl flex flex-col gap-3">
                <h4 className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider">3. توزيع جماعي (بنطاق الأكواد أو التاجر)</h4>
                
                <div className="grid grid-cols-1 gap-3">
                  {/* By Code Range */}
                  <div className="flex flex-col gap-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-400">نطاق الأكواد (من كود إلى كود)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="من"
                        value={bulkDispatchFrom}
                        onChange={(e) => setBulkDispatchFrom(e.target.value)}
                        className="w-1/2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <input
                        type="number"
                        placeholder="إلى"
                        value={bulkDispatchTo}
                        onChange={(e) => setBulkDispatchTo(e.target.value)}
                        className="w-1/2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleBulkDispatch('range', { from: bulkDispatchFrom, to: bulkDispatchTo })}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        توزيع
                      </button>
                    </div>
                  </div>

                  {/* By Merchant */}
                  <div className="flex flex-col gap-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-400">حسب التاجر / الراسل</label>
                    <div className="flex gap-2">
                      <select
                        value={bulkDispatchMerchant}
                        onChange={(e) => setBulkDispatchMerchant(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">اختر التاجر...</option>
                        {companiesDropdown.filter(c => c !== 'الكل').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleBulkDispatch('merchant', { merchant: bulkDispatchMerchant })}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        توزيع
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setIsQuickDispatchOpen(false);
                  setQuickDispatchStatus({ text: '', type: '' });
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-5 py-2 rounded-lg transition-all active:scale-95"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner isOpen={showScanner} onClose={() => setShowScanner(false)} orders={orders} onScan={handleScannerStatusUpdate} />
      )}

      {/* Waybill Print Modal */}
      {waybillOrder && <Waybill order={waybillOrder} onClose={() => setWaybillOrder(null)} />}
      {waybillOrders.length > 0 && <Waybill orders={waybillOrders} onClose={() => setWaybillOrders([])} />}

      {/* Bulk Actions Floating Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl px-6 py-4 flex flex-wrap items-center gap-4 shadow-2xl border border-slate-700/50 animate-slideUp max-w-[95%]">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-xs px-2.5 py-1 rounded-full font-bold">{selectedOrderIds.length}</span>
            <span className="text-sm font-semibold text-slate-300">تم التحديد</span>
          </div>

          <div className="h-6 w-px bg-slate-700/60" />

          {/* Bulk Update Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">تغيير الموقف:</span>
            <select 
              onChange={async (e) => {
                const val = e.target.value;
                if (!val) return;
                if (window.confirm(`هل أنت متأكد من تغيير موقف ${selectedOrderIds.length} طلب إلى "${val}"؟`)) {
                  try {
                    const zeroCollectedStatuses = ['لاغي', 'غير متاح', 'عدم رد', 'بدون شحن', 'تهرب', 'مؤجل', 'رفض شحن'];
                    for (const id of selectedOrderIds) {
                      const o = orders.find(x => x.id === id);
                      if (o && !o.settled) {
                        let updated = { ...o, status: val };
                        if (zeroCollectedStatuses.includes(val)) updated.collected = 0;
                        else if (['تم التسليم', 'اوت زون', 'نزول'].includes(val)) updated.collected = o.total;
                        await setDoc(doc(db, 'orders', id), updated);
                      }
                    }
                    setSelectedOrderIds([]);
                    e.target.value = '';
                  } catch(err) {
                    alert('خطأ أثناء التعديل الجماعي: ' + err.message);
                  }
                }
              }}
              className="bg-slate-800 text-xs font-semibold text-white px-2 py-1.5 rounded-lg border border-slate-700 outline-none cursor-pointer"
            >
              <option value="">اختر الحالة...</option>
              {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Bulk Update Agent */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">تغيير المندوب:</span>
            <select 
              onChange={async (e) => {
                const val = e.target.value;
                if (!val) return;
                if (window.confirm(`هل أنت متأكد من إسناد ${selectedOrderIds.length} طلب للمندوب "${val}"؟`)) {
                  try {
                    for (const id of selectedOrderIds) {
                      const o = orders.find(x => x.id === id);
                      if (o && !o.settled) {
                        await setDoc(doc(db, 'orders', id), { ...o, agent: val });
                      }
                    }
                    setSelectedOrderIds([]);
                    e.target.value = '';
                  } catch(err) {
                    alert('خطأ أثناء التعديل الجماعي: ' + err.message);
                  }
                }
              }}
              className="bg-slate-800 text-xs font-semibold text-white px-2 py-1.5 rounded-lg border border-slate-700 outline-none cursor-pointer"
            >
              <option value="">اختر المندوب...</option>
              {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>

          {/* Bulk Update Commission */}
          <button 
            onClick={async () => {
              const commStr = window.prompt("أدخل قيمة العمولة الجديدة لجميع الطلبات المحددة:");
              if (commStr === null) return;
              const comm = Number(commStr);
              if (isNaN(comm)) return alert('يرجى إدخال رقم صحيح.');
              try {
                for (const id of selectedOrderIds) {
                  const o = orders.find(x => x.id === id);
                  if (o && !o.settled) {
                    await setDoc(doc(db, 'orders', id), { ...o, commission: comm });
                  }
                }
                setSelectedOrderIds([]);
              } catch(err) {
                alert('خطأ أثناء التعديل الجماعي: ' + err.message);
              }
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            تعديل العمولة
          </button>

          <div className="h-6 w-px bg-slate-700/60" />

          {/* Bulk Actions (Print / Delete / Cancel) */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => {
                const ordersToPrint = orders.filter(o => selectedOrderIds.includes(o.id));
                setWaybillOrders(ordersToPrint);
              }}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-md shadow-emerald-600/10"
            >
              <Printer className="w-3.5 h-3.5" /> طباعة البوالص ({selectedOrderIds.length})
            </button>

            <button 
              onClick={async () => {
                if (window.confirm(`هل أنت متأكد من مسح ${selectedOrderIds.length} طلب محدد نهائياً؟`)) {
                  try {
                    let deletedCount = 0;
                    for (const id of selectedOrderIds) {
                      const o = orders.find(x => x.id === id);
                      if (o && !o.settled) {
                        await deleteDoc(doc(db, 'orders', id));
                        deletedCount++;
                      }
                    }
                    setSelectedOrderIds([]);
                    alert(`تم حذف ${deletedCount} طلب بنجاح.`);
                  } catch(err) {
                    alert('خطأ أثناء الحذف: ' + err.message);
                  }
                }
              }}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-md shadow-red-600/10"
            >
              <Trash2 className="w-3.5 h-3.5" /> حذف المحدد
            </button>

            <button 
              onClick={() => setSelectedOrderIds([])}
              className="text-xs font-medium text-slate-400 hover:text-white px-2 py-1.5 transition-colors"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      <datalist id="agents-list">{agents.map(a => <option key={a.id} value={a.name} />)}</datalist>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar{width:5px;height:5px}
        .custom-scrollbar::-webkit-scrollbar-track{background:transparent}
        .custom-scrollbar::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:10px}
        .custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#94a3b8}
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in-95 { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slide-up { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .animate-slideUp { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-in { animation-fill-mode: both; }
        .fade-in { animation-name: fade-in; }
        .zoom-in-95 { animation-name: zoom-in-95; }
        .duration-200 { animation-duration: 200ms; }
      `}} />
    </div>
  );
}

export default App;
