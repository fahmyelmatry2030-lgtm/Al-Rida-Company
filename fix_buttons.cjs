const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// ===== FIX MERCHANTS: make edit/delete always visible =====
c = c.replace(
  `<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setActiveMerchantModal({ isOpen: true, data: m })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem('merchants', m.id, 'مسح هذا التاجر؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>`,
  `<div className="flex gap-1">
                        <button onClick={() => setActiveMerchantModal({ isOpen: true, data: m })} className="p-2 rounded-xl text-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem('merchants', m.id, 'مسح هذا التاجر؟')} className="p-2 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>`
);

// ===== FIX AGENTS: make edit/delete always visible =====
c = c.replace(
  `<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setActiveAgentModal({ isOpen: true, data: a })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => deleteArrayItem('agents', a.id, 'مسح هذا المندوب؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>`,
  `<div className="flex gap-1">
                          <button onClick={() => setActiveAgentModal({ isOpen: true, data: a })} className="p-2 rounded-xl text-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => deleteArrayItem('agents', a.id, 'مسح هذا المندوب؟')} className="p-2 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                        </div>`
);

// ===== FIX EXPENSES: make edit/delete always visible =====
c = c.replace(
  `<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => setActiveExpenseModal({ isOpen: true, data: exp })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem('expenses', exp.id, 'مسح هذا المصروف؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>`,
  `<div className="flex gap-1 shrink-0">
                        <button onClick={() => setActiveExpenseModal({ isOpen: true, data: exp })} className="p-2 rounded-xl text-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem('expenses', exp.id, 'مسح هذا المصروف؟')} className="p-2 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>`
);

fs.writeFileSync('src/App.jsx', c);
console.log('Fixed edit/delete buttons to always visible!');
