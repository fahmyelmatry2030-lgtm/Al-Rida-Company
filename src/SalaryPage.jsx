import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { EmployeeModal } from './EntityModals';
import {
  WalletCards, CheckCircle, Clock, Trash2, Edit3,
  ChevronRight, ChevronLeft, User,
  Calendar, Package, X
} from 'lucide-react';

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

export default function SalaryPage({ employees, orders, currentUser }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [allPayments, setAllPayments] = useState([]);
  const [empModal, setEmpModal] = useState({ isOpen: false, data: null });

  // Load payments for current month/year
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'salary_payments'), snap => {
      const all = snap.docs.map(d => d.data());
      setAllPayments(all);
      setPayments(all.filter(p => p.month === month && p.year === year));
    });
    return unsub;
  }, []);

  // Update filtered payments when month/year changes
  useEffect(() => {
    setPayments(allPayments.filter(p => p.month === month && p.year === year));
  }, [month, year, allPayments]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Calculate employee stats for the selected month
  const getEmployeeStats = (emp) => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const empOrders = orders.filter(o => o.agent === emp.name && o.date?.startsWith(monthStr));
    const delivered = empOrders.filter(o => o.status === 'تم التسليم' || o.status === 'جزئي');
    const commissions = delivered.reduce((sum, o) => sum + (Number(o.commission) || 0), 0);
    const base = Number(emp.baseSalary) || 0;
    const deductions = Number(emp.deductions) || 0;
    const advances = Number(emp.advances) || 0;
    const net = base + commissions - deductions - advances;
    return {
      ordersCount: empOrders.length,
      deliveredCount: delivered.length,
      commissions,
      base,
      deductions,
      advances,
      net,
    };
  };

  const isPaid = (empId) => payments.some(p => p.employeeId === empId);
  const getPayment = (empId) => payments.find(p => p.employeeId === empId);

  const handleDeleteEmployee = async (emp) => {
    if (!window.confirm(`حذف موظف "${emp.name}"؟ سيتم حذف بياناته نهائياً.`)) return;
    try { await deleteDoc(doc(db, 'employees', emp.id)); } catch (err) { alert('خطأ: ' + err.message); }
  };

  const handleSaveEmployee = async (data) => {
    try {
      await setDoc(doc(db, 'employees', data.id), data);
      setEmpModal({ isOpen: false, data: null });
    } catch (err) { alert('خطأ: ' + err.message); }
  };

  const handlePay = async (emp) => {
    if (!window.confirm(`تأكيد دفع مرتب ${emp.name} لشهر ${MONTHS_AR[month]} ${year}؟`)) return;
    const stats = getEmployeeStats(emp);
    const payId = `${emp.id}_${year}_${month}`;
    setLoading(prev => ({ ...prev, [emp.id]: true }));
    try {
      await setDoc(doc(db, 'salary_payments', payId), {
        id: payId,
        employeeId: emp.id,
        employeeName: emp.name,
        month, year,
        monthLabel: `${MONTHS_AR[month]} ${year}`,
        baseSalary: stats.base,
        commissions: stats.commissions,
        deductions: stats.deductions,
        advances: stats.advances,
        netSalary: stats.net,
        ordersCount: stats.ordersCount,
        paidAt: new Date().toISOString(),
        paidBy: currentUser?.name || 'المدير',
      });
    } catch (err) { alert('خطأ: ' + err.message); }
    setLoading(prev => ({ ...prev, [emp.id]: false }));
  };

  const handleUnpay = async (empId) => {
    if (!window.confirm('إلغاء تأكيد دفع المرتب؟')) return;
    const payId = `${empId}_${year}_${month}`;
    try { await deleteDoc(doc(db, 'salary_payments', payId)); } catch (err) { alert('خطأ: ' + err.message); }
  };

  const totalNet = employees.reduce((sum, emp) => {
    const stats = getEmployeeStats(emp);
    return sum + stats.net;
  }, 0);

  const totalPaid = payments.reduce((sum, p) => sum + (p.netSalary || 0), 0);
  const paidCount = payments.length;

  // Group history by month
  const historyByMonth = useMemo(() => {
    const map = {};
    allPayments.forEach(p => {
      const key = `${p.year}-${p.month}`;
      if (!map[key]) map[key] = { label: p.monthLabel || `${MONTHS_AR[p.month]} ${p.year}`, payments: [] };
      map[key].payments.push(p);
    });
    return Object.values(map).sort((a, b) => b.label.localeCompare(a.label));
  }, [allPayments]);

  return (
    <div className="flex flex-col gap-5">
      {/* Month Selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-2xl font-black text-slate-800">{MONTHS_AR[month]} {year}</h2>
          <p className="text-xs text-slate-400 mt-0.5">مرتبات الموظفين</p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-500" />
        </button>
        <button onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${showHistory ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          <Calendar className="w-4 h-4" /> سجل المدفوعات
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><User className="w-4 h-4 text-indigo-500" /></div>
            <span className="text-xs text-slate-400 font-semibold">الموظفون</span>
          </div>
          <p className="text-2xl font-black text-slate-800">{employees.length}</p>
          <p className="text-xs text-slate-400 mt-1">تم الدفع: <span className="font-bold text-emerald-600">{paidCount}</span> / {employees.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><WalletCards className="w-4 h-4 text-amber-500" /></div>
            <span className="text-xs text-slate-400 font-semibold">إجمالي المرتبات</span>
          </div>
          <p className="text-2xl font-black text-slate-800">{totalNet.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">ج.م مستحقة هذا الشهر</p>
        </div>
        <div className={`rounded-2xl p-4 shadow-sm border ${totalPaid === totalNet && totalNet > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
            <span className="text-xs text-slate-400 font-semibold">تم صرفه</span>
          </div>
          <p className="text-2xl font-black text-emerald-700">{totalPaid.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">ج.م مدفوعة فعلياً</p>
        </div>
      </div>

      {/* History View */}
      {showHistory ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800">سجل المدفوعات الكاملة</h3>
          </div>
          {historyByMonth.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Clock className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-slate-400 font-semibold">لا يوجد سجل مدفوعات بعد</p>
            </div>
          ) : historyByMonth.map(group => (
            <div key={group.label} className="border-b border-slate-50 last:border-0">
              <div className="px-5 py-3 bg-slate-50 flex items-center justify-between">
                <span className="font-bold text-slate-700">{group.label}</span>
                <span className="text-sm font-black text-indigo-700">
                  {group.payments.reduce((s, p) => s + (p.netSalary || 0), 0).toLocaleString()} ج.م
                </span>
              </div>
              {group.payments.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                    {(p.employeeName || 'م').charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{p.employeeName}</p>
                    <p className="text-xs text-slate-400">صُرف بواسطة: {p.paidBy} • {new Date(p.paidAt).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div className="text-left text-xs text-slate-400">
                    <p>أساسي: {p.baseSalary?.toLocaleString()}</p>
                    <p>عمولات: {p.commissions?.toLocaleString()}</p>
                    {p.deductions > 0 && <p className="text-red-400">خصم: -{p.deductions?.toLocaleString()}</p>}
                  </div>
                  <p className="font-black text-indigo-700 text-lg">{p.netSalary?.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span></p>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        /* Employee Cards */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {employees.length === 0 ? (
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4"><WalletCards className="w-8 h-8 text-indigo-300" /></div>
              <p className="text-slate-400 font-semibold">لا يوجد موظفين بعد</p>
              <p className="text-slate-300 text-sm mt-1">أضف موظفين من زرار "إضافة موظف"</p>
            </div>
          ) : employees.map(emp => {
            const stats = getEmployeeStats(emp);
            const paid = isPaid(emp.id);
            const payment = getPayment(emp.id);
            return (
              <div key={emp.id} className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${paid ? 'border-emerald-200 shadow-emerald-100' : 'border-slate-100 hover:shadow-lg hover:border-indigo-100 hover:-translate-y-0.5'}`}>
                {/* Header */}
                <div className={`px-5 py-4 flex items-center justify-between ${paid ? 'bg-emerald-50' : 'bg-slate-50/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg ${paid ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20' : 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/20'}`}>
                      {(emp.name || 'م').charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800">{emp.name}</h3>
                      <p className="text-xs text-slate-400">{MONTHS_AR[month]} {year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEmpModal({ isOpen: true, data: emp })} className="p-2 rounded-xl text-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition-colors" title="تعديل بيانات الموظف"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteEmployee(emp)} className="p-2 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-colors" title="حذف الموظف"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {paid ? (
                    <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold">
                      <CheckCircle className="w-3.5 h-3.5" /> تم الصرف
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-bold">
                      <Clock className="w-3.5 h-3.5" /> في الانتظار
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-400 mb-1">📦 طلبات</p>
                      <p className="font-black text-slate-800">{stats.ordersCount}</p>
                    </div>
                    <div className="bg-sky-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-sky-500 mb-1">✅ تسليم</p>
                      <p className="font-black text-sky-700">{stats.deliveredCount}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-emerald-500 mb-1">💰 عمولات</p>
                      <p className="font-black text-emerald-700">{stats.commissions.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">الراتب الأساسي</span>
                      <span className="font-bold text-slate-700">+ {stats.base.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">العمولات</span>
                      <span className="font-bold text-emerald-600">+ {stats.commissions.toLocaleString()} ج.م</span>
                    </div>
                    {stats.deductions > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">خصومات</span>
                        <span className="font-bold text-red-500">- {stats.deductions.toLocaleString()} ج.م</span>
                      </div>
                    )}
                    {stats.advances > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">سلف</span>
                        <span className="font-bold text-amber-500">- {stats.advances.toLocaleString()} ج.م</span>
                      </div>
                    )}
                    <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between items-center">
                      <span className="font-bold text-slate-700">الصافي</span>
                      <span className="font-black text-xl text-indigo-700">{stats.net.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span></span>
                    </div>
                  </div>

                  {/* Pay Button */}
                  {paid ? (
                    <div className="bg-emerald-50 rounded-xl px-4 py-3 text-center">
                      <p className="text-emerald-700 font-bold text-sm flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        تم صرف {payment?.netSalary?.toLocaleString()} ج.م
                      </p>
                      <p className="text-emerald-500 text-xs mt-0.5">بواسطة: {payment?.paidBy} • {payment?.paidAt ? new Date(payment.paidAt).toLocaleDateString('ar-EG') : ''}</p>
                    </div>
                  ) : (
                    <button onClick={() => handlePay(emp)} disabled={loading[emp.id]}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-60">
                      {loading[emp.id]
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        : <><WalletCards className="w-4 h-4" /> تأكيد صرف المرتب</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Employee Edit Modal */}
      <EmployeeModal
        isOpen={empModal.isOpen}
        onClose={() => setEmpModal({ isOpen: false, data: null })}
        onSave={handleSaveEmployee}
        initialData={empModal.data}
      />
    </div>
  );
}
