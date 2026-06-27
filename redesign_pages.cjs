const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// ============ MERCHANTS PAGE ============
const oldMerchants = `        {activeTab === 'merchants' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1">
            <table className="w-full text-sm text-right">
              <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                <tr><th className="px-4 py-4 border-l w-16">م</th><th className="px-4 py-4 border-l">اسم التاجر / الشركة</th><th className="px-4 py-4 border-l">رقم الهاتف</th><th className="px-4 py-4 border-l min-w-[200px]">العنوان</th><th className="px-4 py-4 border-l w-32">سعر الشحن</th><th className="px-4 py-4 border-l w-24 text-center">إجراءات</th></tr>
              </thead>
              <tbody>
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
                        <button onClick={() => deleteArrayItem('merchants', m.id, 'مسح هذا التاجر؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}`;

const newMerchants = `        {activeTab === 'merchants' && (
          <div className="space-y-4">
            {merchants.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4"><Store className="w-8 h-8 text-indigo-300" /></div>
                <p className="text-slate-400 font-semibold">لا يوجد تجار بعد</p>
                <p className="text-slate-300 text-sm mt-1">اضغط "إضافة تاجر" للبدء</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {merchants.map((m, i) => (
                  <div key={m.id} className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-300 hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/20">
                          {(m.name || 'T').charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800">{m.name || '—'}</h3>
                          <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{m.phone || 'لا يوجد هاتف'}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setActiveMerchantModal({ isOpen: true, data: m })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem('merchants', m.id, 'مسح هذا التاجر؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 mb-1">العنوان</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{m.address || '—'}</p>
                      </div>
                      <div className="bg-indigo-50 rounded-xl p-3">
                        <p className="text-xs text-indigo-400 mb-1">سعر الشحن</p>
                        <p className="text-sm font-black text-indigo-700">{Number(m.rate || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span></p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}`;

// ============ AGENTS PAGE ============
const oldAgents = `        {/* ============ AGENTS ============ */}
        {activeTab === 'agents' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1">
            <table className="w-full text-sm text-right">
              <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                <tr><th className="px-4 py-4 border-l w-16">م</th><th className="px-4 py-4 border-l">اسم المندوب</th><th className="px-4 py-4 border-l">رقم الهاتف</th><th className="px-4 py-4 border-l">خط السير / المنطقة</th><th className="px-4 py-4 border-l">المركبة</th><th className="px-4 py-4 border-l w-24 text-center">إجراءات</th></tr>
              </thead>
              <tbody>
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
                        <button onClick={() => deleteArrayItem('agents', a.id, 'مسح هذا المندوب؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}`;

const newAgents = `        {/* ============ AGENTS ============ */}
        {activeTab === 'agents' && (
          <div className="space-y-4">
            {agents.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4"><Truck className="w-8 h-8 text-emerald-300" /></div>
                <p className="text-slate-400 font-semibold">لا يوجد مناديب بعد</p>
                <p className="text-slate-300 text-sm mt-1">اضغط "إضافة مندوب" للبدء</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agents.map((a, i) => {
                  const agentOrders = orders.filter(o => o.agent === a.name);
                  const delivered = agentOrders.filter(o => o.status === 'تم التسليم').length;
                  const rate = agentOrders.length > 0 ? Math.round((delivered / agentOrders.length) * 100) : 0;
                  return (
                    <div key={a.id} className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:border-emerald-100 transition-all duration-300 hover:-translate-y-0.5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-500/20">
                            {(a.name || 'A').charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800">{a.name || '—'}</h3>
                            <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{a.phone || 'لا يوجد هاتف'}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setActiveAgentModal({ isOpen: true, data: a })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => deleteArrayItem('agents', a.id, 'مسح هذا المندوب؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-slate-400">طلبات</p>
                          <p className="font-black text-slate-800">{agentOrders.length}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-emerald-500">تسليم</p>
                          <p className="font-black text-emerald-700">{delivered}</p>
                        </div>
                        <div className="bg-indigo-50 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-indigo-400">نسبة</p>
                          <p className="font-black text-indigo-700">{rate}%</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                        <span>📍 {a.zone || 'لا توجد منطقة'}</span>
                        <span>🚗 {a.vehicle || '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}`;

