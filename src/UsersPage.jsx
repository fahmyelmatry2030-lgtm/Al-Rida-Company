import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { UserCog, Plus, Trash2, Edit3, Shield, User, Truck, FileText, X, Save } from 'lucide-react';

const ROLE_CONFIG = {
  admin:     { label: 'مدير', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Shield },
  secretary: { label: 'سكرتير', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText },
  agent:     { label: 'مندوب', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Truck },
};

function UserModal({ isOpen, onClose, onSave, initial }) {
  const [data, setData] = useState({ username: '', password: '', name: '', role: 'secretary' });

  useEffect(() => {
    if (initial) setData({ ...initial });
    else setData({ id: Math.random().toString(36).substr(2, 9), username: '', password: '', name: '', role: 'secretary' });
  }, [initial, isOpen]);

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-black text-slate-800">{initial ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="form-label">الاسم الكامل</label>
            <input className="form-input" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="الاسم بالكامل" />
          </div>
          <div>
            <label className="form-label">اسم المستخدم</label>
            <input className="form-input" value={data.username} onChange={e => setData({...data, username: e.target.value})} placeholder="username" dir="ltr" />
          </div>
          <div>
            <label className="form-label">كلمة المرور</label>
            <input className="form-input" value={data.password} onChange={e => setData({...data, password: e.target.value})} placeholder="password" dir="ltr" />
          </div>
          <div>
            <label className="form-label">الصلاحية</label>
            <select className="form-input" value={data.role} onChange={e => setData({...data, role: e.target.value})}>
              <option value="admin">مدير (كل الصلاحيات)</option>
              <option value="secretary">سكرتير (إدخال الطلبات فقط - بدون أرباح)</option>
              <option value="agent">مندوب (تحديث الحالة فقط)</option>
            </select>
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">إلغاء</button>
          <button onClick={() => onSave(data)} className="btn-primary"><Save className="w-4 h-4" /> حفظ</button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState({ isOpen: false, data: null });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => setUsers(snap.docs.map(d => d.data())));
    return unsub;
  }, []);

  const handleSave = async (userData) => {
    try {
      await setDoc(doc(db, 'users', userData.id || userData.username), { ...userData, id: userData.id || userData.username });
      setModal({ isOpen: false, data: null });
    } catch (err) { alert('خطأ: ' + err.message); }
  };

  const handleDelete = async (user) => {
    if (user.username === 'admin') return alert('لا يمكن حذف حساب المدير الرئيسي');
    if (user.id === currentUser?.id) return alert('لا يمكنك حذف حسابك الخاص');
    if (window.confirm(`حذف المستخدم "${user.name}"؟`)) {
      await deleteDoc(doc(db, 'users', user.id));
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-semibold">هذه الصفحة للمدير فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Role descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { role: 'admin', desc: 'يرى كل شيء ويعدل كل شيء بما في ذلك الأرباح والمرتبات والمصروفات' },
          { role: 'secretary', desc: 'يدخل الطلبات ويعدل الحالات ولكن لا يرى صفحات الأرباح والمرتبات' },
          { role: 'agent', desc: 'يرى طلباته فقط ويقدر يغير حالة الطلبات اللي اسمه عليها' },
        ].map(r => {
          const cfg = ROLE_CONFIG[r.role];
          const Icon = cfg.icon;
          return (
            <div key={r.role} className={`rounded-2xl p-4 border ${cfg.color.replace('text-', 'border-').replace('bg-', 'bg-')}`}>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold mb-3 ${cfg.color}`}>
                <Icon className="w-3 h-3" /> {cfg.label}
              </div>
              <p className="text-sm text-slate-600">{r.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><UserCog className="w-5 h-5 text-indigo-500" /> المستخدمون</h3>
          <button onClick={() => setModal({ isOpen: true, data: null })}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> إضافة مستخدم
          </button>
        </div>
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">الاسم</th>
              <th className="px-4 py-3">اسم المستخدم</th>
              <th className="px-4 py-3">الصلاحية</th>
              <th className="px-4 py-3 text-center w-24">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-16 text-slate-400">لا يوجد مستخدمون</td></tr>
            ) : users.map(u => {
              const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.secretary;
              const Icon = cfg.icon;
              return (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800">{u.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${cfg.color}`}>
                      <Icon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setModal({ isOpen: true, data: u })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <UserModal isOpen={modal.isOpen} onClose={() => setModal({ isOpen: false, data: null })} onSave={handleSave} initial={modal.data} />
    </div>
  );
}
