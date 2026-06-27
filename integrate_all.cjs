const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add imports
c = c.replace(
  "import TrackingPage from './TrackingPage';",
  `import TrackingPage from './TrackingPage';
import LoginPage from './LoginPage';
import UsersPage from './UsersPage';
import BarcodeScanner from './BarcodeScanner';
import { setupDefaultAdmin } from './setupUsers';
import { UserCog, ScanLine } from 'lucide-react';`
);

// 2. Add currentUser state + barcode state right after showTracking
c = c.replace(
  "  const [showTracking, setShowTracking] = useState(false);",
  `  const [showTracking, setShowTracking] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('currentUser')); } catch { return null; }
  });
  const [showScanner, setShowScanner] = useState(false);`
);

// 3. Run setupDefaultAdmin in Firebase useEffect
c = c.replace(
  "    return () => { unsubOrders(); unsubEmployees(); unsubMerchants(); unsubAgents(); unsubExpenses(); };",
  `    setupDefaultAdmin();
    return () => { unsubOrders(); unsubEmployees(); unsubMerchants(); unsubAgents(); unsubExpenses(); };`
);

// 4. Add login guard and handleLogin/Logout before the showTracking check
c = c.replace(
  "  if (showTracking) {",
  `  const handleLogin = (user) => {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    setCurrentUser(null);
  };

  const handleScannerStatusUpdate = async (orderId, status) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    try {
      const { setDoc, doc: firestoreDoc } = await import('firebase/firestore');
      const { db: firestoreDb } = await import('./firebase');
      await setDoc(firestoreDoc(firestoreDb, 'orders', orderId), { ...order, status });
    } catch(err) { alert('خطأ: ' + err.message); }
  };

  // Role-based tab access
  const isAdmin = currentUser?.role === 'admin';
  const isSecretary = currentUser?.role === 'secretary';
  const isAgent = currentUser?.role === 'agent';

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (showTracking) {`
);

// 5. Add UsersPage tab render
c = c.replace(
  "      </main>",
  `        {/* ============ USERS ============ */}
        {activeTab === 'users' && (
          <UsersPage currentUser={currentUser} />
        )}

      </main>`
);

// 6. Add sidebar items for users + scanner button + logout
c = c.replace(
  `          <div className="my-2 border-t border-white/5"></div>
          <button onClick={() => setShowTracking(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-white/60 hover:text-white/90 hover:bg-white/5">
            <Eye className="w-5 h-5" /> <span className="font-medium">تتبع الشحنات</span>
          </button>
        </nav>`,
  `          <div className="my-2 border-t border-white/5"></div>
          {isAdmin && <NavButton id="users" icon={UserCog} label="المستخدمون" />}
          <div className="my-2 border-t border-white/5"></div>
          <button onClick={() => setShowScanner(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-white/60 hover:text-white/90 hover:bg-white/5">
            <ScanLine className="w-5 h-5" /> <span className="font-medium">ماسح الباركود</span>
          </button>
          <button onClick={() => setShowTracking(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-white/60 hover:text-white/90 hover:bg-white/5">
            <Eye className="w-5 h-5" /> <span className="font-medium">تتبع الشحنات</span>
          </button>
        </nav>`
);

// 7. Add user info + logout in sidebar footer
c = c.replace(
  `          <p className="text-center text-[10px] text-white/20">البيانات محفوظة على السيرفر ☁️</p>`,
  `          <div className="bg-white/5 rounded-xl p-3 mb-2">
            <p className="text-white/80 font-bold text-sm">{currentUser?.name}</p>
            <p className="text-white/40 text-xs mt-0.5">{currentUser?.role === 'admin' ? '👑 مدير' : currentUser?.role === 'secretary' ? '📋 سكرتير' : '🚚 مندوب'}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-bold py-2 rounded-xl transition-colors">
            خروج من الحساب
          </button>
          <p className="text-center text-[10px] text-white/20 mt-1">البيانات محفوظة على السيرفر ☁️</p>`
);

// 8. Add Users title in top bar
c = c.replace(
  "              {activeTab === 'expenses' && 'الخزينة والمصروفات'}",
  `              {activeTab === 'expenses' && 'الخزينة والمصروفات'}
              {activeTab === 'users' && 'إدارة المستخدمين'}`
);

// 9. Add BarcodeScanner + hide salary/expense for non-admin
c = c.replace(
  "      {/* Waybill Print Modal */}",
  `      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner isOpen={showScanner} onClose={() => setShowScanner(false)} orders={orders} onScan={handleScannerStatusUpdate} />
      )}

      {/* Waybill Print Modal */}`
);

// 10. Hide financial nav items for non-admin/secretary
c = c.replace(
  "          <div className=\"my-2 border-t border-white/5\"></div>\n          <NavButton id=\"salaries\" icon={WalletCards} label=\"المرتبات\" />\n          <NavButton id=\"expenses\" icon={Receipt} label=\"الخزينة\" />",
  `          {(isAdmin) && <div className="my-2 border-t border-white/5"></div>}
          {isAdmin && <NavButton id="salaries" icon={WalletCards} label="المرتبات" />}
          {isAdmin && <NavButton id="expenses" icon={Receipt} label="الخزينة" />}`
);

fs.writeFileSync('src/App.jsx', c);
console.log('App.jsx fully integrated!');