// ============ EXPENSES PAGE ============
const oldExpenses = `        {/* ============ EXPENSES ============ */}
        {activeTab === 'expenses' && (
          <div className="flex flex-col gap-5 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-emerald-500" /></div>
                  <span className="text-sm font-semibold text-slate-500">أرباح الشحنات</span>
                </div>
                <p className="text-3xl font-black text-slate-800">{companyProfits.totalCompanyNet.toLocaleString()} <span className="text-sm font-normal text-slate-400">ج.م</span></p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><ArrowDownRight className="w-4 h-4 text-red-500" /></div>
                  <span className="text-sm font-semibold text-red-400">إجمالي المصروفات</span>
                </div>
                <p className="text-3xl font-black text-red-600">{companyProfits.totalExpenses.toLocaleString()} <span className="text-sm font-normal text-red-400">ج.م</span></p>
              </div>
              <div className={\`rounded-2xl p-5 shadow-lg border relative overflow-hidden \${companyProfits.netProfit >= 0 ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white border-indigo-400/20' : 'bg-gradient-to-br from-red-600 to-rose-700 text-white border-red-400/20'}\`}>
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-12 -translate-y-12"></div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-white" /></div>
                  <span className="text-sm font-semibold text-white/70">صافي الربح</span>
                </div>
                <p className="text-3xl font-black">{companyProfits.netProfit.toLocaleString()} <span className="text-sm font-normal opacity-70">ج.م</span></p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-4 bg-slate-50/50 border-b border-slate-200"><h3 className="font-bold text-slate-700 text-sm">سجل المصروفات</h3></div>
              <table className="w-full text-sm text-right">
                <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                  <tr><th className="px-4 py-3.5 border-l w-16">م</th><th className="px-4 py-3.5 border-l w-40">التاريخ</th><th className="px-4 py-3.5 border-l w-40">المبلغ (ج.م)</th><th className="px-4 py-3.5 border-l">البيان / ملاحظات</th><th className="px-4 py-3.5 border-l w-24 text-center">إجراءات</th></tr>
                </thead>
                <tbody>
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
                          <button onClick={() => deleteArrayItem('expenses', exp.id, 'مسح هذا المصروف؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}`;

const newExpenses = `        {/* ============ EXPENSES ============ */}
        {activeTab === 'expenses' && (
          <div className="flex flex-col gap-5 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 hover:shadow-md transition-all hover:-translate-y-0.5 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><ArrowUpRight className="w-5 h-5 text-emerald-500" /></div>
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">إيرادات</span>
                </div>
                <p className="text-3xl font-black text-slate-800">{companyProfits.totalCompanyNet.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">أرباح الشحنات • ج.م</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100 hover:shadow-md transition-all hover:-translate-y-0.5 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><ArrowDownRight className="w-5 h-5 text-red-500" /></div>
                  <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">مصروفات</span>
                </div>
                <p className="text-3xl font-black text-red-600">{companyProfits.totalExpenses.toLocaleString()}</p>
                <p className="text-xs text-red-400 mt-1">إجمالي المصروفات • ج.م</p>
              </div>
              <div className={\`rounded-2xl p-5 shadow-xl border relative overflow-hidden transition-all hover:-translate-y-0.5 duration-200 \${companyProfits.netProfit >= 0 ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white border-indigo-500/20 shadow-indigo-500/25' : 'bg-gradient-to-br from-red-600 to-rose-700 text-white border-red-500/20 shadow-red-500/25'}\`}>
                <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 translate-y-8"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-white" /></div>
                  <span className="text-xs font-bold text-white/70 bg-white/10 px-2 py-1 rounded-lg">صافي الربح</span>
                </div>
                <p className="text-3xl font-black relative z-10">{companyProfits.netProfit.toLocaleString()}</p>
                <p className="text-xs text-white/50 mt-1 relative z-10">بعد خصم المصروفات • ج.م</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Receipt className="w-4 h-4 text-red-500" /></div>
                <h3 className="font-bold text-slate-800">سجل المصروفات</h3>
                <span className="mr-auto text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{expenses.length} مصروف</span>
              </div>
              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-3"><Receipt className="w-7 h-7 text-red-200" /></div>
                  <p className="text-slate-400 font-semibold">لا توجد مصروفات مسجلة</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {expenses.map((exp, i) => (
                    <div key={exp.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 text-red-500 font-black text-sm">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{exp.notes || 'بدون بيان'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{exp.date}</p>
                      </div>
                      <p className="font-black text-xl text-red-600 shrink-0">{Number(exp.amount || 0).toLocaleString()} <span className="text-xs font-normal text-red-400">ج.م</span></p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => setActiveExpenseModal({ isOpen: true, data: exp })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteArrayItem('expenses', exp.id, 'مسح هذا المصروف؟')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}`;

