import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, where, setDoc, doc } from 'firebase/firestore';
import { Truck, User, Lock, LogIn, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [firestoreReady, setFirestoreReady] = useState(null); // null=checking, true=ok, false=error

  // Check Firestore connection & setup default admin on mount
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        // Try to read users collection with a 8-second timeout
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000));
        const read = getDocs(collection(db, 'users'));
        const snap = await Promise.race([read, timeout]);

        if (cancelled) return;

        // If empty, create default admin
        if (snap.empty) {
          await setDoc(doc(db, 'users', 'admin'), {
            id: 'admin', username: 'admin', password: 'admin', role: 'admin', name: 'المدير'
          });
        }
        setFirestoreReady(true);
      } catch (err) {
        if (!cancelled) {
          console.warn('Firestore not available:', err.message);
          setFirestoreReady(false);
        }
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return setError('يرجى إدخال اسم المستخدم وكلمة المرور');
    setLoading(true);
    setError('');

    // Fallback: if Firestore is down, allow default admin login locally
    if (firestoreReady === false) {
      if (username.trim() === 'admin' && password === 'admin') {
        onLogin({ id: 'admin', username: 'admin', role: 'admin', name: 'المدير' });
        return;
      } else {
        setError('السيرفر غير متاح حالياً. فقط حساب admin يمكنه الدخول في وضع عدم الاتصال.');
        setLoading(false);
        return;
      }
    }

    try {
      // Race the query against a 10-second timeout
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('انتهت مهلة الاتصال بالسيرفر. تحقق من اتصالك بالإنترنت.')), 10000));
      const q = query(collection(db, 'users'), where('username', '==', username.trim()));
      const snap = await Promise.race([getDocs(q), timeout]);

      if (snap.empty) {
        // If no users at all, create default admin and retry
        const allSnap = await Promise.race([getDocs(collection(db, 'users')), timeout]);
        if (allSnap.empty && username.trim() === 'admin' && password === 'admin') {
          await setDoc(doc(db, 'users', 'admin'), {
            id: 'admin', username: 'admin', password: 'admin', role: 'admin', name: 'المدير'
          });
          onLogin({ id: 'admin', username: 'admin', role: 'admin', name: 'المدير' });
          return;
        }
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      const userData = snap.docs[0].data();
      if (userData.password !== password) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      onLogin({ id: snap.docs[0].id, ...userData });
    } catch (err) {
      console.error('Login error:', err);
      // On any error, allow local admin fallback
      if (username.trim() === 'admin' && password === 'admin') {
        onLogin({ id: 'admin', username: 'admin', role: 'admin', name: 'المدير' });
        return;
      }
      setError(err.message || 'خطأ في الاتصال بالسيرفر');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #6366f1 100%)' }}>
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-20 right-20 w-3 h-3 bg-white/20 rounded-full animate-pulse"></div>
      <div className="absolute bottom-32 left-32 w-2 h-2 bg-white/15 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-5 shadow-2xl shadow-indigo-900/50" style={{animation: 'float 3s ease-in-out infinite'}}>
            <Truck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">شركة الرضا للشحن</h1>
          <p className="text-indigo-200/60 text-sm mt-2">نظام إدارة الشحنات</p>
        </div>

        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">تسجيل الدخول</h2>
            {firestoreReady === null && (
              <div className="flex items-center gap-1.5 text-yellow-300/70 text-xs">
                <div className="w-3 h-3 border border-yellow-300/70 border-t-transparent rounded-full animate-spin"></div>
                جاري الاتصال...
              </div>
            )}
            {firestoreReady === true && (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                <Wifi className="w-3.5 h-3.5" /> متصل
              </div>
            )}
            {firestoreReady === false && (
              <div className="flex items-center gap-1.5 text-amber-400 text-xs">
                <WifiOff className="w-3.5 h-3.5" /> غير متصل
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-indigo-200/80 mb-2 block">اسم المستخدم</label>
              <div className="relative">
                <User className="w-5 h-5 absolute right-4 top-3.5 text-indigo-300/50" />
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="أدخل اسم المستخدم"
                  className="w-full pr-12 pl-4 py-3.5 bg-white/10 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all text-sm" autoComplete="username" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-indigo-200/80 mb-2 block">كلمة المرور</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute right-4 top-3.5 text-indigo-300/50" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="أدخل كلمة المرور"
                  className="w-full pr-12 pl-4 py-3.5 bg-white/10 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all text-sm" autoComplete="current-password" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-400/20 rounded-xl text-red-200 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><LogIn className="w-4 h-4" /> دخول</>}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-indigo-200/40 text-xs">الدخول الافتراضي: admin / admin</p>
          </div>
        </div>
        <p className="text-center text-indigo-200/30 text-xs mt-6">شركة الرضا للشحن &copy; {new Date().getFullYear()}</p>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}} />
    </div>
  );
}
