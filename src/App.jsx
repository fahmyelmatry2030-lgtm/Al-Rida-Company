import React, { useState, useMemo, useEffect } from 'react';
import { Package, Users, Truck, FileSpreadsheet, Plus, Filter, ChevronDown, WalletCards, Printer, Download, Trash2, Search, Store, UserCircle, Receipt, CheckCircle, Lock, Calendar, MonitorSmartphone } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const STATUS_OPTIONS = [
  { label: 'تم التسليم', value: 'تم التسليم', color: 'bg-green-100 text-green-800 border-green-200' },
  { label: 'جزئي', value: 'جزئي', color: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'لاغي', value: 'لاغي', color: 'bg-red-100 text-red-800 border-red-200' },
  { label: 'مؤجل', value: 'مؤجل', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { label: 'نزول', value: 'نزول', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { label: 'بدون شحن', value: 'بدون شحن', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { label: 'رفض شحن', value: 'رفض شحن', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { label: 'غير متاح', value: 'غير متاح', color: 'bg-slate-200 text-slate-800 border-slate-300' },
  { label: 'عدم رد', value: 'عدم رد', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { label: 'تهرب', value: 'تهرب', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { label: 'اوت زون', value: 'اوت زون', color: 'bg-teal-100 text-teal-800 border-teal-200' },
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
  const [showSettled, setShowSettled] = useState(false); // show old settled orders
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

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
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('shipping_orders');
    if (saved) {
      // Migrate old orders to have date + settled fields
      return JSON.parse(saved).map(o => ({ ...o, date: o.date || today(), settled: o.settled || false }));
    }
    return INITIAL_ORDERS;
  });

  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('shipping_employees');
    if (saved) return JSON.parse(saved);
    const oldSaved = localStorage.getItem('shipping_salaries');
    if (oldSaved) {
       return Object.entries(JSON.parse(oldSaved)).map(([name, data], i) => ({
         id: i.toString(), name, baseSalary: data.baseSalary || 0, deductions: data.deductions || 0, advances: data.advances || 0
       }));
    }
    return [];
  });

  const [merchants, setMerchants] = useState(() => JSON.parse(localStorage.getItem('shipping_merchants') || '[]'));
  const [agents, setAgents] = useState(() => JSON.parse(localStorage.getItem('shipping_agents') || '[]'));
  const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem('shipping_expenses') || '[]'));

  // Save to LocalStorage
  useEffect(() => localStorage.setItem('shipping_orders', JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem('shipping_employees', JSON.stringify(employees)), [employees]);
  useEffect(() => localStorage.setItem('shipping_merchants', JSON.stringify(merchants)), [merchants]);
  useEffect(() => localStorage.setItem('shipping_agents', JSON.stringify(agents)), [agents]);
  useEffect(() => localStorage.setItem('shipping_expenses', JSON.stringify(expenses)), [expenses]);

  const calculateNet = (collected, commission) => (Number(collected) || 0) - (Number(commission) || 0);

  // --- Orders Logic ---
  const handleOrderChange = (id, field, value) => {
    setOrders(prev => prev.map(order => {
      if (order.id === id) {
        if (order.settled && field !== 'settled') return order; // Prevent editing settled orders
        let updatedOrder = { ...order, [field]: value };
        if (field === 'status') {
          const zeroCollectedStatuses = ['لاغي', 'غير متاح', 'عدم رد', 'بدون شحن', 'تهرب', 'مؤجل', 'رفض شحن'];
          if (zeroCollectedStatuses.includes(value)) updatedOrder.collected = 0;
          else if (['تم التسليم', 'اوت زون', 'نزول'].includes(value)) updatedOrder.collected = updatedOrder.total;
        }
        return updatedOrder;
      }
      return order;
    }));
  };

  const addRow = () => {
    setOrders([{
      id: Math.random().toString(36).substr(2, 9), date: today(), sender: '', code: '', customerName: '', center: '', phone: '', count: 1, total: 0, agent: '', status: '', collected: 0, commission: 20, returns: '', notes: '', company: '', settled: false
    }, ...orders]);
  };

  const deleteRow = (id) => {
    const order = orders.find(o => o.id === id);
    if (order?.settled) return alert('لا يمكن حذف طلب تم تقفيله.');
    window.confirm('هل أنت متأكد من مسح هذا الطلب؟') && setOrders(prev => prev.filter(o => o.id !== id));
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

  // Available dates for filter
  const availableDates = useMemo(() => [...new Set(orders.map(o => o.date).filter(Boolean))].sort().reverse(), [orders]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    
    // In company-summary, filter by company
    if (activeTab === 'company-summary' && selectedCompany !== 'الكل') {
      result = result.filter(o => o.company === selectedCompany);
    }
    
    // In company-summary, filter by date range
    if (activeTab === 'company-summary') {
      if (filterDateFrom) result = result.filter(o => o.date >= filterDateFrom);
      if (filterDateTo) result = result.filter(o => o.date <= filterDateTo);
    }
    
    // In company-summary, filter settled vs unsettled
    if (activeTab === 'company-summary' && !showSettled) {
      result = result.filter(o => !o.settled);
    }

    // In data-entry, only show unsettled (active) orders
    if (activeTab === 'data-entry') {
      result = result.filter(o => !o.settled);
    }
    
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => 
        (o.code && o.code.toLowerCase().includes(q)) ||
        (o.phone && o.phone.includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q))
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
      // Count statuses
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
  const addArrayItem = (setter, emptyItem) => setter(prev => [{ id: Math.random().toString(36).substr(2, 9), ...emptyItem }, ...prev]);
  const deleteArrayItem = (setter, id, msg) => { if(window.confirm(msg)) setter(prev => prev.filter(item => item.id !== id)); };
  const handleArrayChange = (setter, id, field, value) => setter(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));

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
    saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), activeTab === 'company-summary' ? `كشف_حساب_${selectedCompany}_${filterDate}.xlsx` : `الطلبات.xlsx`);
  };

  const NavButton = ({ id, icon: Icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === id ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-800/50'}`}>
      <Icon className="w-5 h-5" /> <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans" dir="rtl">
      <datalist id="merchants-list">{merchants.map(m => <option key={m.id} value={m.name} />)}</datalist>
      <datalist id="agents-list">{agents.map(a => <option key={a.id} value={a.name} />)}</datalist>

      {/* Sidebar */}
      <aside className="w-64 bg-indigo-900 text-white flex flex-col shadow-xl z-20 sticky top-0 h-screen print:hidden overflow-y-auto custom-scrollbar">
        <div className="p-6 flex items-center gap-3 border-b border-indigo-800 shrink-0">
          <Truck className="w-8 h-8 text-indigo-400" />
          <div><h1 className="text-xl font-bold">شركة الرضا</h1><span className="text-indigo-300 text-xs">نظام إدارة الشحن</span></div>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <NavButton id="data-entry" icon={FileSpreadsheet} label="الطلبات والإدخال" />
          <NavButton id="company-summary" icon={Users} label="تقفيل الشركات" />
          <div className="my-2 border-t border-indigo-800"></div>
          <NavButton id="merchants" icon={Store} label="قاعدة بيانات التجار" />
          <NavButton id="agents" icon={UserCircle} label="قاعدة بيانات المناديب" />
          <div className="my-2 border-t border-indigo-800"></div>
          <NavButton id="salaries" icon={WalletCards} label="مرتبات الموظفين" />
          <NavButton id="expenses" icon={Receipt} label="الخزينة والمصروفات" />
        </nav>
        <div className="p-4 border-t border-indigo-800 shrink-0 flex flex-col gap-3">
          {!isInstalled && installPrompt && (
            <button onClick={handleInstall} className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-900/30 text-sm w-full">
              <MonitorSmartphone className="w-5 h-5" /> تثبيت التطبيق
            </button>
          )}
          {isInstalled && (
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> تم تثبيت التطبيق
            </div>
          )}
          <p className="text-center text-xs text-indigo-400">تم الحفظ محلياً ✓</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col gap-6 max-h-screen overflow-y-auto w-full print:p-0 print:h-auto print:overflow-visible custom-scrollbar">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-200 print:hidden gap-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {activeTab === 'data-entry' && <><FileSpreadsheet className="text-indigo-600"/> الطلبات</>}
            {activeTab === 'company-summary' && <><Users className="text-indigo-600"/> تقفيل الشركات</>}
            {activeTab === 'merchants' && <><Store className="text-indigo-600"/> التجار والشركات</>}
            {activeTab === 'agents' && <><UserCircle className="text-indigo-600"/> المناديب</>}
            {activeTab === 'salaries' && <><WalletCards className="text-indigo-600"/> إدارة مرتبات الموظفين</>}
            {activeTab === 'expenses' && <><Receipt className="text-indigo-600"/> الخزينة والمصروفات والأرباح</>}
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            {(activeTab === 'data-entry' || activeTab === 'company-summary') && (
              <div className="relative">
                <Search className="w-5 h-5 absolute right-3 top-2.5 text-slate-400" />
                <input type="text" placeholder="بحث بالكود / الرقم / الاسم..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="pl-4 pr-10 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-56 text-sm" />
              </div>
            )}

            {activeTab === 'data-entry' && (
               <button onClick={addRow} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 transition-all active:scale-95">
                 <Plus className="w-5 h-5" /> إضافة طلب
               </button>
            )}
            {activeTab === 'merchants' && (
               <button onClick={() => addArrayItem(setMerchants, { name: '', phone: '', address: '', rate: 0 })} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 transition-all active:scale-95">
                 <Plus className="w-5 h-5" /> إضافة تاجر
               </button>
            )}
            {activeTab === 'agents' && (
               <button onClick={() => addArrayItem(setAgents, { name: '', phone: '', zone: '', vehicle: '' })} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 transition-all active:scale-95">
                 <Plus className="w-5 h-5" /> إضافة مندوب
               </button>
            )}
            {activeTab === 'expenses' && (
               <button onClick={() => addArrayItem(setExpenses, { date: today(), amount: 0, notes: '' })} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 transition-all active:scale-95">
                 <Plus className="w-5 h-5" /> إضافة مصروف
               </button>
            )}
            {activeTab === 'salaries' && (
               <button onClick={() => addArrayItem(setEmployees, { name: '', baseSalary: 0, deductions: 0, advances: 0 })} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 transition-all active:scale-95">
                 <Plus className="w-5 h-5" /> إضافة موظف
               </button>
            )}

            {activeTab === 'company-summary' && (
              <>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none text-sm">
                    {companiesDropdown.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">من:</span>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 outline-none text-sm" />
                  <span className="text-sm font-medium text-slate-500">إلى:</span>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 outline-none text-sm" />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
                  <input type="checkbox" checked={showSettled} onChange={e => setShowSettled(e.target.checked)} className="rounded border-slate-300" />
                  عرض المقفّل
                </label>
              </>
            )}

            {(activeTab === 'company-summary' || activeTab === 'data-entry') && (
              <button onClick={exportOrdersToExcel} className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-4 py-2.5 rounded-xl font-medium text-sm">
                <Download className="w-4 h-4" /> Excel
              </button>
            )}
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-medium text-sm">
              <Printer className="w-4 h-4" /> طباعة
            </button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-6">
           <h1 className="text-3xl font-bold mb-2">
             {activeTab === 'company-summary' ? (selectedCompany === 'الكل' ? `كشف حساب الشحنات - ${filterDate}` : `كشف حساب شركة: ${selectedCompany} - ${filterDate}`) : ''}
             {activeTab === 'data-entry' ? 'سجل الطلبات والشحنات' : ''}
           </h1>
           <p className="text-gray-500">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>

        {/* --- Orders / Company Summary --- */}
        {(activeTab === 'data-entry' || activeTab === 'company-summary') && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col print:border-none print:shadow-none">
            {activeTab === 'company-summary' && (
              <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap gap-6 items-center px-6 print:bg-white print:border-gray-800 print:border-2 print:rounded-lg print:mb-4">
                <div><span className="block text-xs text-slate-500 mb-1 print:font-bold">عدد الطلبات</span><span className="block text-2xl font-bold text-slate-700">{summaryStats.totalOrders}</span></div>
                <div className="w-px h-12 bg-slate-300"></div>
                <div><span className="block text-xs text-slate-500 mb-1">تم التسليم</span><span className="block text-xl font-bold text-green-600">{summaryStats.delivered}</span></div>
                <div><span className="block text-xs text-slate-500 mb-1">ملغي/مرفوض</span><span className="block text-xl font-bold text-red-500">{summaryStats.cancelled}</span></div>
                <div><span className="block text-xs text-slate-500 mb-1">معلّق</span><span className="block text-xl font-bold text-orange-500">{summaryStats.pending}</span></div>
                <div className="w-px h-12 bg-slate-300"></div>
                <div><span className="block text-xs text-slate-500 mb-1">إجمالي المحصل</span><span className="block text-2xl font-bold text-green-600">{summaryStats.totalCollected} ج.م</span></div>
                <div><span className="block text-xs text-slate-500 mb-1">العمولات</span><span className="block text-xl font-bold text-slate-600">{summaryStats.totalCommission} ج.م</span></div>
                <div className="w-px h-12 bg-slate-300"></div>
                <div><span className="block text-xs text-slate-500 mb-1 font-bold">الصافي المستحق للتاجر</span><span className="block text-3xl font-black text-indigo-600">{summaryStats.totalNet} ج.م</span></div>
                
                {/* Settlement Button */}
                {hasUnsettledInView && (
                  <div className="mr-auto">
                    <button onClick={settleOrders} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 text-base">
                      <CheckCircle className="w-5 h-5" /> تقفيل الحساب ✓
                    </button>
                  </div>
                )}
                {!hasUnsettledInView && filteredOrders.length > 0 && (
                  <div className="mr-auto flex items-center gap-2 text-emerald-600 font-bold">
                    <Lock className="w-5 h-5" /> تم التقفيل ✓
                  </div>
                )}
              </div>
            )}
            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-sm text-right print:text-xs min-w-[1300px]">
                <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10 print:bg-gray-200">
                  <tr>
                    <th className="px-2 py-3 border border-slate-200 w-10 text-center">م</th>
                    <th className="px-2 py-3 border border-slate-200 w-28">التاريخ</th>
                    <th className="px-2 py-3 border border-slate-200">الراسل</th>
                    <th className="px-2 py-3 border border-slate-200 w-24">الكود</th>
                    <th className="px-2 py-3 border border-slate-200 min-w-[130px]">الاسم</th>
                    <th className="px-2 py-3 border border-slate-200 min-w-[90px]">المنطقه</th>
                    <th className="px-2 py-3 border border-slate-200 w-28">الرقم</th>
                    <th className="px-2 py-3 border border-slate-200 w-14 text-center">العدد</th>
                    <th className="px-2 py-3 border border-slate-200 w-20 text-center">السعر</th>
                    <th className="px-2 py-3 border border-slate-200 min-w-[110px]">المندوب</th>
                    <th className="px-2 py-3 border border-slate-200 min-w-[120px]">الموقف</th>
                    <th className="px-2 py-3 border border-slate-200 w-20 text-center">المحصل</th>
                    <th className="px-2 py-3 border border-slate-200 w-20 text-center">العمولة</th>
                    <th className="px-2 py-3 border border-slate-200 w-20 text-center bg-indigo-50">الصافي</th>
                    <th className="px-2 py-3 border border-slate-200 w-20 text-center">المرتجعات</th>
                    <th className="px-2 py-3 border border-slate-200 min-w-[120px]">ملاحظات</th>
                    <th className="px-2 py-3 border border-slate-200 min-w-[120px]">الشركات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? <tr><td colSpan="17" className="text-center py-12 text-slate-500">لا يوجد بيانات للعرض.</td></tr> : 
                   filteredOrders.map((order, index) => {
                    const isCanceled = ['لاغي', 'رفض شحن'].includes(order.status);
                    const isSettled = order.settled;
                    return (
                      <tr key={order.id} className={`transition-colors group ${isCanceled ? 'opacity-60 bg-red-50/10' : ''} ${isSettled ? 'bg-emerald-50/30' : 'hover:bg-slate-50/80'} print:opacity-100 print:bg-transparent`}>
                        <td className="px-1 py-1 border border-slate-100 text-center relative print:border-gray-400">
                          {!isSettled && activeTab === 'data-entry' && <button onClick={() => deleteRow(order.id)} className="absolute right-0.5 top-2 text-red-300 hover:text-red-600 print:hidden"><Trash2 className="w-3.5 h-3.5"/></button>}
                          {isSettled && <Lock className="w-3 h-3 text-emerald-400 absolute right-1 top-3 print:hidden" />}
                          <span className="text-xs text-slate-400">{index + 1}</span>
                        </td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400">
                          <input type="date" value={order.date || ''} onChange={e => handleOrderChange(order.id, 'date', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-1 py-2 outline-none text-xs font-mono ${isSettled ? 'cursor-not-allowed text-slate-400' : ''} print:p-0`} />
                        </td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400">
                          <input type="text" value={order.sender} onChange={e => handleOrderChange(order.id, 'sender', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-2 py-2 outline-none ${isSettled ? 'cursor-not-allowed' : 'focus:bg-white'} print:p-0`} />
                        </td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400"><input type="text" value={order.code} onChange={e => handleOrderChange(order.id, 'code', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-2 py-2 outline-none ${isSettled ? 'cursor-not-allowed' : 'focus:bg-white'} print:p-0`} /></td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400"><input type="text" value={order.customerName} onChange={e => handleOrderChange(order.id, 'customerName', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-2 py-2 outline-none font-medium ${isSettled ? 'cursor-not-allowed' : 'focus:bg-white'} print:p-0`} /></td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400"><input type="text" value={order.center} onChange={e => handleOrderChange(order.id, 'center', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-2 py-2 outline-none ${isSettled ? 'cursor-not-allowed' : 'focus:bg-white'} print:p-0`} /></td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400"><input type="text" value={order.phone} onChange={e => handleOrderChange(order.id, 'phone', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-2 py-2 outline-none text-left ${isSettled ? 'cursor-not-allowed' : 'focus:bg-white'} print:p-0`} dir="ltr" /></td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400"><input type="number" value={order.count} onChange={e => handleOrderChange(order.id, 'count', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-1 py-2 outline-none text-center ${isSettled ? 'cursor-not-allowed' : ''} print:p-0`} /></td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400"><input type="number" value={order.total} onChange={e => handleOrderChange(order.id, 'total', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-1 py-2 outline-none text-center font-medium ${isSettled ? 'cursor-not-allowed' : ''} print:p-0`} /></td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400">
                          <input list="agents-list" type="text" value={order.agent} onChange={e => handleOrderChange(order.id, 'agent', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-2 py-2 outline-none text-center ${isSettled ? 'cursor-not-allowed' : 'focus:bg-white'} print:p-0`} />
                        </td>
                        <td className="px-1 border border-slate-100 p-1 relative print:border-gray-400">
                          <select value={order.status} onChange={e => handleOrderChange(order.id, 'status', e.target.value)} disabled={isSettled} className={`w-full appearance-none border rounded-lg px-2 py-1.5 outline-none font-medium text-xs ${STATUS_OPTIONS.find(o => o.value === order.status)?.color || 'bg-slate-50 text-slate-600 border-slate-200'} ${isSettled ? 'cursor-not-allowed' : ''} print:appearance-auto print:border-none print:p-0 print:bg-transparent print:text-black`}>
                            <option value="">الحالة</option>{STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                          {!isSettled && <ChevronDown className="w-3 h-3 absolute left-2 top-3 opacity-50 pointer-events-none print:hidden" />}
                        </td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400"><input type="number" value={order.collected} onChange={e => handleOrderChange(order.id, 'collected', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-1 py-2 outline-none text-center font-bold ${Number(order.collected) === 0 && order.status && order.status !== 'تم التسليم' ? 'text-slate-400' : 'text-slate-900'} ${isSettled ? 'cursor-not-allowed' : ''} print:p-0`} /></td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400"><input type="number" value={order.commission} onChange={e => handleOrderChange(order.id, 'commission', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-1 py-2 outline-none text-center text-slate-600 ${isSettled ? 'cursor-not-allowed' : ''} print:p-0`} /></td>
                        <td className="px-2 py-2 border border-slate-100 text-center font-bold bg-indigo-50/40 text-indigo-700 print:bg-transparent print:text-black text-sm">{calculateNet(order.collected, order.commission)}</td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400"><input type="text" value={order.returns} onChange={e => handleOrderChange(order.id, 'returns', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-1 py-2 outline-none text-center ${isSettled ? 'cursor-not-allowed' : ''} print:p-0`} /></td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400"><input type="text" value={order.notes} onChange={e => handleOrderChange(order.id, 'notes', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-2 py-2 outline-none text-slate-500 text-xs ${isSettled ? 'cursor-not-allowed' : ''} print:p-0`} placeholder="ملاحظة..." /></td>
                        <td className="px-1 border border-slate-100 p-0 print:border-gray-400">
                          <input list="merchants-list" type="text" value={order.company || ''} onChange={e => handleOrderChange(order.id, 'company', e.target.value)} disabled={isSettled} className={`w-full bg-transparent px-2 py-2 outline-none font-bold text-indigo-700 ${isSettled ? 'cursor-not-allowed' : 'focus:bg-white'} print:p-0`} placeholder="الشركة..." />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- Merchants --- */}
        {activeTab === 'merchants' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr><th className="px-4 py-4 border-l w-16">م</th><th className="px-4 py-4 border-l">اسم التاجر / الشركة</th><th className="px-4 py-4 border-l">رقم الهاتف</th><th className="px-4 py-4 border-l min-w-[200px]">العنوان</th><th className="px-4 py-4 border-l w-32">سعر الشحن</th></tr>
              </thead>
              <tbody>
                {merchants.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-500">لا يوجد تجار حالياً.</td></tr> : 
                 merchants.map((m, i) => (
                  <tr key={m.id} className="border-b border-slate-50 relative group hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-400 relative"><button onClick={() => deleteArrayItem(setMerchants, m.id, 'مسح هذا التاجر؟')} className="absolute right-2 top-3.5 text-red-300 hover:text-red-600 hidden group-hover:block"><Trash2 className="w-4 h-4"/></button><span>{i + 1}</span></td>
                    <td className="px-2 border-l"><input type="text" value={m.name} onChange={e => handleArrayChange(setMerchants, m.id, 'name', e.target.value)} className="w-full px-2 py-2 outline-none font-bold text-slate-800 bg-transparent" placeholder="اسم التاجر" /></td>
                    <td className="px-2 border-l"><input type="text" value={m.phone} onChange={e => handleArrayChange(setMerchants, m.id, 'phone', e.target.value)} className="w-full px-2 py-2 outline-none bg-transparent" placeholder="01xxxxxxxxx" /></td>
                    <td className="px-2 border-l"><input type="text" value={m.address} onChange={e => handleArrayChange(setMerchants, m.id, 'address', e.target.value)} className="w-full px-2 py-2 outline-none bg-transparent" placeholder="العنوان" /></td>
                    <td className="px-2 border-l"><input type="number" value={m.rate || ''} onChange={e => handleArrayChange(setMerchants, m.id, 'rate', e.target.value)} className="w-full px-2 py-2 outline-none text-center bg-transparent" placeholder="0" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- Agents --- */}
        {activeTab === 'agents' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr><th className="px-4 py-4 border-l w-16">م</th><th className="px-4 py-4 border-l">اسم المندوب</th><th className="px-4 py-4 border-l">رقم الهاتف</th><th className="px-4 py-4 border-l">خط السير / المنطقة</th><th className="px-4 py-4 border-l">المركبة</th></tr>
              </thead>
              <tbody>
                {agents.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-500">لا يوجد مناديب حالياً.</td></tr> : 
                 agents.map((a, i) => (
                  <tr key={a.id} className="border-b border-slate-50 relative group hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-400 relative"><button onClick={() => deleteArrayItem(setAgents, a.id, 'مسح هذا المندوب؟')} className="absolute right-2 top-3.5 text-red-300 hover:text-red-600 hidden group-hover:block"><Trash2 className="w-4 h-4"/></button><span>{i + 1}</span></td>
                    <td className="px-2 border-l"><input type="text" value={a.name} onChange={e => handleArrayChange(setAgents, a.id, 'name', e.target.value)} className="w-full px-2 py-2 outline-none font-bold text-slate-800 bg-transparent" placeholder="اسم المندوب" /></td>
                    <td className="px-2 border-l"><input type="text" value={a.phone} onChange={e => handleArrayChange(setAgents, a.id, 'phone', e.target.value)} className="w-full px-2 py-2 outline-none bg-transparent" placeholder="رقم الهاتف" /></td>
                    <td className="px-2 border-l"><input type="text" value={a.zone} onChange={e => handleArrayChange(setAgents, a.id, 'zone', e.target.value)} className="w-full px-2 py-2 outline-none bg-transparent" placeholder="المنطقة" /></td>
                    <td className="px-2 border-l"><input type="text" value={a.vehicle} onChange={e => handleArrayChange(setAgents, a.id, 'vehicle', e.target.value)} className="w-full px-2 py-2 outline-none bg-transparent text-slate-500" placeholder="موتوسيكل / سيارة" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- Expenses & Profits --- */}
        {activeTab === 'expenses' && (
          <div className="flex flex-col gap-6 flex-1">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-slate-500 font-medium mb-2">إجمالي الأرباح من الشحنات</h3>
                <p className="text-3xl font-bold text-slate-800">{companyProfits.totalCompanyNet} <span className="text-sm font-normal text-slate-500">ج.م</span></p>
                <p className="text-xs text-slate-400 mt-2">بعد خصم عمولات المناديب.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
                <h3 className="text-red-500 font-medium mb-2">إجمالي المصروفات</h3>
                <p className="text-3xl font-bold text-red-600">{companyProfits.totalExpenses} <span className="text-sm font-normal text-red-400">ج.م</span></p>
                <p className="text-xs text-slate-400 mt-2">مرتبات، إيجار، بنزين، الخ.</p>
              </div>
              <div className={`rounded-2xl p-6 shadow-sm border ${companyProfits.netProfit >= 0 ? 'bg-gradient-to-l from-indigo-600 to-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                <h3 className="text-white/80 font-medium mb-2">صافي ربح الشركة</h3>
                <p className="text-4xl font-black">{companyProfits.netProfit} <span className="text-sm font-normal opacity-80">ج.م</span></p>
                <p className="text-xs text-white/60 mt-2">الأرباح - المصروفات.</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-bold text-slate-800">سجل المصروفات</h3></div>
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr><th className="px-4 py-4 border-l w-16">م</th><th className="px-4 py-4 border-l w-40">التاريخ</th><th className="px-4 py-4 border-l w-40">المبلغ (ج.م)</th><th className="px-4 py-4 border-l">البيان / ملاحظات</th></tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? <tr><td colSpan="4" className="text-center py-10 text-slate-500">لا يوجد مصروفات مسجلة.</td></tr> : 
                   expenses.map((exp, i) => (
                    <tr key={exp.id} className="border-b border-slate-50 relative group hover:bg-slate-50">
                      <td className="px-4 py-3 text-center text-slate-400 relative"><button onClick={() => deleteArrayItem(setExpenses, exp.id, 'مسح هذا المصروف؟')} className="absolute right-2 top-3.5 text-red-300 hover:text-red-600 hidden group-hover:block"><Trash2 className="w-4 h-4"/></button><span>{i + 1}</span></td>
                      <td className="px-2 border-l"><input type="date" value={exp.date} onChange={e => handleArrayChange(setExpenses, exp.id, 'date', e.target.value)} className="w-full px-2 py-2 outline-none bg-transparent font-mono text-sm" /></td>
                      <td className="px-2 border-l"><input type="number" value={exp.amount || ''} onChange={e => handleArrayChange(setExpenses, exp.id, 'amount', e.target.value)} className="w-full px-2 py-2 outline-none font-bold text-red-600 bg-transparent text-center" placeholder="0" /></td>
                      <td className="px-2 border-l"><input type="text" value={exp.notes} onChange={e => handleArrayChange(setExpenses, exp.id, 'notes', e.target.value)} className="w-full px-2 py-2 outline-none bg-transparent" placeholder="إيجار، كهرباء، بوفيه..." /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- Salaries --- */}
        {activeTab === 'salaries' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-4 border-l w-16 text-center">م</th>
                    <th className="px-4 py-4 border-l min-w-[200px]">اسم الموظف</th>
                    <th className="px-4 py-4 border-l text-center">الأوردرات</th>
                    <th className="px-4 py-4 border-l text-center text-green-700 bg-green-50">عمولات</th>
                    <th className="px-4 py-4 border-l text-center">الراتب الأساسي</th>
                    <th className="px-4 py-4 border-l text-center text-red-600">خصومات</th>
                    <th className="px-4 py-4 border-l text-center text-orange-600">سلف</th>
                    <th className="px-4 py-4 text-center text-indigo-700 bg-indigo-50 text-lg">الصافي المستحق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeesList.length === 0 ? <tr><td colSpan="8" className="text-center py-16 text-slate-500">لا يوجد موظفين. اضغط "إضافة موظف".</td></tr> : 
                   employeesList.map((emp, index) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-4 border-l text-center text-slate-400 relative"><button onClick={() => deleteArrayItem(setEmployees, emp.id, 'مسح هذا الموظف؟')} className="absolute right-2 top-4 text-red-300 hover:text-red-600 hidden group-hover:block"><Trash2 className="w-4 h-4"/></button><span>{index + 1}</span></td>
                      <td className="px-2 border-l p-2"><input list="agents-list" type="text" value={emp.name} onChange={e => handleArrayChange(setEmployees, emp.id, 'name', e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 outline-none focus:bg-white rounded-lg font-bold text-slate-800" placeholder="اسم الموظف" /></td>
                      <td className="px-4 py-4 border-l text-center font-medium text-slate-600">{emp.ordersCount > 0 ? emp.ordersCount : '-'}</td>
                      <td className="px-4 py-4 border-l text-center font-bold text-green-600 bg-green-50/30">{emp.totalCommissions > 0 ? emp.totalCommissions : '-'}</td>
                      <td className="px-2 border-l p-2 text-center"><input type="number" value={emp.baseSalary || ''} onChange={e => handleArrayChange(setEmployees, emp.id, 'baseSalary', e.target.value)} className="w-full max-w-[100px] bg-slate-50 border border-slate-200 px-3 py-2 outline-none focus:bg-white rounded-lg text-center" placeholder="0" /></td>
                      <td className="px-2 border-l p-2 text-center"><input type="number" value={emp.deductions || ''} onChange={e => handleArrayChange(setEmployees, emp.id, 'deductions', e.target.value)} className="w-full max-w-[100px] bg-red-50 border border-red-100 text-red-700 px-3 py-2 outline-none focus:bg-white rounded-lg text-center" placeholder="0" /></td>
                      <td className="px-2 border-l p-2 text-center"><input type="number" value={emp.advances || ''} onChange={e => handleArrayChange(setEmployees, emp.id, 'advances', e.target.value)} className="w-full max-w-[100px] bg-orange-50 border border-orange-100 text-orange-700 px-3 py-2 outline-none focus:bg-white rounded-lg text-center" placeholder="0" /></td>
                      <td className="px-4 py-4 text-center font-black text-xl text-indigo-700 bg-indigo-50/50">{emp.netSalary} <span className="text-sm font-medium text-indigo-400">ج.م</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar{width:6px;height:6px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}.custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#94a3b8}`}} />
    </div>
  );
}

export default App;
