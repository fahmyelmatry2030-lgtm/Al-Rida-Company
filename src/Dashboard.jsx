import React, { useMemo } from 'react';
import { Package, CheckCircle, Clock, XCircle, TrendingUp, Users, Truck, DollarSign, WalletCards, ArrowUpRight, ArrowDownRight, BarChart3, Store } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard({ orders, merchants, agents, expenses, companyProfits }) {
  const stats = useMemo(() => {
    let delivered = 0, pending = 0, cancelled = 0, totalCollected = 0;
    orders.forEach(o => {
      if (o.status === 'تم التسليم' || o.status === 'جزئي') delivered++;
      else if (['مؤجل', 'غير متاح', 'عدم رد', 'تهرب', 'نزول'].includes(o.status) || !o.status) pending++;
      else if (['لاغي', 'رفض شحن'].includes(o.status)) cancelled++;
      totalCollected += Number(o.collected) || 0;
    });
    const deliveryRate = orders.length > 0 ? Math.round((delivered / orders.length) * 100) : 0;
    return { delivered, pending, cancelled, totalOrders: orders.length, totalCollected, deliveryRate };
  }, [orders]);

  // Chart: orders per day (last 14 days)
  const dailyChart = useMemo(() => {
    const dates = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dates[key] = { date: key, label: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }), orders: 0, revenue: 0, delivered: 0 };
    }
    orders.forEach(o => {
      if (dates[o.date]) {
        dates[o.date].orders += 1;
        dates[o.date].revenue += (Number(o.collected) || 0) - (Number(o.commission) || 0);
        if (o.status === 'تم التسليم') dates[o.date].delivered += 1;
      }
    });
    return Object.values(dates);
  }, [orders]);

  // Top agents
  const topAgents = useMemo(() => {
    const agentMap = {};
    orders.forEach(o => {
      if (!o.agent) return;
      if (!agentMap[o.agent]) agentMap[o.agent] = { name: o.agent, total: 0, delivered: 0, revenue: 0 };
      agentMap[o.agent].total++;
      if (o.status === 'تم التسليم') agentMap[o.agent].delivered++;
      agentMap[o.agent].revenue += (Number(o.collected) || 0) - (Number(o.commission) || 0);
    });
    return Object.values(agentMap).sort((a, b) => b.delivered - a.delivered).slice(0, 5);
  }, [orders]);

  // Status distribution for pie chart
  const statusPie = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const s = o.status || 'بدون حالة';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Top companies
  const topCompanies = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (!o.company) return;
      if (!map[o.company]) map[o.company] = { name: o.company, count: 0, revenue: 0 };
      map[o.company].count++;
      map[o.company].revenue += (Number(o.collected) || 0) - (Number(o.commission) || 0);
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [orders]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-4 min-w-[160px]" dir="rtl">
        <p className="text-sm font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-1">
            <span className="text-xs text-slate-500">{p.name}</span>
            <span className="text-sm font-bold" style={{ color: p.color }}>{Number(p.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: Package, color: 'from-indigo-500 to-indigo-600', iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-500' },
          { label: 'تم التسليم', value: stats.delivered, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', sub: `${stats.deliveryRate}% نسبة التسليم` },
          { label: 'مؤجل / معلق', value: stats.pending, icon: Clock, color: 'from-amber-500 to-amber-600', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
          { label: 'مرتجعات وإلغاء', value: stats.cancelled, icon: XCircle, color: 'from-red-500 to-red-600', iconBg: 'bg-red-500/10', iconColor: 'text-red-500' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-800 mb-1">{card.value.toLocaleString()}</h3>
              <p className="text-sm font-medium text-slate-400">{card.label}</p>
              {card.sub && <p className="text-xs font-bold text-emerald-500 mt-2 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> {card.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Financial Overview + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Profit Card */}
        <div className="space-y-4">
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-10 translate-y-10"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
                  <WalletCards className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-white/80">صافي الأرباح</span>
              </div>
              <p className="text-4xl font-black tracking-tight">{companyProfits.netProfit.toLocaleString()}</p>
              <p className="text-white/50 text-sm mt-1">جنيه مصري</p>
              <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/50 text-xs mb-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> الإيرادات</p>
                  <p className="font-bold text-lg">{companyProfits.totalCompanyNet.toLocaleString()}</p>
                </div>
                <div className="text-left">
                  <p className="text-white/50 text-xs mb-1 flex items-center gap-1"><ArrowDownRight className="w-3 h-3"/> المصروفات</p>
                  <p className="font-bold text-lg text-red-300">{companyProfits.totalExpenses.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-slate-400 mb-3">
                <Store className="w-4 h-4" />
                <span className="text-xs font-semibold">التجار</span>
              </div>
              <h4 className="text-2xl font-black text-slate-800">{merchants.length}</h4>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-slate-400 mb-3">
                <Truck className="w-4 h-4" />
                <span className="text-xs font-semibold">المناديب</span>
              </div>
              <h4 className="text-2xl font-black text-slate-800">{agents.length}</h4>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
              </div>
              حركة الطلبات (آخر 14 يوم)
            </h3>
          </div>
          <div className="h-72 w-full" dir="ltr">
            {dailyChart.some(d => d.orders > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dx={-5} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="orders" name="عدد الطلبات" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradRevenue)" />
                  <Area type="monotone" dataKey="delivered" name="تم التسليم" stroke="#10b981" strokeWidth={2} fill="url(#gradDelivered)" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-semibold">لا توجد بيانات كافية لعرض الرسم البياني</p>
                  <p className="text-slate-300 text-sm mt-1">أضف طلبات لتظهر الإحصائيات هنا</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Agents + Status + Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top Agents */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            أفضل المناديب
          </h3>
          {topAgents.length === 0 ? (
            <p className="text-slate-300 text-center py-8 text-sm">لا توجد بيانات</p>
          ) : (
            <div className="space-y-3">
              {topAgents.map((agent, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500' : i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' : 'bg-gradient-to-br from-orange-300 to-orange-400'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{agent.name}</p>
                    <p className="text-xs text-slate-400">{agent.total} طلب • {agent.delivered} تسليم</p>
                  </div>
                  <span className="text-sm font-black text-emerald-600">{agent.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-sky-500" />
            </div>
            توزيع الحالات
          </h3>
          {statusPie.length === 0 ? (
            <p className="text-slate-300 text-center py-8 text-sm">لا توجد بيانات</p>
          ) : (
            <>
              <div className="h-44" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                      {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => v.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-2">
                {statusPie.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></div>
                      <span className="text-slate-600">{s.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top Companies */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Store className="w-4 h-4 text-emerald-500" />
            </div>
            أكثر الشركات طلبات
          </h3>
          {topCompanies.length === 0 ? (
            <p className="text-slate-300 text-center py-8 text-sm">لا توجد بيانات</p>
          ) : (
            <div className="space-y-3">
              {topCompanies.map((company, i) => {
                const maxCount = topCompanies[0]?.count || 1;
                const pct = Math.round((company.count / maxCount) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-700 truncate">{company.name}</span>
                      <span className="text-xs font-bold text-slate-500">{company.count} طلب</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
