const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add Dashboard import
content = content.replace(
  "import OrderModal from './OrderModal';",
  "import OrderModal from './OrderModal';\nimport Dashboard from './Dashboard';"
);

// 2. Change default activeTab
content = content.replace(
  "const [activeTab, setActiveTab] = useState('data-entry');",
  "const [activeTab, setActiveTab] = useState('dashboard');"
);

// 3. Add Dashboard to sidebar
const sidebarDashboardItem = `
            <button onClick={() => { setActiveTab('dashboard'); if(window.innerWidth < 1024) setSidebarOpen(false); }} className={\`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 \${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-300 hover:bg-white/10 hover:text-white'}\`}>
              <BarChart3 className="w-5 h-5" /> <span>لوحة التحكم</span>
            </button>`;

content = content.replace(
  /<nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">/,
  `<nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">${sidebarDashboardItem}`
);

// 4. Render Dashboard component in main content area
const dashboardRender = `
        {/* ============ DASHBOARD ============ */}
        {activeTab === 'dashboard' && (
          <Dashboard orders={orders} merchants={merchants} agents={agents} expenses={expenses} companyProfits={companyProfits} />
        )}
`;

content = content.replace(
  /{activeTab === 'data-entry' && \(/,
  `${dashboardRender}\n        {activeTab === 'data-entry' && (`
);

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx updated with Dashboard successfully!');
