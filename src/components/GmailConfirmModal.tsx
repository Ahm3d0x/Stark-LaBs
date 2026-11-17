import React from 'react';
import { Mail, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Order } from '../types/store';
import { STORE_OWNER_EMAIL } from '../utils/storeLogic';

interface GmailConfirmModalProps {
  order: Order | null;
  hasAccessToken: boolean;
  isSending: boolean;
  error: string | null;
  onConfirmSend: (order: Order) => void;
  onCancel: () => void;
  onConnectGoogle: () => void;
}

export const GmailConfirmModal: React.FC<GmailConfirmModalProps> = ({
  order,
  hasAccessToken,
  isSending,
  error,
  onConfirmSend,
  onCancel,
  onConnectGoogle,
}) => {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gmail-confirm-title"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-base">
            <Mail className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <h3 id="gmail-confirm-title">تأكيد إرسال بريد تفاصيل الطلب عبر Gmail</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="إغلاق نافذة تأكيد البريد"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-zinc-300">
          <p className="leading-relaxed text-sm text-zinc-200">
            هل تؤكد إرسال رسالة بريد إلكتروني منظمة بتفاصيل الطلب رقم{' '}
            <strong className="font-mono-tabular text-amber-400">{order.orderNumber}</strong> إلى الطرفين عبر حساب Gmail الخاص بك؟
          </p>

          {/* Recipients Preview */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-400">المرسل إليه الأول (العميل):</span>
              <span className="font-mono-tabular text-zinc-100 font-medium">{order.customerEmail}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-400">المرسل إليه الثاني (إدارة StarkLaBs):</span>
              <span className="font-mono-tabular text-amber-400 font-medium">{STORE_OWNER_EMAIL}</span>
            </div>
            <div className="pt-2 border-t border-zinc-800/80 text-zinc-400">
              <span className="block mb-1 text-zinc-300 font-semibold">ملخص المحتوى المرسل:</span>
              <p className="text-zinc-400 leading-relaxed">{order.itemsSummary}</p>
              <p className="mt-1 font-mono-tabular text-zinc-200">
                الإجمالي النهائي: {order.totalAmount.toLocaleString('en-US')} ج.م · الحالة: {order.status}
              </p>
            </div>
          </div>

          {!hasAccessToken && (
            <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="text-amber-200 text-xs leading-relaxed">
                يتطلب الإرسال الفوري ربط صلاحية Gmail بحساب Google الخاص بك أولاً.
              </div>
              <button
                type="button"
                onClick={onConnectGoogle}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                ربط حساب Google
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3 text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSending}
            className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onConfirmSend(order)}
            disabled={isSending || !hasAccessToken}
            className="px-5 py-2 text-xs font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSending ? 'جاري الإرسال للطرفين...' : 'تأكيد وإرسال الإيميل للطرفين'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
