import React, { useState } from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Search, Package, CheckCircle, Clock, XCircle, Truck, MapPin, Phone, ArrowLeft } from 'lucide-react';

const STATUS_MAP = {
  'تم التسليم': { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'تم التسليم بنجاح', step: 4 },
  'جزئي': { icon: Package, color: 'text-lime-500', bg: 'bg-lime-50', border: 'border-lime-200', label: 'تسليم جزئي', step: 3 },
  'نزول': { icon: Truck, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200', label: 'خرجت للتسليم', step: 2 },
  'مؤجل': { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', label: 'مؤجلة', step: 1 },
  'لاغي': { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: 'ملغية', step: 0 },
  'رفض شحن': { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', label: 'مرفوضة', step: 0 },
  'غير متاح': { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', label: 'العميل غير متاح', step: 1 },
  'عدم رد': { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', label: 'لا يوجد رد', step: 1 },
  'تهرب': { icon: XCircle, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', label: 'تهرب العميل', step: 0 },
  'اوت زون': { icon: MapPin, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-200', label: 'خارج نطاق التوصيل', step: 0 },
  'بدون شحن': { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: 'بدون شحن', step: 0 },
};

const STEPS = [
  { label: 'تم الاستلام', icon: Package },
  { label: 'قيد التجهيز', icon: Clock },
  { label: 'خرجت للتسليم', icon: Truck },
  { label: 'تم التسليم', icon: CheckCircle },
];

export default function TrackingPage({ onBack }) {
  const [trackCode, setTrackCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackCode.trim()) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);

    try {
      const q = query(collection(db, 'orders'), where('code', '==', trackCode.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Try by phone
        const q2 = query(collection(db, 'orders'), where('phone', '==', trackCode.trim()));
        const snapshot2 = await getDocs(q2);
        if (snapshot2.empty) {
          setNotFound(true);
        } else {
          setResult(snapshot2.docs.map(d => d.data()));
        }
      } else {
        setResult(snapshot.docs.map(d => d.data()));
      }
    } catch (err) {
      setNotFound(true);
    }
    setLoading(false);
  };

  const statusInfo = (status) => STATUS_MAP[status] || { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', label: status || 'قيد المعالجة', step: 1 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex flex-col" dir="rtl" style={{fontFamily: "'Cairo', sans-serif"}}>
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-slate-800 text-lg">شركة الرضا للشحن</h1>
              <p className="text-xs text-slate-400">تتبع شحنتك</p>
            </div>
          </div>
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
              <ArrowLeft className="w-4 h-4" /> العودة للوحة التحكم
            </button>
          )}
        </div>
      </header>

      {/* Search Section */}
      <div className="max-w-3xl mx-auto px-6 w-full mt-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-800 mb-3">تتبع شحنتك 📦</h2>
          <p className="text-slate-500">أدخل كود الشحنة أو رقم الهاتف لمعرفة حالة طلبك</p>
        </div>

        <form onSubmit={handleTrack} className="flex gap-3 max-w-lg mx-auto">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute right-4 top-3.5 text-slate-400" />
            <input
              type="text"
              value={trackCode}
              onChange={e => setTrackCode(e.target.value)}
              placeholder="كود الشحنة أو رقم الهاتف..."
              className="w-full pr-12 pl-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-lg shadow-sm"
            />
          </div>
          <button type="submit" disabled={loading} className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50">
            {loading ? '...' : 'تتبع'}
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="max-w-3xl mx-auto px-6 w-full mt-10 pb-20">
        {notFound && (
          <div className="bg-white rounded-3xl shadow-sm border border-red-100 p-10 text-center">
            <XCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">لم يتم العثور على الشحنة</h3>
            <p className="text-slate-500">تأكد من كود الشحنة أو رقم الهاتف وحاول مرة أخرى</p>
          </div>
        )}

        {result && result.map((order, idx) => {
          const info = statusInfo(order.status);
          const StatusIcon = info.icon;
          const currentStep = info.step;

          return (
            <div key={idx} className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden mb-6">
              {/* Status Header */}
              <div className={`${info.bg} ${info.border} border-b p-6 flex items-center gap-4`}>
                <div className={`w-14 h-14 rounded-2xl ${info.bg} border-2 ${info.border} flex items-center justify-center`}>
                  <StatusIcon className={`w-7 h-7 ${info.color}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">حالة الشحنة</p>
                  <h3 className={`text-xl font-black ${info.color}`}>{info.label}</h3>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-8">
                  {STEPS.map((step, i) => {
                    const StepIcon = step.icon;
                    const isActive = i <= currentStep;
                    const isCurrentStep = i === currentStep;
                    return (
                      <React.Fragment key={i}>
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400'} ${isCurrentStep ? 'ring-4 ring-indigo-200' : ''}`}>
                            <StepIcon className="w-5 h-5" />
                          </div>
                          <span className={`text-xs font-semibold ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{step.label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`flex-1 h-1 mx-2 rounded-full ${i < currentStep ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">كود الشحنة</p>
                    <p className="font-bold text-slate-800">{order.code || '—'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">التاريخ</p>
                    <p className="font-bold text-slate-800">{order.date || '—'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">📍 المنطقة</p>
                    <p className="font-bold text-slate-800">{order.center || '—'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">📦 عدد القطع</p>
                    <p className="font-bold text-slate-800">{order.count || 1}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-4 col-span-2">
                    <p className="text-xs text-indigo-500 mb-1">💰 المبلغ المطلوب</p>
                    <p className="font-black text-2xl text-indigo-700">{Number(order.total || 0).toLocaleString()} <span className="text-sm font-normal text-indigo-400">ج.م</span></p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="mt-auto bg-white/50 border-t border-slate-200/60 py-4 text-center text-xs text-slate-400">
        شركة الرضا للشحن &copy; {new Date().getFullYear()} — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
