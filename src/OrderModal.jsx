import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

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

export default function OrderModal({ isOpen, onClose, onSave, order, merchants, agents, isEditMode }) {
  const [formData, setFormData] = useState(order || {});

  useEffect(() => {
    if (order) {
      setFormData(order);
    }
  }, [order]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    let updated = { ...formData, [field]: value };
    if (field === 'status') {
      const zeroCollectedStatuses = ['لاغي', 'غير متاح', 'عدم رد', 'بدون شحن', 'تهرب', 'مؤجل', 'رفض شحن'];
      if (zeroCollectedStatuses.includes(value)) {
        updated.collected = 0;
        updated.shippingFee = 0;
      } else if (['تم التسليم', 'اوت زون', 'نزول'].includes(value)) {
        updated.collected = updated.total;
        const merchant = merchants.find(m => m.name === updated.company);
        updated.shippingFee = merchant ? Number(merchant.rate) || 0 : 0;
      }
    } else if (field === 'company') {
      const merchant = merchants.find(m => m.name === value);
      if (merchant) {
        updated.shippingFee = Number(merchant.rate) || 0;
      }
    }
    setFormData(updated);
  };

  const getDisplayShippingFee = () => {
    if (formData.shippingFee !== undefined) return formData.shippingFee;
    const merchant = merchants.find(m => m.name === formData.company);
    return merchant ? Number(merchant.rate) || 0 : 0;
  };

  const handleSave = () => {
    const finalData = { ...formData };
    if (finalData.shippingFee === undefined) {
      finalData.shippingFee = getDisplayShippingFee();
    }
    onSave(finalData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">
            {order?.id && order.customerName ? `تعديل طلب: ${order.customerName}` : 'إضافة طلب جديد'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className={`grid grid-cols-1 ${!isEditMode ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
            
            {!isEditMode && (
              <>
                {/* Section 1: Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2 border-b border-indigo-100 pb-2">بيانات الشحنة</h3>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">تاريخ الطلب</label>
                    <input type="date" value={formData.date || ''} onChange={e => handleChange('date', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">الراسل (اليوم/المجموعة)</label>
                    <input type="text" value={formData.sender || ''} onChange={e => handleChange('sender', e.target.value)} placeholder="مثال: البدرشين الاثنين" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">الشركة / التاجر</label>
                    <input list="merchants-list" type="text" value={formData.company || ''} onChange={e => handleChange('company', e.target.value)} placeholder="اختر التاجر..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-bold text-indigo-700" />
                    <datalist id="merchants-list">{merchants.map(m => <option key={m.id} value={m.name} />)}</datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">كود الشحنة</label>
                    <input type="text" value={formData.code || ''} onChange={e => handleChange('code', e.target.value)} placeholder="الكود..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm" />
                  </div>
                </div>

                {/* Section 2: Customer Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2 border-b border-indigo-100 pb-2">بيانات العميل</h3>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">اسم العميل</label>
                    <input type="text" value={formData.customerName || ''} onChange={e => handleChange('customerName', e.target.value)} placeholder="اسم العميل..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">رقم الهاتف</label>
                    <input type="text" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} placeholder="01..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm" dir="ltr" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">المنطقة / المركز</label>
                    <input type="text" value={formData.center || ''} onChange={e => handleChange('center', e.target.value)} placeholder="المنطقة..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm" />
                  </div>
                </div>
              </>
            )}

            {/* Section 3: Financials & Status (Always visible, includes Agent in Edit Mode) */}
            <div className={`space-y-4 ${isEditMode ? 'col-span-2 max-w-2xl mx-auto w-full' : ''}`}>
              <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2 border-b border-indigo-100 pb-2">التسليم والحسابات</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">المندوب الموزع</label>
                  <input type="text" value={formData.agent || ''} onChange={e => handleChange('agent', e.target.value)} placeholder="اسم المندوب..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">العدد</label>
                  <input type="number" value={formData.count || ''} onChange={e => handleChange('count', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-center" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">السعر (الإجمالي)</label>
                  <input type="number" value={formData.total || ''} onChange={e => handleChange('total', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-center font-bold text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">حالة الطلب (الموقف)</label>
                  <select value={formData.status || ''} onChange={e => handleChange('status', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium">
                    <option value="">-- اختر الحالة --</option>
                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">المحصل الفعلي</label>
                  <input type="number" value={formData.collected || ''} onChange={e => handleChange('collected', e.target.value)} className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm text-center font-bold text-emerald-700" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">سعر الشحن</label>
                  <input type="number" value={formData.shippingFee !== undefined ? formData.shippingFee : getDisplayShippingFee()} onChange={e => handleChange('shippingFee', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-center font-bold text-indigo-700" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">عمولة المندوب</label>
                  <input type="number" value={formData.commission || ''} onChange={e => handleChange('commission', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-center" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">المرتجعات</label>
                  <input type="text" value={formData.returns || ''} onChange={e => handleChange('returns', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">الصافي للتاجر (المحصل - الشحن)</label>
                <div className="w-full bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 text-sm text-center font-bold text-indigo-700 flex items-center justify-center">
                  {(Number(formData.collected) || 0) - getDisplayShippingFee()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ملاحظات إضافية</label>
                <textarea value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} placeholder="أي ملاحظات تخص الطلب..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm resize-none h-20"></textarea>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-600 hover:bg-slate-200 transition-colors">
            إلغاء
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95">
            <Save className="w-4 h-4" /> حفظ الطلب
          </button>
        </div>
      </div>
    </div>
  );
}
