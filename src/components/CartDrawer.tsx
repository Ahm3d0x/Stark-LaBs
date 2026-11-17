import React, { useEffect, useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle2,
  Mail,
  ArrowLeft,
  UserCheck,
  History,
  Star,
  Send,
  Box,
} from 'lucide-react';
import {
  CartHistoryEntry,
  CartItem,
  CheckoutFormInput,
  EGYPT_GOVERNORATES,
  Order,
  ProductReview,
  ReviewFormInput,
} from '../types/store';
import {
  calculateCartTotals,
  calculateDiscountedPrice,
  loadCustomerInfoFromStorage,
  saveCustomerInfoToStorage,
  STORE_OWNER_EMAIL,
  validateCheckoutInput,
  validateReviewInput,
} from '../utils/storeLogic';

export type CartDrawerTab = 'items' | 'customer' | 'history';

interface CartDrawerProps {
  isOpen: boolean;
  initialTab?: CartDrawerTab;
  onClose: () => void;
  items: CartItem[];
  cartHistory: CartHistoryEntry[];
  reviews: ProductReview[];
  onUpdateQuantity: (productId: string, color: string, delta: number) => void;
  onRemoveItem: (productId: string, color: string) => void;
  onSubmitOrder: (input: CheckoutFormInput) => Promise<Order>;
  onAddVerifiedReview: (input: ReviewFormInput) => Promise<void> | void;
  onRequestGmailConfirmation: (order: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  initialTab = 'items',
  onClose,
  items,
  cartHistory,
  reviews,
  onUpdateQuantity,
  onRemoveItem,
  onSubmitOrder,
  onAddVerifiedReview,
  onRequestGmailConfirmation,
}) => {
  const [activeTab, setActiveTab] = useState<CartDrawerTab>(initialTab);

  // Customer info initialized from browser LocalStorage for future orders
  const [formInput, setFormInput] = useState<CheckoutFormInput>(() => {
    const saved = loadCustomerInfoFromStorage();
    return {
      customerName: saved.customerName,
      customerPhone: saved.customerPhone,
      customerEmail: saved.customerEmail,
      governorate: saved.governorate || 'القاهرة',
      shippingAddress: saved.shippingAddress,
      notes: saved.notes || '',
    };
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormInput, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Per-item review draft state inside Cart History (`${orderId}::${productId}`)
  const [activeReviewKey, setActiveReviewKey] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Persist customer info in browser LocalStorage whenever fields change
  useEffect(() => {
    saveCustomerInfoToStorage({
      customerName: formInput.customerName,
      customerPhone: formInput.customerPhone,
      customerEmail: formInput.customerEmail,
      governorate: formInput.governorate || 'القاهرة',
      shippingAddress: formInput.shippingAddress,
      notes: formInput.notes,
    });
  }, [
    formInput.customerName,
    formInput.customerPhone,
    formInput.customerEmail,
    formInput.governorate,
    formInput.shippingAddress,
    formInput.notes,
  ]);

  if (!isOpen) return null;

  const { subtotal, discountTotal, totalAmount, itemsCount } = calculateCartTotals(items);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCheckoutInput(formInput);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      // Save customer info to LocalStorage so next orders are pre-filled
      saveCustomerInfoToStorage({
        customerName: formInput.customerName,
        customerPhone: formInput.customerPhone,
        customerEmail: formInput.customerEmail,
        governorate: formInput.governorate || 'القاهرة',
        shippingAddress: formInput.shippingAddress,
        notes: '',
      });
      const created = await onSubmitOrder(formInput);
      setCompletedOrder(created);
      setFormInput((prev) => ({
        ...prev,
        notes: '',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHistoryReviewSubmit = async (
    e: React.FormEvent,
    orderId: string,
    productId: string,
    customerName: string
  ) => {
    e.preventDefault();
    const reviewerName = (customerName || formInput.customerName || 'عميل StarkLaBs').trim();
    const input: ReviewFormInput = {
      productId,
      reviewerName,
      rating: reviewRating,
      comment: reviewComment,
      orderId,
    };
    const validation = validateReviewInput(input);
    if (!validation.valid) {
      setReviewError(validation.error || 'يرجى كتابة تعليق التقييم.');
      return;
    }
    setReviewError(null);
    await onAddVerifiedReview(input);
    setActiveReviewKey(null);
    setReviewComment('');
    setReviewRating(5);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="سلة المشتريات وسجل الطلبات"
    >
      <div className="bg-zinc-900 border-r border-zinc-800 w-full max-w-lg h-full flex flex-col justify-between shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-zinc-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingBag className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
              <h2 className="text-base sm:text-lg font-extrabold text-zinc-100 truncate">
                {completedOrder ? 'تم تأكيد طلبك بنجاح' : 'سلة المشتريات والطلبات'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setCompletedOrder(null);
                onClose();
              }}
              aria-label="إغلاق السلة"
              className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-lg cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Tabs: 1. المنتجات المختارة | 2. بيانات العميل | 3. سجل السلة (تقييم المشتريات) */}
          {!completedOrder && (
            <div
              className="grid grid-cols-3 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl"
              role="tablist"
              aria-label="أقسام السلة"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'items'}
                onClick={() => setActiveTab('items')}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'items'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                <span>المنتجات ({itemsCount})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'customer'}
                onClick={() => setActiveTab('customer')}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'customer'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>بيانات العميل</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'history'}
                onClick={() => setActiveTab('history')}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <History className="w-3.5 h-3.5 shrink-0" />
                <span>سجل السلة ({cartHistory.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5">
          {completedOrder ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-5">
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle2 className="w-7 h-7 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    تم استلام الطلب رقم{' '}
                    <span className="font-mono-tabular text-amber-400">
                      {completedOrder.orderNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    تمت إضافة الطلب إلى سجل السلة — يمكنك الآن تقييم منتجاتك من السجل
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400">العميل:</span>
                  <span className="text-zinc-200 font-medium">{completedOrder.customerName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400">رقم الهاتف:</span>
                  <span className="text-zinc-200 font-mono-tabular">{completedOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400">البريد الإلكتروني:</span>
                  <span className="text-zinc-200 font-mono-tabular">{completedOrder.customerEmail}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400">العنوان:</span>
                  <span className="text-zinc-200">{completedOrder.shippingAddress}</span>
                </div>
                <div className="pt-2 border-t border-zinc-800/80">
                  <span className="text-zinc-400 block mb-1">تفاصيل المنتجات والألوان:</span>
                  <p className="text-zinc-200 leading-relaxed">{completedOrder.itemsSummary}</p>
                </div>
                <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-sm font-bold">
                  <span className="text-zinc-200">الإجمالي عند الاستلام:</span>
                  <span className="text-amber-400 font-mono-tabular whitespace-nowrap">
                    {completedOrder.totalAmount.toLocaleString('en-US')} ج.م
                  </span>
                </div>
              </div>

              {/* Action to send organized email via Gmail API to both parties */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    إرسال إيميل تأكيد منظم بتفاصيل الأوردر للطرفين: بريدك ({completedOrder.customerEmail}) وإدارة المعمل ({STORE_OWNER_EMAIL}).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRequestGmailConfirmation(completedOrder)}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>
                    {completedOrder.emailSent
                      ? 'إعادة إرسال إيميل التأكيد للطرفين'
                      : 'إرسال إيميل التأكيد للطرفين عبر Gmail'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCompletedOrder(null);
                    setActiveTab('history');
                  }}
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/40 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  <span>فتح سجل السلة وتقييم المنتجات</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCompletedOrder(null);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>متابعة التسوق</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : activeTab === 'history' ? (
            /* ============================================================
               TAB 3: سجل السلة (Cart History & Verified Product Reviews)
               ============================================================ */
            <div className="space-y-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-1">
                <h3 className="text-xs sm:text-sm font-extrabold text-zinc-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>سجل السلة وطلباتك السابقة</span>
                </h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  يمكنك تقييم المنتجات التي قمت بشرائها فقط من خلال هذا السجل لضمان مصداقية التقييمات.
                </p>
              </div>

              {cartHistory.length === 0 ? (
                <div className="text-center py-12 px-4 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-3">
                  <History className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h4 className="text-sm font-bold text-zinc-300">لا توجد طلبات سابقة في سجل السلة</h4>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                    بمجرد إتمام أول طلب لك، سيظهر هنا في سجل السلة وستتمكن من تقييم المنتجات التي اشتريتها.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartHistory.map((entry) => (
                    <div
                      key={entry.orderId}
                      className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3.5"
                    >
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold font-mono-tabular text-amber-400">
                            {entry.orderNumber}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-[11px] text-zinc-400 font-mono-tabular">
                            {new Date(entry.createdAt).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold font-mono-tabular text-zinc-100 whitespace-nowrap">
                          {entry.totalAmount.toLocaleString('en-US')} ج.م
                        </span>
                      </div>

                      {/* Purchased Products in this Order with Verified Review Controls */}
                      <div className="space-y-2.5">
                        {entry.items.map((item) => {
                          const reviewKey = `${entry.orderId}::${item.productId}`;
                          const isReviewFormOpen = activeReviewKey === reviewKey;
                          const existingReview = reviews.find(
                            (r) =>
                              r.productId === item.productId &&
                              (r.orderId === entry.orderId ||
                                r.reviewerName.trim() === entry.customerName.trim())
                          );

                          return (
                            <div
                              key={`${entry.orderId}-${item.productId}-${item.selectedColor}`}
                              className="p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-xl space-y-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.title}
                                      referrerPolicy="no-referrer"
                                      className="w-12 h-12 rounded-lg object-cover bg-zinc-950 border border-zinc-800 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                                      <Box className="w-5 h-5 text-amber-400" />
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <h5 className="text-xs font-bold text-zinc-100 leading-snug line-clamp-2">
                                      {item.title}
                                    </h5>
                                    <div className="text-[11px] text-zinc-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                                      <span>اللون: {item.selectedColor}</span>
                                      <span>·</span>
                                      <span className="font-mono-tabular">الكمية: {item.quantity}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Rate Purchased Product Button or Rated Status */}
                                <div className="shrink-0">
                                  {existingReview ? (
                                    <div className="px-2.5 py-1 bg-zinc-950 border border-emerald-500/40 rounded-lg text-[11px] font-bold text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                      <span>تم التقييم ({existingReview.rating}/5)</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isReviewFormOpen) {
                                          setActiveReviewKey(null);
                                        } else {
                                          setActiveReviewKey(reviewKey);
                                          setReviewRating(5);
                                          setReviewComment('');
                                          setReviewError(null);
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                                    >
                                      <Star className="w-3.5 h-3.5 fill-zinc-950" />
                                      <span>قيّم المنتج</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Inline Verified Review Form for this Purchased Product */}
                              {isReviewFormOpen && (
                                <form
                                  onSubmit={(e) =>
                                    handleHistoryReviewSubmit(
                                      e,
                                      entry.orderId,
                                      item.productId,
                                      entry.customerName
                                    )
                                  }
                                  className="pt-2.5 border-t border-zinc-800 space-y-2.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-zinc-200">
                                      اختر التقييم:
                                    </span>
                                    <div
                                      className="flex items-center gap-1"
                                      role="radiogroup"
                                      aria-label={`تقييم ${item.title}`}
                                    >
                                      {[1, 2, 3, 4, 5].map((starVal) => (
                                        <button
                                          key={starVal}
                                          type="button"
                                          onClick={() => setReviewRating(starVal)}
                                          aria-label={`${starVal} نجوم`}
                                          className="p-1 rounded hover:bg-zinc-800 cursor-pointer"
                                        >
                                          <Star
                                            className={`w-4 h-4 ${
                                              starVal <= reviewRating
                                                ? 'text-amber-400 fill-amber-400'
                                                : 'text-zinc-600'
                                            }`}
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={reviewComment}
                                      onChange={(e) => setReviewComment(e.target.value)}
                                      placeholder="اكتب رأيك في المنتج بعد الشراء..."
                                      aria-label={`تعليق تقييم ${item.title}`}
                                      maxLength={500}
                                      className="flex-1 min-w-0 px-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                                    />
                                    <button
                                      type="submit"
                                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                      <span>نشر التقييم</span>
                                    </button>
                                  </div>

                                  {reviewError && (
                                    <p className="text-xs text-red-400">{reviewError}</p>
                                  )}
                                </form>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-14 space-y-3">
              <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-zinc-300">سلة المشتريات فارغة حالياً</h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                اختر المنتجات واللون المفضل لك من كتالوج StarkLaBs، أو تصفح سجل السلة لتقييم مشترياتك السابقة.
              </p>
              {cartHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="mt-2 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-amber-400 text-xs font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  <span>عرض سجل السلة ({cartHistory.length})</span>
                </button>
              )}
            </div>
          ) : activeTab === 'items' ? (
            /* ============================================================
               TAB 1: المنتجات المختارة (Organized Item Cards & Summary)
               ============================================================ */
            <div className="space-y-4">
              <div className="space-y-3">
                {items.map((item) => {
                  const unitPrice = calculateDiscountedPrice(
                    item.product.price,
                    item.product.discountPercent
                  );
                  const lineTotal = unitPrice * item.quantity;

                  return (
                    <div
                      key={`${item.product.id}-${item.selectedColor}`}
                      className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-3.5 space-y-3"
                    >
                      {/* Top Row: Thumbnail + Full Readable Title + Delete Button */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.title}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-xl object-cover bg-zinc-900 border border-zinc-800 shrink-0"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="text-xs sm:text-sm font-extrabold text-zinc-100 leading-snug line-clamp-2">
                              {item.product.title}
                            </h4>
                            <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-1.5">
                              <span>اللون:</span>
                              <span className="text-zinc-200 font-semibold">
                                {item.selectedColor}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.product.id, item.selectedColor)}
                          aria-label={`حذف ${item.product.title} من السلة`}
                          className="p-1.5 text-zinc-500 hover:text-red-400 bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Bottom Row: Quantity Stepper + Clear Non-Wrapping Price */}
                      <div className="pt-2.5 border-t border-zinc-800/70 flex items-center justify-between gap-3">
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item.product.id, item.selectedColor, -1)
                            }
                            aria-label={`تقليل كمية ${item.product.title}`}
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-extrabold font-mono-tabular text-zinc-100">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item.product.id, item.selectedColor, 1)
                            }
                            aria-label={`زيادة كمية ${item.product.title}`}
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-left shrink-0">
                          <span className="text-sm sm:text-base font-extrabold text-amber-400 font-mono-tabular whitespace-nowrap">
                            {lineTotal.toLocaleString('en-US')} ج.م
                          </span>
                          {item.quantity > 1 && (
                            <span className="block text-[11px] text-zinc-500 font-mono-tabular whitespace-nowrap">
                              ({unitPrice.toLocaleString('en-US')} ج.م للقطعة)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Organized Invoice Summary */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2 text-zinc-400">
                  <span>إجمالي المنتجات ({itemsCount})</span>
                  <span className="font-mono-tabular whitespace-nowrap">
                    {subtotal.toLocaleString('en-US')} ج.م
                  </span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex items-center justify-between gap-2 text-emerald-400">
                    <span>قيمة الخصم المطبقة</span>
                    <span className="font-mono-tabular whitespace-nowrap">
                      - {discountTotal.toLocaleString('en-US')} ج.م
                    </span>
                  </div>
                )}
                <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between gap-2 text-sm font-extrabold text-zinc-100">
                  <span>الإجمالي النهائي (عند الاستلام)</span>
                  <span className="text-amber-400 font-mono-tabular whitespace-nowrap text-base">
                    {totalAmount.toLocaleString('en-US')} ج.م
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('customer')}
                className="w-full py-3 px-5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>المتابعة لإدخال بيانات العميل</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* ============================================================
               TAB 2: بيانات العميل (Customer Form Persisted in LocalStorage)
               ============================================================ */
            <form
              id="checkout-form"
              onSubmit={handleCheckoutSubmit}
              className="space-y-4"
              noValidate
            >
              {/* Compact Order Total & Auto-Save Notice */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-zinc-200 block">
                    بيانات العميل والتوصيل
                  </span>
                  <span className="text-[11px] text-emerald-400">
                    يتم حفظ بياناتك تلقائياً في المتصفح للطلبات القادمة
                  </span>
                </div>
                <div className="text-left shrink-0">
                  <span className="text-[11px] text-zinc-400 block">الإجمالي</span>
                  <span className="text-sm font-extrabold text-amber-400 font-mono-tabular whitespace-nowrap">
                    {totalAmount.toLocaleString('en-US')} ج.م
                  </span>
                </div>
              </div>

              {/* 1. الاسم */}
              <div>
                <label htmlFor="checkout-name" className="block text-xs font-semibold text-zinc-300 mb-1">
                  الاسم *
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  value={formInput.customerName}
                  onChange={(e) =>
                    setFormInput((prev) => ({ ...prev, customerName: e.target.value }))
                  }
                  placeholder="الاسم بالكامل"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                {errors.customerName && (
                  <p className="text-xs text-red-400 mt-1">{errors.customerName}</p>
                )}
              </div>

              {/* 2. الرقم & 3. الإيميل */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="checkout-phone" className="block text-xs font-semibold text-zinc-300 mb-1">
                    الرقم (هاتف / واتساب) *
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    dir="ltr"
                    value={formInput.customerPhone}
                    onChange={(e) =>
                      setFormInput((prev) => ({ ...prev, customerPhone: e.target.value }))
                    }
                    placeholder="01012345678"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 text-left font-mono-tabular"
                  />
                  {errors.customerPhone && (
                    <p className="text-xs text-red-400 mt-1">{errors.customerPhone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="checkout-email" className="block text-xs font-semibold text-zinc-300 mb-1">
                    الإيميل *
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    dir="ltr"
                    value={formInput.customerEmail}
                    onChange={(e) =>
                      setFormInput((prev) => ({ ...prev, customerEmail: e.target.value }))
                    }
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 text-left font-mono-tabular"
                  />
                  {errors.customerEmail && (
                    <p className="text-xs text-red-400 mt-1">{errors.customerEmail}</p>
                  )}
                </div>
              </div>

              {/* 4. المحافظة */}
              <div>
                <label htmlFor="checkout-governorate" className="block text-xs font-semibold text-zinc-300 mb-1">
                  المحافظة *
                </label>
                <select
                  id="checkout-governorate"
                  value={formInput.governorate || 'القاهرة'}
                  onChange={(e) =>
                    setFormInput((prev) => ({ ...prev, governorate: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
                {errors.governorate && (
                  <p className="text-xs text-red-400 mt-1">{errors.governorate}</p>
                )}
              </div>

              {/* 5. العنوان */}
              <div>
                <label htmlFor="checkout-address" className="block text-xs font-semibold text-zinc-300 mb-1">
                  العنوان بالتفصيل *
                </label>
                <input
                  id="checkout-address"
                  type="text"
                  value={formInput.shippingAddress}
                  onChange={(e) =>
                    setFormInput((prev) => ({ ...prev, shippingAddress: e.target.value }))
                  }
                  placeholder="المدينة / المنطقة، اسم الشارع، رقم العقار"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                {errors.shippingAddress && (
                  <p className="text-xs text-red-400 mt-1">{errors.shippingAddress}</p>
                )}
              </div>

              {/* 6. ملاحظات */}
              <div>
                <label htmlFor="checkout-notes" className="block text-xs font-semibold text-zinc-300 mb-1">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  id="checkout-notes"
                  rows={2}
                  value={formInput.notes}
                  onChange={(e) =>
                    setFormInput((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="أي تفاصيل خاصة بالمقاس أو اللون أو موعد الاستلام..."
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                {errors.notes && (
                  <p className="text-xs text-red-400 mt-1">{errors.notes}</p>
                )}
              </div>

              <div className="pt-1 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('items')}
                  className="px-4 py-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                >
                  مراجعة المنتجات
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-zinc-950 font-extrabold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isSubmitting
                    ? 'جاري تسجيل الطلب...'
                    : `تأكيد الطلب (${totalAmount.toLocaleString('en-US')} ج.م)`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

