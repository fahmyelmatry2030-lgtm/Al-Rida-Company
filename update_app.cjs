const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add imports
content = content.replace(
  "import OrderModal from './OrderModal';",
  "import OrderModal from './OrderModal';\nimport { MerchantModal, AgentModal, ExpenseModal, EmployeeModal } from './EntityModals';"
);

// 2. Add State for modals
content = content.replace(
  "  const [editingOrder, setEditingOrder] = useState(null);",
  `  const [editingOrder, setEditingOrder] = useState(null);
  const [activeMerchantModal, setActiveMerchantModal] = useState({ isOpen: false, data: null });
  const [activeAgentModal, setActiveAgentModal] = useState({ isOpen: false, data: null });
  const [activeExpenseModal, setActiveExpenseModal] = useState({ isOpen: false, data: null });
  const [activeEmployeeModal, setActiveEmployeeModal] = useState({ isOpen: false, data: null });

  const handleSaveEntity = (setter, modalSetter, savedItem) => {
    setter(prev => {
      const exists = prev.find(o => o.id === savedItem.id);
      if (exists) return prev.map(o => o.id === savedItem.id ? savedItem : o);
      return [savedItem, ...prev];
    });
    modalSetter({ isOpen: false, data: null });
  };`
);

// 3. Update top action buttons
content = content.replace(
  "onClick={() => addArrayItem(setMerchants, { name: '', phone: '', address: '', rate: 0 })}",
  "onClick={() => setActiveMerchantModal({ isOpen: true, data: null })}"
);
content = content.replace(
  "onClick={() => addArrayItem(setAgents, { name: '', phone: '', zone: '', vehicle: '' })}",
  "onClick={() => setActiveAgentModal({ isOpen: true, data: null })}"
);
content = content.replace(
  "onClick={() => addArrayItem(setExpenses, { date: today(), amount: 0, notes: '' })}",
  "onClick={() => setActiveExpenseModal({ isOpen: true, data: null })}"
);
content = content.replace(
  "onClick={() => addArrayItem(setEmployees, { name: '', baseSalary: 0, deductions: 0, advances: 0 })}",
  "onClick={() => setActiveEmployeeModal({ isOpen: true, data: null })}"
);