// ============ SALARIES PAGE ============
const oldSalaries = `        {/* ============ SALARIES ============ */}
        {activeTab === 'salaries' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gradient-to-l from-slate-50 to-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 border-l w-16 text-center">م</th>
                    <th className="px-4 py-3.5 border-l min-w-[200px]">اسم الموظف</th>
                    <th className="px-4 py-3.5 border-l text-center">الأوردرات</th>
                    <th className="px-4 py-3.5 border-l text-center text-emerald-600">عمولات</th>
                    <th className="px-4 py-3.5 border-l text-center">الراتب الأساسي</th>
                    <th className="px-4 py-3.5 border-l text-center text-red-500">خصومات</th>
                    <th className="px-4 py-3.5 border-l text-center text-amber-600">سلف</th>
                    <th className="px-4 py-3.5 text-center text-indigo-700 font-bold">الصافي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeesList.length === 0 ? <tr><td colSpan="8" className="text-center py-16 text-slate-400">لا يوجد موظفين. اضغط "إضافة موظف"</td></tr> : 
                   employeesList.map((emp, index) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-4 border-l text-center text-slate-400 relative"><button onClick={() => deleteArrayItem(setEmployees, emp.id, 'مسح هذا الموظف؟')} className="absolute right-2 top-4 text-red-300 hover:text-red-600 hidden group-hover:block"><Trash2 className="w-4 h-4"/></button><span>{index + 1}</span></td>
                      <td className="px-2 border-l p-2"><input list="agents-list" type="text" value={emp.name} onChange={e => handleArrayChange(setEmployees, emp.id, 'name', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 px-3 py-2 outline-none focus:bg-white rounded-lg font-bold text-slate-800 transition-colors" placeholder="اسم الموظف" /></td>
                      <td className="px-4 py-4 border-l text-center font-medium text-slate-600">{emp.ordersCount > 0 ? emp.ordersCount : '—'}</td>
                      <td className="px-4 py-4 border-l text-center font-bold text-emerald-600">{emp.totalCommissions > 0 ? emp.totalCommissions.toLocaleString() : '—'}</td>
                      <td className="px-2 border-l p-2 text-center"><input type="number" value={emp.baseSalary || ''} onChange={e => handleArrayChange(setEmployees, emp.id, 'baseSalary', e.target.value)} className="w-full max-w-[100px] bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 px-3 py-2 outline-none focus:bg-white rounded-lg text-center transition-colors" placeholder="0" /></td>
                      <td className="px-2 border-l p-2 text-center"><input type="number" value={emp.deductions || ''} onChange={e => handleArrayChange(setEmployees, emp.id, 'deductions', e.target.value)} className="w-full max-w-[100px] bg-transparent border border-transparent hover:border-red-200 focus:border-red-300 text-red-600 px-3 py-2 outline-none focus:bg-white rounded-lg text-center transition-colors" placeholder="0" /></td>
                      <td className="px-2 border-l p-2 text-center"><input type="number" value={emp.advances || ''} onChange={e => handleArrayChange(setEmployees, emp.id, 'advances', e.target.value)} className="w-full max-w-[100px] bg-transparent border border-transparent hover:border-amber-200 focus:border-amber-300 text-amber-600 px-3 py-2 outline-none focus:bg-white rounded-lg text-center transition-colors" placeholder="0" /></td>
                      <td className="px-4 py-4 text-center font-black text-xl text-indigo-700">{emp.netSalary.toLocaleString()} <span className="text-xs font-medium text-indigo-400">ج.م</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}`;

