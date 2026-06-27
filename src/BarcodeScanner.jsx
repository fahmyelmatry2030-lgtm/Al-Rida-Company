import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, ScanLine, CheckCircle, Package, Search } from 'lucide-react';

export default function BarcodeScanner({ isOpen, onClose, onScan, orders }) {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [foundOrder, setFoundOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    
    let html5QrCode;
    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("barcode-reader");
        html5QrCodeRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 120 }, aspectRatio: 1.0 },
          (decodedText) => {
            handleCodeFound(decodedText);
            // Stop scanning after successful scan
            html5QrCode.stop().catch(() => {});
            setScanning(false);
          },
          () => {} // Ignore errors during scanning
        );
        setScanning(true);
      } catch (err) {
        console.log("Camera not available, using manual input");
        setScanning(false);
      }
    };

    const timer = setTimeout(startScanner, 300);
    
    return () => {
      clearTimeout(timer);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current = null;
      }
    };
  }, [isOpen]);

  const handleCodeFound = (code) => {
    setScannedCode(code);
    setError('');
    const order = orders.find(o => o.code === code || o.id === code);
    if (order) {
      setFoundOrder(order);
    } else {
      setError('لم يتم العثور على طلب بهذا الكود: ' + code);
      setFoundOrder(null);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeFound(manualCode.trim());
  };

  const handleStatusUpdate = (status) => {
    if (foundOrder) {
      onScan(foundOrder.id, status);
      setFoundOrder(null);
      setScannedCode('');
      setManualCode('');
      // Restart scanner
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 280, height: 120 } },
            (decodedText) => {
              handleCodeFound(decodedText);
              html5QrCodeRef.current.stop().catch(() => {});
              setScanning(false);
            },
            () => {}
          ).then(() => setScanning(true));
        } catch (e) {}
      }
    }
  };

  if (!isOpen) return null;

  const STATUS_QUICK = [
    { label: 'تم التسليم', value: 'تم التسليم', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { label: 'مؤجل', value: 'مؤجل', color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'لاغي', value: 'لاغي', color: 'bg-red-500 hover:bg-red-600' },
    { label: 'غير متاح', value: 'غير متاح', color: 'bg-slate-500 hover:bg-slate-600' },
    { label: 'عدم رد', value: 'عدم رد', color: 'bg-gray-500 hover:bg-gray-600' },
    { label: 'رفض', value: 'رفض شحن', color: 'bg-rose-500 hover:bg-rose-600' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-l from-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">ماسح الباركود</h2>
              <p className="text-white/60 text-xs">وجّه الكاميرا نحو الباركود</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Scanner Area */}
          <div className="relative bg-slate-900">
            <div id="barcode-reader" className="w-full" style={{ minHeight: '200px' }}></div>
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <div className="text-center text-white/50">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">الكاميرا غير متاحة</p>
                  <p className="text-xs mt-1">استخدم البحث اليدوي بالأسفل</p>
                </div>
              </div>
            )}
          </div>

          {/* Manual Search */}
          <div className="p-4 border-b border-slate-100">
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  placeholder="أدخل كود الطلب يدوياً..."
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                />
              </div>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors">
                بحث
              </button>
            </form>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold text-center">
              {error}
            </div>
          )}

          {/* Found Order */}
          {foundOrder && (
            <div className="p-4 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="font-bold text-emerald-700">تم العثور على الطلب!</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">الكود</p>
                    <p className="font-bold text-slate-800">{foundOrder.code}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">العميل</p>
                    <p className="font-bold text-slate-800">{foundOrder.customerName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">المنطقة</p>
                    <p className="font-bold text-slate-800">{foundOrder.center || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">المبلغ</p>
                    <p className="font-black text-indigo-700">{Number(foundOrder.total || 0).toLocaleString()} ج.م</p>
                  </div>
                </div>
              </div>

              {/* Quick Status Update */}
              <div>
                <p className="text-sm font-bold text-slate-600 mb-3">تحديث سريع للحالة:</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_QUICK.map(s => (
                    <button key={s.value} onClick={() => handleStatusUpdate(s.value)}
                      className={`${s.color} text-white py-2.5 rounded-xl font-bold text-xs transition-colors active:scale-95`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
