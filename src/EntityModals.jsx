import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const ModalWrapper = ({ isOpen, onClose, title, children, onSave }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {children}
        </div>
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">إلغاء</button>
          <button onClick={onSave} className="btn-primary"><Save className="w-4 h-4" /> حفظ</button>
        </div>
      </div>
    </div>
  );
};

export const MerchantModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [data, setData] = useState({ name: '', phone: '', address: '', rate: 0 });
  
  useEffect(() => {
    if (initialData) setData(initialData);
    else setData({ id: Math.random().toString(36).substr(2, 9), name: '', phone: '', address: '', rate: 0 });
  }, [initialData, isOpen]);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={initialData ? "تعديل تاجر" : "إضافة تاجر جديد"} onSave={() => onSave(data)}>
      <div>
        <label className="form-label">اسم التاجر / الشركة</label>
        <input type="text" className="form-input" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="الاسم" />
      </div>
      <div>
        <label className="form-label">رقم الهاتف</label>
        <input type="text" className="form-input" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} placeholder="01xxxxxxxxx" dir="ltr" />
      </div>
      <div>
        <label className="form-label">العنوان</label>
        <input type="text" className="form-input" value={data.address} onChange={e => setData({...data, address: e.target.value})} placeholder="تفاصيل العنوان" />
      </div>
      <div>
        <label className="form-label">سعر الشحن</label>
        <input type="number" className="form-input" value={data.rate} onChange={e => setData({...data, rate: e.target.value})} placeholder="0" />
      </div>
    </ModalWrapper>
  );
};

export const AgentModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [data, setData] = useState({ name: '', phone: '', zone: '', vehicle: '' });
  
  useEffect(() => {
    if (initialData) setData(initialData);
    else setData({ id: Math.random().toString(36).substr(2, 9), name: '', phone: '', zone: '', vehicle: '' });
  }, [initialData, isOpen]);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={initialData ? "تعديل مندوب" : "إضافة مندوب جديد"} onSave={() => onSave(data)}>
      <div>
        <label className="form-label">اسم المندوب</label>
        <input type="text" className="form-input" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="الاسم" />
      </div>
      <div>
        <label className="form-label">رقم الهاتف</label>
        <input type="text" className="form-input" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} placeholder="01xxxxxxxxx" dir="ltr" />
      </div>
      <div>
        <label className="form-label">خط السير / المنطقة</label>
        <input type="text" className="form-input" value={data.zone} onChange={e => setData({...data, zone: e.target.value})} placeholder="مثال: مدينة نصر" />
      </div>
      <div>
        <label className="form-label">المركبة</label>
        <input type="text" className="form-input" value={data.vehicle} onChange={e => setData({...data, vehicle: e.target.value})} placeholder="سيارة / موتوسيكل" />
      </div>
    </ModalWrapper>
  );
};

export const ExpenseModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [data, setData] = useState({ date: new Date().toISOString().split('T')[0], amount: 0, notes: '' });
  
  useEffect(() => {
    if (initialData) setData(initialData);
    else setData({ id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString().split('T')[0], amount: 0, notes: '' });
  }, [initialData, isOpen]);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={initialData ? "تعديل مصروف" : "إضافة مصروف جديد"} onSave={() => onSave(data)}>
      <div>
        <label className="form-label">التاريخ</label>
        <input type="date" className="form-input" value={data.date} onChange={e => setData({...data, date: e.target.value})} />
      </div>
      <div>
        <label className="form-label">المبلغ (ج.م)</label>
        <input type="number" className="form-input" value={data.amount} onChange={e => setData({...data, amount: e.target.value})} placeholder="0" />
      </div>
      <div>
        <label className="form-label">البيان / ملاحظات</label>
        <textarea className="form-input" value={data.notes} onChange={e => setData({...data, notes: e.target.value})} placeholder="تفاصيل المصروف..." rows="3"></textarea>
      </div>
    </ModalWrapper>
  );
};

export const EmployeeModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [data, setData] = useState({ name: '', baseSalary: 0, deductions: 0, advances: 0 });
  
  useEffect(() => {
    if (initialData) setData(initialData);
    else setData({ id: Math.random().toString(36).substr(2, 9), name: '', baseSalary: 0, deductions: 0, advances: 0 });
  }, [initialData, isOpen]);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={initialData ? "تعديل موظف" : "إضافة موظف جديد"} onSave={() => onSave(data)}>
      <div>
        <label className="form-label">اسم الموظف</label>
        <input type="text" className="form-input" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="الاسم" />
      </div>
      <div>
        <label className="form-label">الراتب الأساسي</label>
        <input type="number" className="form-input" value={data.baseSalary} onChange={e => setData({...data, baseSalary: e.target.value})} placeholder="0" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">خصومات</label>
          <input type="number" className="form-input" value={data.deductions} onChange={e => setData({...data, deductions: e.target.value})} placeholder="0" />
        </div>
        <div>
          <label className="form-label">سلف</label>
          <input type="number" className="form-input" value={data.advances} onChange={e => setData({...data, advances: e.target.value})} placeholder="0" />
        </div>
      </div>
    </ModalWrapper>
  );
};