const newSalaries = `        {/* ============ SALARIES ============ */}
        {activeTab === 'salaries' && (
          <div className="flex flex-col gap-5">
            {employeesList.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4"><WalletCards className="w-8 h-8 text-indigo-300" /></div>
                <p className="text-slate-400 font-semibold">لا يوجد موظفين</p>
                <p className="text-slate-300 text-sm mt-1">اضغط "إضافة موظف" للبدء</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {employeesList.map((emp, index) => (
                  <div key={emp.id} className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-purple-500/20">
                            {(emp.name || 'م').charAt(0)}
                          </div>
                          <input list="agents-list" type="text" value={emp.name} onChange={e => handleArrayChange(setEmployees, emp.id, 'name', e.target.value)}
                            className="font-black text-slate-800 bg-transparent border-b-2 border-transparent hover:border-indigo-200 focus:border-indigo-400 outline-none transition-colors text-base" placeholder="اسم الموظف" />
                        </div>
                        <button onClick={() => deleteArrayItem(setEmployees, emp.id, 'مسح هذا الموظف؟')}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-xs text-slate-400 mb-1">📦 الأوردرات</p>
                          <p className="font-black text-slate-800">{emp.ordersCount > 0 ? emp.ordersCount : '—'}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3">
                          <p className="text-xs text-emerald-500 mb-1">💰 عمولات</p>
                          <p className="font-black text-emerald-700">{emp.totalCommissions > 0 ? emp.totalCommissions.toLocaleString() : '—'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-50 rounded-xl p-2.5">
                          <p className="text-xs text-slate-400 mb-1.5">الراتب الأساسي</p>
                          <input type="number" value={emp.baseSalary || ''} onChange={e => handleArrayChange(setEmployees, emp.id, 'baseSalary', e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-indigo-400 rounded-lg px-2 py-1.5 text-sm text-center font-bold outline-none transition-colors" placeholder="0" />
                        </div>
                        <div className="bg-red-50 rounded-xl p-2.5">
                          <p className="text-xs text-red-400 mb-1.5">خصومات</p>
                          <input type="number" value={emp.deductions || ''} onChange={e => handleArrayChange(setEmployees, emp.id, 'deductions', e.target.value)}
                            className="w-full bg-white border border-red-200 focus:border-red-400 rounded-lg px-2 py-1.5 text-sm text-center font-bold text-red-600 outline-none transition-colors" placeholder="0" />
                        </div>
                        <div className="bg-amber-50 rounded-xl p-2.5">
                          <p className="text-xs text-amber-500 mb-1.5">سلف</p>
                          <input type="number" value={emp.advances || ''} onChange={e => handleArrayChange(setEmployees, emp.id, 'advances', e.target.value)}
                            className="w-full bg-white border border-amber-200 focus:border-amber-400 rounded-lg px-2 py-1.5 text-sm text-center font-bold text-amber-600 outline-none transition-colors" placeholder="0" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-l from-indigo-600 to-purple-600 px-5 py-3.5 flex items-center justify-between">
                      <span className="text-white/70 text-sm font-semibold">الصافي</span>
                      <span className="text-white font-black text-xl">{emp.netSalary.toLocaleString()} <span className="text-xs font-normal text-white/60">ج.م</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}`;

c = c.replace(oldMerchants, newMerchants);
c = c.replace(oldAgents, newAgents);
c = c.replace(oldExpenses, newExpenses);
c = c.replace(oldSalaries, newSalaries);

fs.writeFileSync('src/App.jsx', c);
console.log('All 4 pages redesigned!');
