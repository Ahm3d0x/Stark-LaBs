import React, { useState } from 'react';
import { Search, Mail, PackageCheck, Clock, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { Order, OrderStatus } from '../types/store';

interface OrderTrackingViewProps {
  orders: Order[];
  onRequestGmailConfirmation: (order: Order) => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  orders,
  onRequestGmailConfirmation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter((ord) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      ord.orderNumber.toLowerCase().includes(q) ||
      ord.customerPhone.includes(q) ||
      ord.customerName.toLowerCase().includes(q) ||
      ord.customerEmail.toLowerCase().includes(q)
    );
  });

  const renderStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'قيد المراجعة':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'جاري الطباعة 3D':
        return <PackageCheck className="w-4 h-4 text-sky-400" />;
      case 'تم الشحن':
        return <Truck className="w-4 h-4 text-indigo-400" />;
      case 'مكتمل':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'ملغي':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 mb-2">
            متابعة حالة الطلبات
          </h1>
          <p className="text-sm text-zinc-400">
            ابحث برقم الطلب (مثال: SL-1041) أو رقم الهاتف لمتابعة مرحلة الطباعة ثلاثية الأبعاد والشحن.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الطلب أو الهاتف..."
            aria-label="ابحث برقم الطلب أو الهاتف"
            className="w-full pr-10 pl-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center space-y-2">
          <p className="text-sm font-bold text-zinc-300">لا توجد طلبات مطابقة لبحثك</p>
          <p className="text-xs text-zinc-500">تأكد من كتابة رقم الطلب مثل SL-1041 أو رقم الهاتف بشكل صحيح.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <article
              key={order.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center flex-wrap gap-3 text-xs text-zinc-400">
                  <span className="text-sm font-bold font-mono-tabular text-amber-400">
                    {order.orderNumber}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1.5 text-zinc-200 font-semibold">
                    {renderStatusIcon(order.status)}
                    <span>{order.status}</span>
                  </span>
                  <span>·</span>
                  <span>العميل: {order.customerName}</span>
                  <span>·</span>
                  <span className="font-mono-tabular">
                    {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">{order.itemsSummary}</p>

                <div className="text-xs text-zinc-400 flex items-center flex-wrap gap-3">
                  <span>العنوان: {order.shippingAddress}</span>
                  {order.notes && (
                    <>
                      <span>·</span>
                      <span>ملاحظات: {order.notes}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-800 shrink-0">
                <div className="text-left">
                  <span className="text-xs text-zinc-500 block">الإجمالي النهائي</span>
                  <span className="text-lg font-extrabold font-mono-tabular text-zinc-100">
                    {order.totalAmount.toLocaleString('en-US')} ج.م
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onRequestGmailConfirmation(order)}
                  className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {order.emailSent ? 'تم إرسال إيميل التأكيد (إعادة إرسال)' : 'إرسال إيميل التأكيد للطرفين'}
                  </span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
