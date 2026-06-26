import React, { useMemo } from 'react';
import { Package, CheckCircle, Clock, XCircle, TrendingUp, Users, Truck, DollarSign, WalletCards } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard({ orders, merchants, agents, expenses, companyProfits }) {
  // Calculate top-level stats
  const stats = useMemo(() => {
    let delivered = 0;
    let pending = 0;
    let cancelled = 0;
    let totalRevenue = 0;
    let totalCollected = 0;

    orders.forEach(o => {
      if (o.status === 'تم التسليم') delivered++;
      else if (['مؤجل', 'غير متاح', 'عدم رد', 'تهرب'].includes(o.status) || !o.status) pending++;
      else if (['لاغي', 'رفض شحن'].includes(o.status)) cancelled++;

      totalCollected += Number(o.collected) || 0;
      totalRevenue += (Number(o.collected) || 0) - (Number(o.commission) || 0);
    });

    return { delivered, pending, cancelled, totalOrders: orders.length, totalCollected, totalRevenue };
  }, [orders]);

  // Generate chart data (orders per day)
  const chartData = useMemo(() => {
    const dates = {};
    orders.forEach(o => {
      if (!dates[o.date]) dates[o.date] = { date: o.date, orders: 0, revenue: 0 };
      dates[o.date].orders += 1;
      dates[o.date].revenue += (Number(o.collected) || 0) - (Number(o.commission) || 0);
    });
    // Sort by date and take the last 7 days
    return Object.values(dates).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-7);
  }, [orders]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">إجمالي الطلبات</p>
            <h3 className="text-3xl font-black text-slate-800">{stats.totalOrders}</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">تم التسليم</p>
            <h3 className="text-3xl font-black text-emerald-600">{stats.delivered}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">مؤجل / قيد الانتظار</p>
            <h3 className="text-3xl font-black text-amber-500">{stats.pending}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">مرتجعات وإلغاء</p>
            <h3 className="text-3xl font-black text-red-500">{stats.cancelled}</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Financial Overview & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left side: Financial summary */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
            <h3 className="text-indigo-100 font-medium mb-4 flex items-center gap-2"><WalletCards className="w-5 h-5"/> صافي الأرباح (بعد المصروفات)</h3>
            <p className="text-4xl font-black">{companyProfits.netProfit.toLocaleString()} <span className="text-lg font-normal opacity-70">ج.م</span></p>
            
            <div className="mt-6 pt-6 border-t border-indigo-500/30 flex justify-between">
              <div>
                <p className="text-indigo-200 text-xs mb-1">أرباح الشحنات</p>
                <p className="font-bold">{companyProfits.totalCompanyNet.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-indigo-200 text-xs mb-1">المصروفات</p>
                <p className="font-bold text-red-300">{companyProfits.totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 mb-2"><Users className="w-4 h-4"/> <span className="text-sm">التجار</span></div>
              <h4 className="text-xl font-bold text-slate-800">{merchants.length}</h4>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 mb-2"><Truck className="w-4 h-4"/> <span className="text-sm">المناديب</span></div>
              <h4 className="text-xl font-bold text-slate-800">{agents.length}</h4>
            </div>
          </div>
        </div>

        {/* Right side: Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500"/> حركة الطلبات والأرباح (آخر 7 أيام)</h3>
          </div>
          
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={10} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  labelStyle={{fontWeight: 'bold', color: '#1e293b', marginBottom: '8px'}}
                />
                <Area yAxisId="left" type="monotone" dataKey="revenue" name="الأرباح" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area yAxisId="right" type="monotone" dataKey="orders" name="عدد الطلبات" stroke="#cbd5e1" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