// 4. Update merchants table
content = content.replace(
  /<tbody>\s*\{merchants\.length === 0 \?[\s\S]*?(?=<\/table>)/,
  `<tbody>
                {merchants.length === 0 ? <tr><td colSpan="5" className="text-center py-16 text-slate-400">لا يوجد تجار. اضغط "إضافة تاجر"</td></tr> : 
                 merchants.map((m, i) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 border-l font-bold text-slate-800">{m.name || '—'}</td>
                    <td className="px-4 py-3 border-l text-slate-600" dir="ltr">{m.phone || '—'}</td>
                    <td className="px-4 py-3 border-l text-slate-600">{m.address || '—'}</td>
                    <td className="px-4 py-3 border-l text-center font-bold text-slate-700">{Number(m.rate || 0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-center border-l">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setActiveMerchantModal({ isOpen: true, data: m })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem(setMerchants, m.id, 'مسح هذا التاجر؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            `
);
// Also update merchants table header
content = content.replace(
  /<tr><th className="px-4 py-4 border-l w-16">م<\/th><th className="px-4 py-4 border-l">اسم التاجر \/ الشركة<\/th><th className="px-4 py-4 border-l">رقم الهاتف<\/th><th className="px-4 py-4 border-l min-w-\[200px\]">العنوان<\/th><th className="px-4 py-4 border-l w-32">سعر الشحن<\/th><\/tr>/,
  `<tr><th className="px-4 py-4 border-l w-16">م</th><th className="px-4 py-4 border-l">اسم التاجر / الشركة</th><th className="px-4 py-4 border-l">رقم الهاتف</th><th className="px-4 py-4 border-l min-w-[200px]">العنوان</th><th className="px-4 py-4 border-l w-32">سعر الشحن</th><th className="px-4 py-4 border-l w-24 text-center">إجراءات</th></tr>`
);

// 5. Update agents table
content = content.replace(
  /<tbody>\s*\{agents\.length === 0 \?[\s\S]*?(?=<\/table>)/,
  `<tbody>
                {agents.length === 0 ? <tr><td colSpan="5" className="text-center py-16 text-slate-400">لا يوجد مناديب. اضغط "إضافة مندوب"</td></tr> : 
                 agents.map((a, i) => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 border-l font-bold text-slate-800">{a.name || '—'}</td>
                    <td className="px-4 py-3 border-l text-slate-600" dir="ltr">{a.phone || '—'}</td>
                    <td className="px-4 py-3 border-l text-slate-600">{a.zone || '—'}</td>
                    <td className="px-4 py-3 border-l text-slate-500">{a.vehicle || '—'}</td>
                    <td className="px-3 py-3 text-center border-l">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setActiveAgentModal({ isOpen: true, data: a })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem(setAgents, a.id, 'مسح هذا المندوب؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            `
);
// Also update agents table header
content = content.replace(
  /<tr><th className="px-4 py-4 border-l w-16">م<\/th><th className="px-4 py-4 border-l">اسم المندوب<\/th><th className="px-4 py-4 border-l">رقم الهاتف<\/th><th className="px-4 py-4 border-l">خط السير \/ المنطقة<\/th><th className="px-4 py-4 border-l">المركبة<\/th><\/tr>/,
  `<tr><th className="px-4 py-4 border-l w-16">م</th><th className="px-4 py-4 border-l">اسم المندوب</th><th className="px-4 py-4 border-l">رقم الهاتف</th><th className="px-4 py-4 border-l">خط السير / المنطقة</th><th className="px-4 py-4 border-l">المركبة</th><th className="px-4 py-4 border-l w-24 text-center">إجراءات</th></tr>`
);

// 6. Update expenses table
content = content.replace(
  /<tbody>\s*\{expenses\.length === 0 \?[\s\S]*?(?=<\/table>)/,
  `<tbody>
                  {expenses.length === 0 ? <tr><td colSpan="4" className="text-center py-16 text-slate-400">لا يوجد مصروفات مسجلة</td></tr> : 
                   expenses.map((exp, i) => (
                    <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 font-mono">{i + 1}</td>
                      <td className="px-4 py-3 border-l font-mono text-sm">{exp.date}</td>
                      <td className="px-4 py-3 border-l font-bold text-red-600 text-center">{Number(exp.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 border-l text-slate-600">{exp.notes || '—'}</td>
                      <td className="px-3 py-3 text-center border-l">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setActiveExpenseModal({ isOpen: true, data: exp })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => deleteArrayItem(setExpenses, exp.id, 'مسح هذا المصروف؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              `
);
// Also update expenses table header
content = content.replace(
  /<tr><th className="px-4 py-3.5 border-l w-16">م<\/th><th className="px-4 py-3.5 border-l w-40">التاريخ<\/th><th className="px-4 py-3.5 border-l w-40">المبلغ \(ج\.م\)<\/th><th className="px-4 py-3.5 border-l">البيان \/ ملاحظات<\/th><\/tr>/,
  `<tr><th className="px-4 py-3.5 border-l w-16">م</th><th className="px-4 py-3.5 border-l w-40">التاريخ</th><th className="px-4 py-3.5 border-l w-40">المبلغ (ج.م)</th><th className="px-4 py-3.5 border-l">البيان / ملاحظات</th><th className="px-4 py-3.5 border-l w-24 text-center">إجراءات</th></tr>`
);

// 7. Update salaries table
content = content.replace(
  /<tbody>\s*\{employeesList\.length === 0 \?[\s\S]*?(?=<\/table>)/,
  `<tbody>
                {employeesList.length === 0 ? <tr><td colSpan="8" className="text-center py-16 text-slate-400">لا يوجد بيانات للرواتب</td></tr> :
                 employeesList.map((emp, i) => (
                  <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 border-l font-bold text-slate-800">{emp.name || '—'}</td>
                    <td className="px-4 py-3 border-l text-center text-slate-600">{Number(emp.baseSalary || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 border-l text-center font-mono text-xs text-slate-500">{emp.ordersCount}</td>
                    <td className="px-4 py-3 border-l text-center font-semibold text-emerald-600">{Number(emp.totalCommissions || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 border-l text-center text-red-500">{Number(emp.deductions || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 border-l text-center text-amber-500">{Number(emp.advances || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 border-l text-center font-black text-indigo-700 bg-indigo-50/30">{Number(emp.netSalary || 0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-center border-l bg-white">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setActiveEmployeeModal({ isOpen: true, data: emp })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem(setEmployees, emp.id, 'مسح الموظف؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            `
);
// Also update salaries table header
content = content.replace(
  /<tr><th className="px-4 py-4 border-l w-12">م<\/th><th className="px-4 py-4 border-l">اسم الموظف<\/th><th className="px-4 py-4 border-l w-32">الراتب الأساسي<\/th><th className="px-4 py-4 border-l w-24">الطلبات<\/th><th className="px-4 py-4 border-l w-24">العمولات<\/th><th className="px-4 py-4 border-l w-24">خصومات<\/th><th className="px-4 py-4 border-l w-24">سلف<\/th><th className="px-4 py-4 border-l w-32 font-bold text-indigo-700">صافي المستحق<\/th><\/tr>/,
  `<tr><th className="px-4 py-4 border-l w-12">م</th><th className="px-4 py-4 border-l">اسم الموظف</th><th className="px-4 py-4 border-l w-32">الراتب الأساسي</th><th className="px-4 py-4 border-l w-24">الطلبات</th><th className="px-4 py-4 border-l w-24">العمولات</th><th className="px-4 py-4 border-l w-24">خصومات</th><th className="px-4 py-4 border-l w-24">سلف</th><th className="px-4 py-4 border-l w-32 font-bold text-indigo-700">صافي المستحق</th><th className="px-4 py-4 border-l w-24 text-center">إجراءات</th></tr>`
);

// 8. Add Modals at the end of the file, just inside the main wrapper
content = content.replace(
  "      </div>\n    </div>\n  );\n}\n\nexport default App;",
  `      </div>
      
      {/* Modals */}
      <MerchantModal isOpen={activeMerchantModal.isOpen} initialData={activeMerchantModal.data} onClose={() => setActiveMerchantModal({ isOpen: false, data: null })} onSave={(data) => handleSaveEntity(setMerchants, setActiveMerchantModal, data)} />
      <AgentModal isOpen={activeAgentModal.isOpen} initialData={activeAgentModal.data} onClose={() => setActiveAgentModal({ isOpen: false, data: null })} onSave={(data) => handleSaveEntity(setAgents, setActiveAgentModal, data)} />
      <ExpenseModal isOpen={activeExpenseModal.isOpen} initialData={activeExpenseModal.data} onClose={() => setActiveExpenseModal({ isOpen: false, data: null })} onSave={(data) => handleSaveEntity(setExpenses, setActiveExpenseModal, data)} />
      <EmployeeModal isOpen={activeEmployeeModal.isOpen} initialData={activeEmployeeModal.data} onClose={() => setActiveEmployeeModal({ isOpen: false, data: null })} onSave={(data) => handleSaveEntity(setEmployees, setActiveEmployeeModal, data)} />

    </div>
  );
}

export default App;`
);

fs.writeFileSync('src/App.jsx', content);
console.log("App.jsx updated successfully.");
