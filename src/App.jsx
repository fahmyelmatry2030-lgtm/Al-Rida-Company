import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Package, Users, Truck, FileSpreadsheet, Plus, Filter, ChevronDown, WalletCards, Printer, Download, Upload, Trash2, Search, Store, UserCircle, Receipt, CheckCircle, Lock, Calendar, MonitorSmartphone, Eye, Edit3, BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
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
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
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
  const [filterDateFrom, setFilterDateFrom] = useState(today());
  const [filterDateTo, setFilterDateTo] = useState(today());
  const [showSettled, setShowSettled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [activeMerchantModal, setActiveMerchantModal] = useState({ isOpen: false, data: null });
  const [activeAgentModal, setActiveAgentModal] = useState({ isOpen: false, data: null });
  const [activeExpenseModal, setActiveExpenseModal] = useState({ isOpen: false, data: null });
  const [activeEmployeeModal, setActiveEmployeeModal] = useState({ isOpen: false, data: null });
  const [waybillOrder, setWaybillOrder] = useState(null);
  const [showTracking, setShowTracking] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('currentUser')); } catch { return null; }
  });
  const [showScanner, setShowScanner] = useState(false);

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

  const calculateNet = (collected, commission) => (Number(collected) || 0) - (Number(commission) || 0);

  // --- Orders Logic ---
  const handleOrderChange = async (id, field, value) => {
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
  };

  const openAddModal = () => {
    setEditingOrder({
      id: Math.random().toString(36).substr(2, 9), date: today(), sender: '', code: '', customerName: '', center: '', phone: '', count: 1, total: 0, agent: '', status: '', collected: 0, commission: 20, returns: '', notes: '', company: '', settled: false
    });
    setIsModalOpen(true);
  };

  const openEditModal = (order) => {
    if (order.settled) return;
    setEditingOrder({ ...order });
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
      result = result.filter(o => !o.settled);
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
    return result;
  }, [orders, activeTab, selectedCompany, searchQuery, filterDateFrom, filterDateTo, showSettled, currentUser]);

  const summaryStats = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      acc.totalOrders++;
      acc.totalCollected += Number(order.collected) || 0;
      acc.totalCommission += Number(order.commission) || 0;
      acc.totalNet += calculateNet(order.collected, order.commission);
      if (order.status === 'تم التسليم') acc.delivered++;
      else if (['لاغي', 'رفض شحن'].includes(order.status)) acc.cancelled++;
      else if (['مؤجل', 'غير متاح', 'عدم رد', 'تهرب'].includes(order.status)) acc.pending++;
      return acc;
    }, { totalOrders: 0, totalCollected: 0, totalCommission: 0, totalNet: 0, delivered: 0, cancelled: 0, pending: 0 });
  }, [filteredOrders]);

  const hasUnsettledInView = filteredOrders.some(o => !o.settled);

  // Company Overall Profit
  const companyProfits = useMemo(() => {
    const totalCompanyNet = orders.reduce((sum, o) => sum + calculateNet(o.collected, o.commission), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) + salaryPayments.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
    return { totalCompanyNet, totalExpenses, netProfit: totalCompanyNet - totalExpenses };
  }, [orders, expenses, salaryPayments]);

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
    const dataToExport = filteredOrders.map((order, i) => ({
      'م': i + 1, 'التاريخ': order.date, 'الراسل': order.sender, 'الكود': order.code, 'الاسم': order.customerName, 'المنطقه': order.center,
      'الرقم': order.phone, 'العدد': order.count, 'السعر': order.total, 'المندوب': order.agent, 'الموقف': order.status,
      'المحصل': order.collected, 'العمولة': order.commission, 'الصافي': calculateNet(order.collected, order.commission),
      'المرتجعات': order.returns, 'ملاحظات': order.notes, 'الشركات': order.company, 'الحالة': order.settled ? 'تم التقفيل' : 'مفتوح',
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    if (activeTab === 'company-summary' && selectedCompany !== 'الكل') {
      XLSX.utils.sheet_add_json(ws, [{}, { 'الإجمالي': 'الإجماليات:', 'المحصل': summaryStats.totalCollected, 'العمولة': summaryStats.totalCommission, 'الصافي': summaryStats.totalNet }], { skipHeader: true, origin: -1 });
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
    <button onClick={() => setActiveTab(id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === id ? 'bg-white/15 text-white shadow-lg shadow-white/5 backdrop-blur-sm border border-white/10' : 'text-white/60 hover:text-white/90 hover:bg-white/5'}`}>
      <Icon className="w-5 h-5" /> <span className="font-medium">{label}</span>
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
      <aside className="w-[260px] bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col shadow-2xl z-20 sticky top-0 h-screen print:hidden overflow-y-auto custom-scrollbar shrink-0">
        <div className="p-5 flex items-center gap-3 border-b border-white/10 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">شركة الرضا</h1>
            <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">Shipping Management</span>
          </div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {!isAgent && <NavButton id="dashboard" icon={TrendingUp} label="لوحة التحكم" />}
          <NavButton id="data-entry" icon={FileSpreadsheet} label={isAgent ? 'طلباتي' : 'الطلبات والإدخال'} />
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
          <button onClick={() => setShowScanner(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-white/60 hover:text-white/90 hover:bg-white/5">
            <ScanLine className="w-5 h-5" /> <span className="font-medium">ماسح الباركود</span>
          </button>
          <button onClick={() => setShowTracking(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-white/60 hover:text-white/90 hover:bg-white/5">
            <Eye className="w-5 h-5" /> <span className="font-medium">تتبع الشحنات</span>
          </button>
        </nav>
        <div className="p-4 border-t border-white/5 shrink-0 flex flex-col gap-3">
          {!isInstalled && installPrompt && (
            <button onClick={handleInstall} className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20 text-sm w-full">
              <MonitorSmartphone className="w-4 h-4" /> تثبيت التطبيق
            </button>
          )}
          {isInstalled && (
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-medium">
              <CheckCircle className="w-3 h-3" /> تم تثبيت التطبيق
            </div>
          )}
          <div className="bg-white/5 rounded-xl p-3 mb-2">
            <p className="text-white/80 font-bold text-sm">{currentUser?.name}</p>
            <p className="text-white/40 text-xs mt-0.5">{currentUser?.role === 'admin' ? '👑 مدير' : currentUser?.role === 'secretary' ? '📋 سكرتير' : '🚚 مندوب'}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-bold py-2 rounded-xl transition-colors">
            خروج من الحساب
          </button>
          <p className="text-center text-[10px] text-white/20 mt-1">البيانات محفوظة على السيرفر ☁️</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col gap-5 max-h-screen overflow-y-auto w-full print:p-0 print:h-auto print:overflow-visible custom-scrollbar">
        
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              {activeTab === 'dashboard' && 'لوحة التحكم'}
              {activeTab === 'data-entry' && 'الطلبات والإدخال'}
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
            {(activeTab === 'data-entry' || activeTab === 'company-summary') && (
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input type="text" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="pl-4 pr-9 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-48 text-sm shadow-sm" />
              </div>
            )}


        {activeTab === 'data-entry' && (
              <button onClick={openAddModal} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95">
                <Plus className="w-4 h-4" /> إضافة طلب
              </button>
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

            {(activeTab === 'company-summary' || activeTab === 'data-entry') && (
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
             {activeTab === 'data-entry' ? 'سجل الطلبات والشحنات' : ''}
           </h1>
           <p className="text-gray-500">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>

        {/* ============ DASHBOARD ============ */}
        {activeTab === 'dashboard' && (
          <Dashboard orders={orders} merchants={merchants} agents={agents} expenses={expenses} companyProfits={companyProfits} />
        )}

        {/* ============ DATA ENTRY ============ */}
        {activeTab === 'data-entry' && (
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
              <div className="overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-xs text-right print:text-[10px]">
                  <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-500 font-semibold sticky top-0 z-10">
                    <tr className="border-b border-slate-200 whitespace-nowrap">
                      <th className="px-2 py-3 text-center w-10">#</th>
                      <th className="px-2 py-3 text-center">المراجعه</th>
                      <th className="px-2 py-3">الراسل</th>
                      <th className="px-2 py-3 text-center">ك</th>
                      <th className="px-2 py-3">الاسم</th>
                      <th className="px-2 py-3">العنوان</th>
                      <th className="px-2 py-3 text-center">الرقم</th>
                      <th className="px-2 py-3 text-center">العدد</th>
                      <th className="px-2 py-3 text-center">الاجمالى</th>
                      <th className="px-2 py-3">المناديب</th>
                      <th className="px-2 py-3 text-center">الموقف</th>
                      <th className="px-2 py-3 text-center">المحصل</th>
                      <th className="px-2 py-3 text-center">العموله</th>
                      <th className="px-2 py-3 text-center font-bold text-indigo-600">الصافى</th>
                      <th className="px-2 py-3 text-center">المرتجع</th>
                      <th className="px-2 py-3">ملاحظات</th>
                      <th className="px-2 py-3">الشركات</th>
                      <th className="px-2 py-3 text-center w-24 print:hidden">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="18" className="text-center py-20">
                        <div className="flex flex-col items-center gap-3">
                          <Package className="w-12 h-12 text-slate-200" />
                          <p className="text-slate-400 font-medium">لا توجد طلبات حالياً</p>
                          <button onClick={openAddModal} className="text-indigo-600 text-sm font-bold hover:underline">+ إضافة أول طلب</button>
                        </div>
                      </td></tr>
                    ) : filteredOrders.map((order, index) => {
                      const isCanceled = ['لاغي', 'رفض شحن'].includes(order.status);
                      return (
                        <tr key={order.id} onClick={() => openEditModal(order)} className={`border-b border-slate-100/80 cursor-pointer transition-all duration-150 whitespace-nowrap ${isCanceled ? 'opacity-50' : ''} ${order.settled ? 'bg-emerald-50/30' : 'hover:bg-indigo-50/40'}`}>
                          <td className="px-2 py-2.5 text-center">
                            <span className="text-xs text-slate-400 font-mono">{index + 1}</span>
                            {order.settled && <Lock className="w-3 h-3 text-emerald-400 inline-block mr-1" />}
                          </td>
                          <td className="px-2 py-2.5 text-center text-slate-600">{order.review || '—'}</td>
                          <td className="px-2 py-2.5 text-slate-700 font-semibold">{order.sender || '—'}</td>
                          <td className="px-2 py-2.5 text-center text-slate-500 font-mono">#{order.code || '—'}</td>
                          <td className="px-2 py-2.5 text-slate-800 font-bold">{order.customerName || '—'}</td>
                          <td className="px-2 py-2.5 text-slate-600">{order.center || '—'}</td>
                          <td className="px-2 py-2.5 text-center font-mono text-slate-500" dir="ltr">{order.phone || '—'}</td>
                          <td className="px-2 py-2.5 text-center text-slate-600 font-bold">{order.count || 1}</td>
                          <td className="px-2 py-2.5 text-center font-bold text-slate-700">{Number(order.total || 0).toLocaleString()}</td>
                          <td className="px-2 py-2.5 text-slate-600">{order.agent || '—'}</td>
                          <td className="px-2 py-2.5 text-center"><StatusBadge status={order.status} /></td>
                          <td className="px-2 py-2.5 text-center font-bold text-slate-700">{Number(order.collected || 0).toLocaleString()}</td>
                          <td className="px-2 py-2.5 text-center text-slate-600">{Number(order.commission || 0).toLocaleString()}</td>
                          <td className="px-2 py-2.5 text-center font-extrabold text-indigo-700">{calculateNet(order.collected, order.commission).toLocaleString()}</td>
                          <td className="px-2 py-2.5 text-center text-slate-600">{order.returns || '—'}</td>
                          <td className="px-2 py-2.5 text-slate-500 max-w-[150px] truncate">{order.notes || '—'}</td>
                          <td className="px-2 py-2.5 text-indigo-700 font-bold">{order.company || '—'}</td>
                          <td className="px-2 py-2.5 text-center print:hidden" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setWaybillOrder(order)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="طباعة بوليصة">
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => openEditModal(order)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="تعديل">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {!order.settled && (
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
                <table className="w-full text-xs text-right print:text-[10px]">
                  <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-500 font-semibold sticky top-0 z-10">
                    <tr className="border-b border-slate-200 whitespace-nowrap">
                      <th className="px-2 py-3 text-center w-10">#</th>
                      <th className="px-2 py-3 text-center">المراجعه</th>
                      <th className="px-2 py-3">الراسل</th>
                      <th className="px-2 py-3 text-center">ك</th>
                      <th className="px-2 py-3">الاسم</th>
                      <th className="px-2 py-3">العنوان</th>
                      <th className="px-2 py-3 text-center">الرقم</th>
                      <th className="px-2 py-3 text-center">العدد</th>
                      <th className="px-2 py-3 text-center">الاجمالى</th>
                      <th className="px-2 py-3">المناديب</th>
                      <th className="px-2 py-3 text-center">الموقف</th>
                      <th className="px-2 py-3 text-center">المحصل</th>
                      <th className="px-2 py-3 text-center">العموله</th>
                      <th className="px-2 py-3 text-center font-bold text-indigo-600">الصافى</th>
                      <th className="px-2 py-3 text-center">المرتجع</th>
                      <th className="px-2 py-3">ملاحظات</th>
                      <th className="px-2 py-3">الشركات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="17" className="text-center py-24">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-2">
                            <Store className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="text-slate-500 font-bold text-lg">لا يوجد شحنات لهذه الشركة</p>
                          <p className="text-slate-400 text-sm">قم باستيراد ملف شيت الإكسيل أو أضف طلبات يدوياً</p>
                        </div>
                      </td></tr>
                    ) : filteredOrders.map((order, index) => {
                      const isCanceled = ['لاغي', 'رفض شحن'].includes(order.status);
                      return (
                        <tr key={order.id} className={`border-b border-slate-100/80 transition-colors whitespace-nowrap ${isCanceled ? 'opacity-50' : ''} ${order.settled ? 'bg-emerald-50/20' : 'hover:bg-slate-50/50'}`}>
                          <td className="px-2 py-2.5 text-center text-xs text-slate-400 font-mono">{index + 1}</td>
                          <td className="px-2 py-2.5 text-center text-slate-600">{order.review || '—'}</td>
                          <td className="px-2 py-2.5 text-slate-700 font-semibold">{order.sender || '—'}</td>
                          <td className="px-2 py-2.5 text-center text-slate-500 font-mono">#{order.code || '—'}</td>
                          <td className="px-2 py-2.5 text-slate-800 font-bold">{order.customerName || '—'}</td>
                          <td className="px-2 py-2.5 text-slate-600">{order.center || '—'}</td>
                          <td className="px-2 py-2.5 text-center font-mono text-slate-500" dir="ltr">{order.phone || '—'}</td>
                          <td className="px-2 py-2.5 text-center text-slate-600 font-bold">{order.count || 1}</td>
                          <td className="px-2 py-2.5 text-center font-bold text-slate-700">{Number(order.total || 0).toLocaleString()}</td>
                          <td className="px-2 py-2.5 text-slate-600">{order.agent || '—'}</td>
                          <td className="px-2 py-2.5 text-center"><StatusBadge status={order.status} /></td>
                          <td className="px-2 py-2.5 text-center font-bold text-slate-700">{Number(order.collected || 0).toLocaleString()}</td>
                          <td className="px-2 py-2.5 text-center text-slate-600">{Number(order.commission || 0).toLocaleString()}</td>
                          <td className="px-2 py-2.5 text-center font-extrabold text-indigo-700">{calculateNet(order.collected, order.commission).toLocaleString()}</td>
                          <td className="px-2 py-2.5 text-center text-slate-600">{order.returns || '—'}</td>
                          <td className="px-2 py-2.5 text-slate-500 max-w-[150px] truncate">{order.notes || '—'}</td>
                          <td className="px-2 py-2.5 text-indigo-700 font-bold">{order.company || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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


      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner isOpen={showScanner} onClose={() => setShowScanner(false)} orders={orders} onScan={handleScannerStatusUpdate} />
      )}

      {/* Waybill Print Modal */}
      {waybillOrder && <Waybill order={waybillOrder} onClose={() => setWaybillOrder(null)} />}

      <datalist id="agents-list">{agents.map(a => <option key={a.id} value={a.name} />)}</datalist>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar{width:5px;height:5px}
        .custom-scrollbar::-webkit-scrollbar-track{background:transparent}
        .custom-scrollbar::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:10px}
        .custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#94a3b8}
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in-95 { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-in { animation-fill-mode: both; }
        .fade-in { animation-name: fade-in; }
        .zoom-in-95 { animation-name: zoom-in-95; }
        .duration-200 { animation-duration: 200ms; }
      `}} />
    </div>
  );
}

export default App;
