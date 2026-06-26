import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Package, Users, Truck, FileSpreadsheet, Plus, Filter, ChevronDown, WalletCards, Printer, Download, Upload, Trash2, Search, Store, UserCircle, Receipt, CheckCircle, Lock, Calendar, MonitorSmartphone, Eye, Edit3, BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import OrderModal from './OrderModal';
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { MerchantModal, AgentModal, ExpenseModal, EmployeeModal } from './EntityModals';

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
  const [activeTab, setActiveTab] = useState('data-entry');
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
  const settleOrders = () => {
    const ordersToSettle = filteredOrders.filter(o => !o.settled);
    if (ordersToSettle.length === 0) return alert('لا يوجد طلبات جديدة للتقفيل.');
    const unsetStatuses = ordersToSettle.filter(o => !o.status);
    if (unsetStatuses.length > 0) return alert(`يوجد ${unsetStatuses.length} طلبات بدون حالة (موقف). يرجى تحديد حالة كل الطلبات قبل التقفيل.`);
    
    if (window.confirm(`هل تريد تقفيل ${ordersToSettle.length} طلب${selectedCompany !== 'الكل' ? ' لشركة ' + selectedCompany : ''}؟\n\nبعد التقفيل لن تتمكن من تعديل هذه الطلبات.`)) {
      const idsToSettle = new Set(ordersToSettle.map(o => o.id));
      setOrders(prev => prev.map(o => idsToSettle.has(o.id) ? { ...o, settled: true } : o));
    }
  };

  // Search & Filter
  const companiesDropdown = ['الكل', ...new Set([...merchants.map(m => m.name), ...orders.map(o => o.company)].filter(Boolean))];

  const filteredOrders = useMemo(() => {
    let result = orders;
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
  }, [orders, activeTab, selectedCompany, searchQuery, filterDateFrom, filterDateTo, showSettled]);

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
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return { totalCompanyNet, totalExpenses, netProfit: totalCompanyNet - totalExpenses };
  }, [orders, expenses]);

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
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const importedOrders = data.map(row => ({
          id: Math.random().toString(36).substr(2, 9),
          date: today(),
          sender: row['الراسل']?.toString() || '',
          code: row['الكود']?.toString() || '',
          customerName: (row['الاسم'] || row['اسم العميل'])?.toString() || '',
          center: (row['المنطقه'] || row['المركز'])?.toString() || '',
          phone: row['الرقم']?.toString() || '',
          count: Number(row['العدد']) || 1,
          total: Number(row['السعر'] || row['الإجمالي']) || 0,
          agent: row['المندوب']?.toString() || '',
          status: row['الموقف']?.toString() || '',
          collected: Number(row['المحصل']) || 0,
          commission: Number(row['العمولة']) || 20,
          returns: row['المرتجعات']?.toString() || '',
          notes: row['ملاحظات']?.toString() || '',
          company: row['الشركات']?.toString() || '',
          settled: false
        }));

        if (importedOrders.length > 0) {
          setOrders(prev => [...importedOrders, ...prev]);
          alert(`تم استيراد ${importedOrders.length} طلب بنجاح.`);
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
          <NavButton id="data-entry" icon={FileSpreadsheet} label="الطلبات والإدخال" />
          <NavButton id="company-summary" icon={BarChart3} label="تقفيل الشركات" />
          <div className="my-2 border-t border-white/5"></div>
          <NavButton id="merchants" icon={Store} label="التجار" />
          <NavButton id="agents" icon={UserCircle} label="المناديب" />
          <div className="my-2 border-t border-white/5"></div>
          <NavButton id="salaries" icon={WalletCards} label="المرتبات" />
          <NavButton id="expenses" icon={Receipt} label="الخزينة" />
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
          <p className="text-center text-[10px] text-white/20">البيانات محفوظة محلياً ✓</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col gap-5 max-h-screen overflow-y-auto w-full print:p-0 print:h-auto print:overflow-visible custom-scrollbar">
        
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              {activeTab === 'data-entry' && 'الطلبات والإدخال'}
              {activeTab === 'company-summary' && 'تقفيل الشركات'}
              {activeTab === 'merchants' && 'التجار والشركات'}
              {activeTab === 'agents' && 'المناديب'}
              {activeTab === 'salaries' && 'إدارة المرتبات'}
              {activeTab === 'expenses' && 'الخزينة والمصروفات'}
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
                <table className="w-full text-sm text-right print:text-xs">
                  <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-500 font-semibold sticky top-0 z-10">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-3.5 text-center w-12">#</th>
                      <th className="px-3 py-3.5">الشركة</th>
                      <th className="px-3 py-3.5">الاسم</th>
                      <th className="px-3 py-3.5">المنطقة</th>
                      <th className="px-3 py-3.5 text-center">الرقم</th>
                      <th className="px-3 py-3.5 text-center">السعر</th>
                      <th className="px-3 py-3.5">المندوب</th>
                      <th className="px-3 py-3.5 text-center">الموقف</th>
                      <th className="px-3 py-3.5 text-center">المحصل</th>
                      <th className="px-3 py-3.5 text-center font-bold text-indigo-600">الصافي</th>
                      <th className="px-3 py-3.5 text-center w-24 print:hidden">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="11" className="text-center py-20">
                        <div className="flex flex-col items-center gap-3">
                          <Package className="w-12 h-12 text-slate-200" />
                          <p className="text-slate-400 font-medium">لا توجد طلبات حالياً</p>
                          <button onClick={openAddModal} className="text-indigo-600 text-sm font-bold hover:underline">+ إضافة أول طلب</button>
                        </div>
                      </td></tr>
                    ) : filteredOrders.map((order, index) => {
                      const isCanceled = ['لاغي', 'رفض شحن'].includes(order.status);
                      return (
                        <tr key={order.id} onClick={() => openEditModal(order)} className={`border-b border-slate-100/80 cursor-pointer transition-all duration-150 ${isCanceled ? 'opacity-50' : ''} ${order.settled ? 'bg-emerald-50/30' : 'hover:bg-indigo-50/40'}`}>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs text-slate-400 font-mono">{index + 1}</span>
                            {order.settled && <Lock className="w-3 h-3 text-emerald-400 inline-block mr-1" />}
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-bold text-indigo-700 text-sm">{order.company || '—'}</span>
                            {order.sender && <span className="block text-[10px] text-slate-400 mt-0.5">{order.sender}</span>}
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-semibold text-slate-800">{order.customerName || '—'}</span>
                            {order.code && <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">#{order.code}</span>}
                          </td>
                          <td className="px-3 py-3 text-slate-600 text-xs">{order.center || '—'}</td>
                          <td className="px-3 py-3 text-center text-xs font-mono text-slate-500" dir="ltr">{order.phone || '—'}</td>
                          <td className="px-3 py-3 text-center font-bold text-slate-700">{Number(order.total).toLocaleString()}</td>
                          <td className="px-3 py-3 text-xs text-slate-600">{order.agent || '—'}</td>
                          <td className="px-3 py-3 text-center"><StatusBadge status={order.status} /></td>
                          <td className="px-3 py-3 text-center font-bold text-slate-700">{Number(order.collected).toLocaleString()}</td>
                          <td className="px-3 py-3 text-center font-extrabold text-indigo-700">{calculateNet(order.collected, order.commission).toLocaleString()}</td>
                          <td className="px-3 py-3 text-center print:hidden" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
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
                <table className="w-full text-sm text-right print:text-xs">
                  <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-500 font-semibold sticky top-0 z-10">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-3.5 text-center w-12">#</th>
                      <th className="px-3 py-3.5">الشركة</th>
                      <th className="px-3 py-3.5">الاسم</th>
                      <th className="px-3 py-3.5">المنطقة</th>
                      <th className="px-3 py-3.5 text-center">الرقم</th>
                      <th className="px-3 py-3.5 text-center">السعر</th>
                      <th className="px-3 py-3.5">المندوب</th>
                      <th className="px-3 py-3.5 text-center">الموقف</th>
                      <th className="px-3 py-3.5 text-center">المحصل</th>
                      <th className="px-3 py-3.5 text-center">العمولة</th>
                      <th className="px-3 py-3.5 text-center font-bold text-indigo-600">الصافي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="11" className="text-center py-24">
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
                        <tr key={order.id} className={`border-b border-slate-100/80 transition-colors ${isCanceled ? 'opacity-50' : ''} ${order.settled ? 'bg-emerald-50/20' : 'hover:bg-slate-50/50'}`}>
                          <td className="px-3 py-3 text-center text-xs text-slate-400 font-mono">{index + 1}</td>
                          <td className="px-3 py-3 font-bold text-indigo-700 text-sm">{order.company || '—'}</td>
                          <td className="px-3 py-3 font-semibold text-slate-800">{order.customerName}</td>
                          <td className="px-3 py-3 text-slate-600 text-xs">{order.center}</td>
                          <td className="px-3 py-3 text-center text-xs font-mono text-slate-500" dir="ltr">{order.phone}</td>
                          <td className="px-3 py-3 text-center font-bold text-slate-700">{Number(order.total).toLocaleString()}</td>
                          <td className="px-3 py-3 text-xs text-slate-600">{order.agent}</td>
                          <td className="px-3 py-3 text-center"><StatusBadge status={order.status} /></td>
                          <td className="px-3 py-3 text-center font-bold text-slate-700">{Number(order.collected).toLocaleString()}</td>
                          <td className="px-3 py-3 text-center text-slate-600">{order.commission}</td>
                          <td className="px-3 py-3 text-center font-extrabold text-indigo-700">{calculateNet(order.collected, order.commission).toLocaleString()}</td>
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1">
            <table className="w-full text-sm text-right">
              <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                <tr><th className="px-4 py-4 border-l w-16">م</th><th className="px-4 py-4 border-l">اسم التاجر / الشركة</th><th className="px-4 py-4 border-l">رقم الهاتف</th><th className="px-4 py-4 border-l min-w-[200px]">العنوان</th><th className="px-4 py-4 border-l w-32">سعر الشحن</th><th className="px-4 py-4 border-l w-24 text-center">إجراءات</th></tr>
              </thead>
              <tbody>
                {merchants.length === 0 ? <tr><td colSpan="5" className="text-center py-16 text-slate-400">لا يوجد تجار. اضغط "إضافة تاجر"</td></tr> : 
                 merchants.map((m, i) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 border-l font-bold text-slate-800">{m.name || '—'}</td>
                    <td className="px-4 py-3 border-l text-slate-600" dir="ltr">{m.phone || '—'}</td>
                    <td className="px-4 py-3 border-l text-slate-600">{m.address || '—'}</td>
                    <td className="px-4 py-3 border-l text-center font-bold text-slate-700">{Number(m.rate || 0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-center border-l">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setActiveMerchantModal({ isOpen: true, data: m })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem('merchants', m.id, 'مسح هذا التاجر؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ============ AGENTS ============ */}
        {activeTab === 'agents' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1">
            <table className="w-full text-sm text-right">
              <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                <tr><th className="px-4 py-4 border-l w-16">م</th><th className="px-4 py-4 border-l">اسم المندوب</th><th className="px-4 py-4 border-l">رقم الهاتف</th><th className="px-4 py-4 border-l">خط السير / المنطقة</th><th className="px-4 py-4 border-l">المركبة</th><th className="px-4 py-4 border-l w-24 text-center">إجراءات</th></tr>
              </thead>
              <tbody>
                {agents.length === 0 ? <tr><td colSpan="5" className="text-center py-16 text-slate-400">لا يوجد مناديب. اضغط "إضافة مندوب"</td></tr> : 
                 agents.map((a, i) => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 border-l font-bold text-slate-800">{a.name || '—'}</td>
                    <td className="px-4 py-3 border-l text-slate-600" dir="ltr">{a.phone || '—'}</td>
                    <td className="px-4 py-3 border-l text-slate-600">{a.zone || '—'}</td>
                    <td className="px-4 py-3 border-l text-slate-500">{a.vehicle || '—'}</td>
                    <td className="px-3 py-3 text-center border-l">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setActiveAgentModal({ isOpen: true, data: a })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem('agents', a.id, 'مسح هذا المندوب؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ============ EXPENSES ============ */}
        {activeTab === 'expenses' && (
          <div className="flex flex-col gap-5 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-emerald-500" /></div>
                  <span className="text-sm font-semibold text-slate-500">أرباح الشحنات</span>
                </div>
                <p className="text-3xl font-black text-slate-800">{companyProfits.totalCompanyNet.toLocaleString()} <span className="text-sm font-normal text-slate-400">ج.م</span></p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><ArrowDownRight className="w-4 h-4 text-red-500" /></div>
                  <span className="text-sm font-semibold text-red-400">إجمالي المصروفات</span>
                </div>
                <p className="text-3xl font-black text-red-600">{companyProfits.totalExpenses.toLocaleString()} <span className="text-sm font-normal text-red-400">ج.م</span></p>
              </div>
              <div className={`rounded-2xl p-5 shadow-lg border relative overflow-hidden ${companyProfits.netProfit >= 0 ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white border-indigo-400/20' : 'bg-gradient-to-br from-red-600 to-rose-700 text-white border-red-400/20'}`}>
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-12 -translate-y-12"></div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-white" /></div>
                  <span className="text-sm font-semibold text-white/70">صافي الربح</span>
                </div>
                <p className="text-3xl font-black">{companyProfits.netProfit.toLocaleString()} <span className="text-sm font-normal opacity-70">ج.م</span></p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-4 bg-slate-50/50 border-b border-slate-200"><h3 className="font-bold text-slate-700 text-sm">سجل المصروفات</h3></div>
              <table className="w-full text-sm text-right">
                <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                  <tr><th className="px-4 py-3.5 border-l w-16">م</th><th className="px-4 py-3.5 border-l w-40">التاريخ</th><th className="px-4 py-3.5 border-l w-40">المبلغ (ج.م)</th><th className="px-4 py-3.5 border-l">البيان / ملاحظات</th><th className="px-4 py-3.5 border-l w-24 text-center">إجراءات</th></tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? <tr><td colSpan="4" className="text-center py-16 text-slate-400">لا يوجد مصروفات مسجلة</td></tr> : 
                   expenses.map((exp, i) => (
                    <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 font-mono">{i + 1}</td>
                      <td className="px-4 py-3 border-l font-mono text-sm">{exp.date}</td>
                      <td className="px-4 py-3 border-l font-bold text-red-600 text-center">{Number(exp.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 border-l text-slate-600">{exp.notes || '—'}</td>
                      <td className="px-3 py-3 text-center border-l">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setActiveExpenseModal({ isOpen: true, data: exp })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => deleteArrayItem('expenses', exp.id, 'مسح هذا المصروف؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============ SALARIES ============ */}
        {activeTab === 'salaries' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 border-l w-16 text-center">م</th>
                    <th className="px-4 py-3.5 border-l min-w-[200px]">اسم الموظف</th>
                    <th className="px-4 py-3.5 border-l text-center">الأوردرات</th>
                    <th className="px-4 py-3.5 border-l text-center text-emerald-600">عمولات</th>
                    <th className="px-4 py-3.5 border-l text-center">الراتب الأساسي</th>
                    <th className="px-4 py-3.5 border-l text-center text-red-500">خصومات</th>
                    <th className="px-4 py-3.5 border-l text-center text-amber-600">سلف</th>
                    <th className="px-4 py-3.5 text-center text-indigo-700 font-bold">الصافي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeesList.length === 0 ? <tr><td colSpan="8" className="text-center py-16 text-slate-400">لا يوجد موظفين. اضغط "إضافة موظف"</td></tr> : 
                   employeesList.map((emp, index) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-4 border-l text-center text-slate-400 relative"><button onClick={() => deleteArrayItem(setEmployees, emp.id, 'مسح هذا الموظف؟')} className="absolute right-2 top-4 text-red-300 hover:text-red-600 hidden group-hover:block"><Trash2 className="w-4 h-4"/></button><span>{index + 1}</span></td>
                      <td className="px-2 border-l p-2"><input list="agents-list" type="text" value={emp.name} onChange={e => handleArrayChange(setEmployees, emp.id, 'name', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 px-3 py-2 outline-none focus:bg-white rounded-lg font-bold text-slate-800 transition-colors" placeholder="اسم الموظف" /></td>
                      <td className="px-4 py-4 border-l text-center font-medium text-slate-600">{emp.ordersCount > 0 ? emp.ordersCount : '—'}</td>
                      <td className="px-4 py-4 border-l text-center font-bold text-emerald-600">{emp.totalCommissions > 0 ? emp.totalCommissions.toLocaleString() : '—'}</td>
                      <td className="px-2 border-l p-2 text-center"><input type="number" value={emp.baseSalary || ''} onChange={e => handleArrayChange(setEmployees, emp.id, 'baseSalary', e.target.value)} className="w-full max-w-[100px] bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 px-3 py-2 outline-none focus:bg-white rounded-lg text-center transition-colors" placeholder="0" /></td>
                      <td className="px-2 border-l p-2 text-center"><input type="number" value={emp.deductions || ''} onChange={e => handleArrayChange(setEmployees, emp.id, 'deductions', e.target.value)} className="w-full max-w-[100px] bg-transparent border border-transparent hover:border-red-200 focus:border-red-300 text-red-600 px-3 py-2 outline-none focus:bg-white rounded-lg text-center transition-colors" placeholder="0" /></td>
                      <td className="px-2 border-l p-2 text-center"><input type="number" value={emp.advances || ''} onChange={e => handleArrayChange(setEmployees, emp.id, 'advances', e.target.value)} className="w-full max-w-[100px] bg-transparent border border-transparent hover:border-amber-200 focus:border-amber-300 text-amber-600 px-3 py-2 outline-none focus:bg-white rounded-lg text-center transition-colors" placeholder="0" /></td>
                      <td className="px-4 py-4 text-center font-black text-xl text-indigo-700">{emp.netSalary.toLocaleString()} <span className="text-xs font-medium text-indigo-400">ج.م</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
