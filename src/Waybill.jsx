import React, { useRef } from 'react';
import Barcode from 'react-barcode';
import { Printer, X, Phone, MapPin, Package, DollarSign } from 'lucide-react';

export default function Waybill({ order, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>بوليصة شحن - ${order.code}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; padding: 10mm; background: #fff; color: #1e293b; }
          .waybill { border: 2px solid #1e293b; border-radius: 8px; overflow: hidden; max-width: 380px; margin: auto; }
          .header { background: #1e293b; color: #fff; padding: 12px 16px; text-align: center; }
          .header h1 { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
          .header p { font-size: 10px; opacity: 0.7; margin-top: 2px; }
          .barcode-area { text-align: center; padding: 12px 0 8px; border-bottom: 1px dashed #cbd5e1; }
          .barcode-area svg { max-width: 90%; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px dashed #cbd5e1; }
          .info-cell { padding: 8px 12px; border-left: 1px dashed #cbd5e1; }
          .info-cell:nth-child(even) { border-left: none; }
          .info-cell .label { font-size: 9px; color: #94a3b8; font-weight: 600; margin-bottom: 2px; }
          .info-cell .value { font-size: 13px; font-weight: 700; color: #1e293b; }
          .full-row { padding: 8px 12px; border-bottom: 1px dashed #cbd5e1; }
          .full-row .label { font-size: 9px; color: #94a3b8; font-weight: 600; margin-bottom: 2px; }
          .full-row .value { font-size: 13px; font-weight: 700; color: #1e293b; }
          .amount-box { background: #f8fafc; padding: 14px 16px; text-align: center; border-bottom: 1px dashed #cbd5e1; }
          .amount-box .label { font-size: 11px; color: #64748b; font-weight: 600; }
          .amount-box .value { font-size: 28px; font-weight: 900; color: #1e293b; }
          .amount-box .currency { font-size: 14px; font-weight: 600; color: #94a3b8; }
          .footer { padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94a3b8; }
          .sig-line { border-top: 1px solid #cbd5e1; width: 80px; margin-top: 20px; text-align: center; padding-top: 4px; font-size: 9px; color: #94a3b8; }
          .notes { background: #fffbeb; padding: 8px 12px; font-size: 11px; color: #92400e; border-bottom: 1px dashed #cbd5e1; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  if (!order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-black text-slate-800">معاينة بوليصة الشحن</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors">
              <Printer className="w-4 h-4" /> طباعة
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Waybill Preview */}
        <div className="p-6 overflow-y-auto bg-slate-100">
          <div ref={printRef}>
            <div className="waybill" style={{border: '2px solid #1e293b', borderRadius: '8px', overflow: 'hidden', maxWidth: '380px', margin: 'auto', background: '#fff'}}>
              
              {/* Company Header */}
              <div style={{background: '#1e293b', color: '#fff', padding: '12px 16px', textAlign: 'center'}}>
                <h1 style={{fontSize: '18px', fontWeight: 900, letterSpacing: '1px', fontFamily: 'Cairo, sans-serif'}}>شركة الرضا للشحن</h1>
                <p style={{fontSize: '10px', opacity: 0.7, marginTop: '2px'}}>Al-Rida Shipping Company</p>
              </div>

              {/* Barcode */}
              <div style={{textAlign: 'center', padding: '12px 0 8px', borderBottom: '1px dashed #cbd5e1'}}>
                <Barcode value={order.code || order.id || '0000'} width={2} height={50} fontSize={12} margin={0} displayValue={true} />
              </div>

              {/* Order Info Grid */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px dashed #cbd5e1'}}>
                <div style={{padding: '8px 12px', borderLeft: '1px dashed #cbd5e1'}}>
                  <div style={{fontSize: '9px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px'}}>التاريخ</div>
                  <div style={{fontSize: '13px', fontWeight: 700, color: '#1e293b'}}>{order.date}</div>
                </div>
                <div style={{padding: '8px 12px'}}>
                  <div style={{fontSize: '9px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px'}}>الراسل / التاجر</div>
                  <div style={{fontSize: '13px', fontWeight: 700, color: '#1e293b'}}>{order.company || order.sender || '—'}</div>
                </div>
              </div>

              {/* Customer Info */}
              <div style={{padding: '8px 12px', borderBottom: '1px dashed #cbd5e1'}}>
                <div style={{fontSize: '9px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px'}}>اسم العميل</div>
                <div style={{fontSize: '15px', fontWeight: 800, color: '#1e293b'}}>{order.customerName || '—'}</div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px dashed #cbd5e1'}}>
                <div style={{padding: '8px 12px', borderLeft: '1px dashed #cbd5e1'}}>
                  <div style={{fontSize: '9px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px'}}>📞 رقم الهاتف</div>
                  <div style={{fontSize: '13px', fontWeight: 700, color: '#1e293b'}} dir="ltr">{order.phone || '—'}</div>
                </div>
                <div style={{padding: '8px 12px'}}>
                  <div style={{fontSize: '9px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px'}}>📍 المنطقة</div>
                  <div style={{fontSize: '13px', fontWeight: 700, color: '#1e293b'}}>{order.center || '—'}</div>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px dashed #cbd5e1'}}>
                <div style={{padding: '8px 12px', borderLeft: '1px dashed #cbd5e1'}}>
                  <div style={{fontSize: '9px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px'}}>📦 عدد القطع</div>
                  <div style={{fontSize: '13px', fontWeight: 700, color: '#1e293b'}}>{order.count || 1}</div>
                </div>
                <div style={{padding: '8px 12px'}}>
                  <div style={{fontSize: '9px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px'}}>🚚 المندوب</div>
                  <div style={{fontSize: '13px', fontWeight: 700, color: '#1e293b'}}>{order.agent || '—'}</div>
                </div>
              </div>

              {/* Amount to Collect */}
              <div style={{background: '#f8fafc', padding: '14px 16px', textAlign: 'center', borderBottom: '1px dashed #cbd5e1'}}>
                <div style={{fontSize: '11px', color: '#64748b', fontWeight: 600}}>💰 المبلغ المطلوب تحصيله</div>
                <div style={{fontSize: '28px', fontWeight: 900, color: '#1e293b'}}>
                  {Number(order.total || 0).toLocaleString()} <span style={{fontSize: '14px', fontWeight: 600, color: '#94a3b8'}}>ج.م</span>
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <div style={{background: '#fffbeb', padding: '8px 12px', fontSize: '11px', color: '#92400e', borderBottom: '1px dashed #cbd5e1'}}>
                  <strong>ملاحظات:</strong> {order.notes}
                </div>
              )}

              {/* Footer */}
              <div style={{padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '9px', color: '#94a3b8'}}>
                <div>
                  <div style={{borderTop: '1px solid #cbd5e1', width: '80px', marginTop: '20px', textAlign: 'center', paddingTop: '4px'}}>توقيع المستلم</div>
                </div>
                <div style={{textAlign: 'left', fontSize: '8px'}}>
                  <div>كود: {order.code || order.id}</div>
                  <div>{new Date().toLocaleDateString('ar-EG')}</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
