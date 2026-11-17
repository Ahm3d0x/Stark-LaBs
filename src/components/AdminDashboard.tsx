import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Mail,
  ExternalLink,
  Search,
  Package,
  ClipboardList,
  X,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  LogOut,
  Store,
  Link2,
  Star,
  MessageSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  Order,
  ORDER_STATUSES,
  OrderStatus,
  Product,
  PRODUCT_CATEGORIES,
  ProductFormInput,
  ProductReview,
} from '../types/store';
import {
  buildProductShareUrl,
  calculateDiscountedPrice,
  validateProductInput,
} from '../utils/storeLogic';
import { SEED_PRODUCTS } from '../data/seedProducts';

interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  reviews: ProductReview[];
  user: User | null;
  isLoggingIn: boolean;
  onGoogleLogin: () => void;
  onLogout: () => void;
  onSaveProduct: (input: ProductFormInput, existingId?: string) => Promise<void>;
  onToggleProductFeatured: (productId: string, nextFeatured: boolean) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onToggleReviewVisibility: (reviewId: string, nextVisible: boolean) => Promise<void>;
  onDeleteReview: (reviewId: string) => Promise<void>;
  onRequestGmailConfirmation: (order: Order) => void;
}

const emptyProductForm: ProductFormInput = {
  title: '',
  category: 'مجسمات وخوذ',
  description: '',
  price: 650,
  discountPercent: 10,
  imageUrl: SEED_PRODUCTS[0].imageUrl,
  postUrl: 'https://www.facebook.com/StarkLaBs',
  material: 'PLA+ Silk',
  printTimeHours: 12,
  dimensions: '20 × 15 × 15 سم',
  colorsText: 'أسود مطفي، أحمر معدني، فضي',
  inStock: true,
  featured: true,
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  orders,
  reviews,
  user,
  isLoggingIn,
  onGoogleLogin,
  onLogout,
  onSaveProduct,
  onToggleProductFeatured,
  onDeleteProduct,
  onUpdateOrderStatus,
  onToggleReviewVisibility,
  onDeleteReview,
  onRequestGmailConfirmation,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'reviews'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [productFeaturedFilter, setProductFeaturedFilter] = useState<'all' | 'featured' | 'regular'>('all');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);

  const handleCopyProductShareUrl = async (productId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = buildProductShareUrl(origin, productId);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedProductId(productId);
      setTimeout(() => {
        setCopiedProductId((prev) => (prev === productId ? null : prev));
      }, 2200);
    } catch {
      setCopiedProductId(null);
    }
  };

  // Product Form Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | undefined>(undefined);
  const [productForm, setProductForm] = useState<ProductFormInput>(emptyProductForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Delete Confirmation Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Computed Metrics
  const totalRevenue = orders
    .filter((o) => o.status !== 'ملغي')
    .reduce((acc, o) => acc + o.totalAmount, 0);
  const activeOrdersCount = orders.filter(
    (o) => o.status === 'قيد المراجعة' || o.status === 'جاري الطباعة 3D' || o.status === 'تم الشحن'
  ).length;
  const confirmedEmailsCount = orders.filter((o) => o.emailSent).length;

  const filteredOrders = orders.filter((ord) => {
    const matchesStatus = statusFilter === 'الكل' || ord.status === statusFilter;
    const q = orderSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      ord.orderNumber.toLowerCase().includes(q) ||
      ord.customerName.toLowerCase().includes(q) ||
      ord.customerPhone.includes(q) ||
      ord.customerEmail.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const featuredProductsCount = products.filter((p) => p.featured).length;
  const filteredAdminProducts = products.filter((p) => {
    if (productFeaturedFilter === 'featured') return p.featured;
    if (productFeaturedFilter === 'regular') return !p.featured;
    return true;
  });

  const standaloneAdminUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/admin` : '/admin';

  const handleCopyAdminUrl = async () => {
    try {
      await navigator.clipboard.writeText(standaloneAdminUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(false);
    }
  };

  const handleOpenNewProduct = () => {
    setEditingProductId(undefined);
    setProductForm(emptyProductForm);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProductForm({
      title: prod.title,
      category: prod.category,
      description: prod.description,
      price: prod.price,
      discountPercent: prod.discountPercent,
      imageUrl: prod.imageUrl,
      postUrl: prod.postUrl,
      material: prod.material,
      printTimeHours: prod.printTimeHours,
      dimensions: prod.dimensions,
      colorsText: prod.colors.join('، '),
      inStock: prod.inStock,
      featured: prod.featured,
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateProductInput(productForm);
    if (!validation.valid) {
      setFormError(validation.error || 'يرجى مراجعة البيانات المدخلة.');
      return;
    }
    setFormError(null);
    setIsSavingProduct(true);
    try {
      await onSaveProduct(productForm, editingProductId);
      setIsProductModalOpen(false);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const previewDiscountedPrice = calculateDiscountedPrice(
    productForm.price,
    productForm.discountPercent
  );

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-zinc-950 text-zinc-100">
      {/* Standalone Admin Portal Top Bar */}
      <header className="sticky top-0 z-40 w-full bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="font-extrabold text-sm sm:text-lg text-zinc-100 font-display truncate">
              StarkLaBs Admin
            </span>
            <span className="hidden sm:inline-block text-xs text-zinc-400 border-r border-zinc-800 pr-2 mr-1">
              بوابة الإدارة والطلبات المستقلة
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <a
              href="/"
              className="px-2.5 sm:px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 hover:text-zinc-100 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">الموقع الأساسي</span>
              <span className="sm:hidden">المتجر</span>
            </a>

            {user ? (
              <div className="flex items-center gap-1.5">
                <span className="hidden lg:inline-block text-xs text-zinc-400 max-w-[140px] truncate">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="تسجيل الخروج"
                  className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onGoogleLogin}
                disabled={isLoggingIn}
                className="px-2.5 sm:px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {isLoggingIn ? (
                  '...'
                ) : (
                  <>
                    <span className="sm:hidden">دخول</span>
                    <span className="hidden sm:inline">دخول الأدمن (Google)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Header, External Link Box & Primary Action */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl sm:text-3xl font-extrabold text-zinc-100">
              لوحة إدارة الطلبات والمنتجات
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 pt-1">
              <span>اللينك المباشر للوحة التحكم:</span>
              <code
                dir="ltr"
                className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-amber-400 font-mono-tabular text-[11px] break-all"
              >
                {standaloneAdminUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyAdminUrl}
                className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-200 inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>نسخ اللينك</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleOpenNewProduct}
              className="w-full sm:w-auto justify-center px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة منتج 3D جديد</span>
            </button>
          </div>
        </div>

      {/* KPI Summary Strip (Single-Elevation, Tabular Numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <span className="text-xs text-zinc-400 block mb-1">إجمالي المبيعات</span>
          <span className="text-2xl font-extrabold text-zinc-100 font-mono-tabular">
            {totalRevenue.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <span className="text-xs text-zinc-400 block mb-1">طلبات قيد التنفيذ والطباعة</span>
          <span className="text-2xl font-extrabold text-amber-400 font-mono-tabular">
            {activeOrdersCount}
          </span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <span className="text-xs text-zinc-400 block mb-1">منتجات الكتالوج</span>
          <span className="text-2xl font-extrabold text-zinc-100 font-mono-tabular">
            {products.length}
          </span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <span className="text-xs text-zinc-400 block mb-1">إيميلات تأكيد مرسلة</span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono-tabular">
            {confirmedEmailsCount} / {orders.length}
          </span>
        </div>
      </div>

      {/* Segmented Workspace Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl self-start max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>الطلبات والأوردرات ({orders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'products'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>المنتجات والأسعار ({products.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>التقييمات والتعليقات ({reviews.length})</span>
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="بحث بالعميل أو رقم الطلب..."
                aria-label="بحث بالعميل أو رقم الطلب"
                className="w-full pr-9 pl-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-full sm:w-auto">
              {['الكل', ...ORDER_STATUSES].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === st
                      ? 'bg-zinc-100 text-zinc-950 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tab 1: Orders Management */}
      {activeTab === 'orders' ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-sm font-bold text-zinc-300">لا توجد طلبات في هذا التصنيف</p>
              <p className="text-xs text-zinc-500">ستظهر طلبات العملاء الجديدة هنا فور إتمام الشراء.</p>
            </div>
          ) : (
            <>
              {/* Mobile Vertical Cards (Zero Horizontal Scroll) */}
              <div className="md:hidden divide-y divide-zinc-800">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tabular font-bold text-amber-400 text-sm">
                        {order.orderNumber}
                      </span>
                      <span className="text-zinc-500 font-mono-tabular">
                        {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="font-bold text-zinc-100">{order.customerName}</div>
                      <div className="text-zinc-400 font-mono-tabular">
                        {order.customerPhone} · {order.customerEmail}
                      </div>
                      <div className="text-zinc-500">{order.shippingAddress}</div>
                    </div>

                    <p className="text-zinc-200 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                      {order.itemsSummary}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="font-mono-tabular text-sm font-bold text-zinc-100">
                        {order.totalAmount.toLocaleString('en-US')} ج.م
                      </span>

                      <select
                        aria-label={`تغيير حالة الطلب ${order.orderNumber}`}
                        value={order.status}
                        onChange={(e) =>
                          onUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                        }
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-100"
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRequestGmailConfirmation(order)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        order.emailSent
                          ? 'bg-zinc-950 text-emerald-400 border border-zinc-800'
                          : 'bg-amber-500 text-zinc-950'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>
                        {order.emailSent ? 'تم الإرسال (إعادة إرسال)' : 'إرسال تأكيد للطرفين'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="w-full text-right text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">رقم الطلب</th>
                      <th className="py-3.5 px-4 font-semibold">بيانات العميل</th>
                      <th className="py-3.5 px-4 font-semibold">المنتجات والألوان المطلوبة</th>
                      <th className="py-3.5 px-4 font-semibold">الإجمالي</th>
                      <th className="py-3.5 px-4 font-semibold">حالة الطلب</th>
                      <th className="py-3.5 px-4 font-semibold">تأكيد الإيميل (Gmail)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-zinc-950/50 transition-colors align-top">
                        <td className="py-4 px-4 font-mono-tabular font-bold text-amber-400 whitespace-nowrap">
                          <div>{order.orderNumber}</div>
                          <div className="text-[11px] text-zinc-500 font-normal mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                          </div>
                        </td>

                        <td className="py-4 px-4 space-y-1">
                          <div className="font-bold text-zinc-100">{order.customerName}</div>
                          <div className="text-zinc-400 font-mono-tabular">{order.customerPhone}</div>
                          <div className="text-zinc-400 font-mono-tabular">{order.customerEmail}</div>
                          <div className="text-zinc-500">{order.shippingAddress}</div>
                        </td>

                        <td className="py-4 px-4 max-w-xs space-y-1">
                          <p className="text-zinc-200 leading-relaxed">{order.itemsSummary}</p>
                          {order.notes && (
                            <p className="text-amber-300/90 text-[11px]">
                              ملاحظة: {order.notes}
                            </p>
                          )}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap font-mono-tabular">
                          <div className="text-sm font-bold text-zinc-100">
                            {order.totalAmount.toLocaleString('en-US')} ج.م
                          </div>
                          {order.discountTotal > 0 && (
                            <div className="text-[11px] text-emerald-400">
                              خصم {order.discountTotal.toLocaleString('en-US')} ج.م
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <label htmlFor={`status-${order.id}`} className="sr-only">
                            تغيير حالة الطلب {order.orderNumber}
                          </label>
                          <select
                            id={`status-${order.id}`}
                            value={order.status}
                            onChange={(e) =>
                              onUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                            }
                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                          >
                            {ORDER_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onRequestGmailConfirmation(order)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              order.emailSent
                                ? 'bg-zinc-950 text-emerald-400 border border-zinc-800 hover:bg-zinc-800'
                                : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                            }`}
                          >
                            {order.emailSent ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تم الإرسال (إعادة)</span>
                              </>
                            ) : (
                              <>
                                <Mail className="w-3.5 h-3.5" />
                                <span>إرسال تأكيد للطرفين</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : activeTab === 'products' ? (
        /* Tab 2: Products Catalog & Featured Items Selection Management */
        <div className="space-y-4">
          {/* Featured Products Control Bar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-100">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                <span>تحديد المنتجات المميزة في العرض المتحرك بالرئيسية</span>
              </div>
              <p className="text-xs text-zinc-400">
                المنتجات المحددة كمميزة حالياً:{' '}
                <strong className="text-amber-400 font-mono-tabular">
                  {featuredProductsCount}
                </strong>{' '}
                من إجمالي{' '}
                <strong className="text-zinc-200 font-mono-tabular">{products.length}</strong>{' '}
                منتجات (تظهر بالتتابع كل ثانيتين في الصفحة الرئيسية).
              </p>
            </div>

            <div
              className="flex flex-wrap items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg self-start sm:self-auto"
              role="tablist"
              aria-label="تصفية المنتجات حسب التمييز"
            >
              <button
                type="button"
                role="tab"
                aria-selected={productFeaturedFilter === 'all'}
                onClick={() => setProductFeaturedFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  productFeaturedFilter === 'all'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                جميع المنتجات ({products.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={productFeaturedFilter === 'featured'}
                onClick={() => setProductFeaturedFilter('featured')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  productFeaturedFilter === 'featured'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                المميزة ({featuredProductsCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={productFeaturedFilter === 'regular'}
                onClick={() => setProductFeaturedFilter('regular')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  productFeaturedFilter === 'regular'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                غير المميزة ({products.length - featuredProductsCount})
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {/* Mobile Vertical Cards (Zero Horizontal Scroll) */}
            <div className="md:hidden divide-y divide-zinc-800">
              {filteredAdminProducts.map((prod) => {
                const finalPrice = calculateDiscountedPrice(prod.price, prod.discountPercent);
                return (
                  <div key={prod.id} className="p-4 space-y-3 text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={prod.imageUrl}
                        alt={prod.title}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-lg object-cover bg-zinc-950 border border-zinc-800 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-zinc-100 text-sm truncate">{prod.title}</div>
                        <div className="text-zinc-400 mt-0.5">
                          {prod.category} · {prod.material}
                        </div>
                        <div className="text-amber-400 font-bold font-mono-tabular mt-0.5">
                          {finalPrice.toLocaleString('en-US')} ج.م
                        </div>
                      </div>
                    </div>

                    <div className="text-zinc-400">الألوان: {prod.colors.join(' · ')}</div>

                    {/* One-Click Featured Toggle Button on Mobile */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onToggleProductFeatured(prod.id, !prod.featured)}
                        aria-pressed={prod.featured}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          prod.featured
                            ? 'bg-amber-500 text-zinc-950'
                            : 'bg-zinc-950 text-zinc-300 border border-zinc-800 hover:border-amber-500/50'
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            prod.featured ? 'fill-zinc-950 text-zinc-950' : 'text-amber-400'
                          }`}
                        />
                        <span>{prod.featured ? 'مميز في العرض' : 'تحديد كمميز'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyProductShareUrl(prod.id)}
                          aria-label={`نسخ لينك ${prod.title}`}
                          className="px-2.5 py-1.5 bg-zinc-950 text-amber-400 border border-zinc-800 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          {copiedProductId === prod.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Link2 className="w-3.5 h-3.5" />
                              <span>نسخ اللينك</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(prod)}
                          aria-label={`تعديل ${prod.title}`}
                          className="px-3 py-1.5 bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(prod)}
                          aria-label={`حذف ${prod.title}`}
                          className="p-1.5 text-zinc-500 hover:text-red-400 bg-zinc-950 border border-zinc-800 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full text-right text-xs">
                <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">المنتج</th>
                    <th className="py-3.5 px-4 font-semibold">القسم والخامة</th>
                    <th className="py-3.5 px-4 font-semibold">السعر والخصم</th>
                    <th className="py-3.5 px-4 font-semibold">حالة العرض المميز</th>
                    <th className="py-3.5 px-4 font-semibold">لينك البيدج / الفيديو</th>
                    <th className="py-3.5 px-4 font-semibold">إجراءات التحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredAdminProducts.map((prod) => {
                    const finalPrice = calculateDiscountedPrice(prod.price, prod.discountPercent);
                    return (
                      <tr key={prod.id} className="hover:bg-zinc-950/50 transition-colors align-middle">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={prod.imageUrl}
                              alt={prod.title}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-lg object-cover bg-zinc-950 border border-zinc-800 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-zinc-100 text-sm">{prod.title}</div>
                              <div className="text-zinc-500 text-[11px] font-mono-tabular">
                                {prod.dimensions} · {prod.printTimeHours} ساعة طباعة
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-zinc-200 font-medium">{prod.category}</div>
                          <div className="text-zinc-500">{prod.material}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-mono-tabular">
                          <div className="text-sm font-bold text-amber-400">
                            {finalPrice.toLocaleString('en-US')} ج.م
                          </div>
                          {prod.discountPercent > 0 && (
                            <div className="text-[11px] text-zinc-500">
                              بدلاً من {prod.price.toLocaleString('en-US')} ج.م (خصم {prod.discountPercent}%)
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onToggleProductFeatured(prod.id, !prod.featured)}
                            aria-pressed={prod.featured}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                              prod.featured
                                ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                                : 'bg-zinc-950 text-zinc-300 border border-zinc-800 hover:border-amber-500/50'
                            }`}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                prod.featured ? 'fill-zinc-950 text-zinc-950' : 'text-amber-400'
                              }`}
                            />
                            <span>{prod.featured ? 'مميز في العرض' : 'تحديد كمميز'}</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {prod.postUrl ? (
                            <a
                              href={prod.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                            >
                              <span>فتح الرابط</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-zinc-600">لا يوجد رابط</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyProductShareUrl(prod.id)}
                              aria-label={`نسخ لينك ${prod.title}`}
                              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-amber-400 border border-zinc-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              {copiedProductId === prod.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">تم النسخ</span>
                                </>
                              ) : (
                                <>
                                  <Link2 className="w-3.5 h-3.5" />
                                  <span>نسخ لينك المنتج</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(prod)}
                              aria-label={`تعديل ${prod.title}`}
                              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductToDelete(prod)}
                              aria-label={`حذف ${prod.title}`}
                              className="p-1.5 text-zinc-500 hover:text-red-400 bg-zinc-950 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 3: Customer Reviews & Comments Moderation (Show/Hide & Delete) */
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-100">
                <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
                <span>إدارة تقييمات وتعليقات العملاء</span>
              </div>
              <p className="text-xs text-zinc-400">
                تحكم في إظهار أو إخفاء أي تعليق في المتجر، أو حذفه نهائياً. التعليقات المعروضة حالياً:{' '}
                <strong className="text-amber-400 font-mono-tabular">
                  {reviews.filter((r) => r.visible !== false).length}
                </strong>{' '}
                من إجمالي{' '}
                <strong className="text-zinc-200 font-mono-tabular">{reviews.length}</strong>.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {reviews.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-sm font-bold text-zinc-300">لا توجد تعليقات أو تقييمات حالياً</p>
                <p className="text-xs text-zinc-500">
                  ستظهر تقييمات العملاء الذين قاموا بالشراء من خلال سجل السلة هنا.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {reviews.map((rev) => {
                  const matchedProduct = products.find((p) => p.id === rev.productId);
                  const isVisible = rev.visible !== false;
                  return (
                    <div
                      key={rev.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-950/40 transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-extrabold text-zinc-100">{rev.reviewerName}</span>
                          <span className="text-zinc-600">·</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= rev.rating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-zinc-700'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-zinc-600">·</span>
                          <span className="text-amber-400 font-semibold truncate">
                            {matchedProduct ? matchedProduct.title : rev.productId}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span
                            className={`text-[11px] font-bold ${
                              isVisible ? 'text-emerald-400' : 'text-zinc-500'
                            }`}
                          >
                            {isVisible ? 'معروض بالمتجر' : 'مخفي عن المتجر'}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed break-words">
                          {rev.comment}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleReviewVisibility(rev.id, !isVisible)}
                          aria-label={
                            isVisible
                              ? `إخفاء تعليق ${rev.reviewerName}`
                              : `إظهار تعليق ${rev.reviewerName}`
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isVisible
                              ? 'bg-zinc-950 text-zinc-200 border border-zinc-800 hover:border-amber-500/50'
                              : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                          }`}
                        >
                          {isVisible ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                              <span>إخفاء التعليق</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>إظهار التعليق</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteReview(rev.id)}
                          aria-label={`حذف تعليق ${rev.reviewerName}`}
                          className="px-3 py-1.5 bg-zinc-950 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 border border-zinc-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-form-modal-title"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 id="product-form-modal-title" className="text-base font-bold text-zinc-100">
                {editingProductId ? 'تعديل بيانات المنتج' : 'إضافة منتج طباعة ثلاثية الأبعاد جديد'}
              </h2>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                aria-label="إغلاق نافذة المنتج"
                className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prod-title" className="block text-zinc-300 font-semibold mb-1">
                    اسم المنتج *
                  </label>
                  <input
                    id="prod-title"
                    type="text"
                    value={productForm.title}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="مثال: مجسم خوذة الساموراي الميكانيكية"
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label htmlFor="prod-category" className="block text-zinc-300 font-semibold mb-1">
                    القسم *
                  </label>
                  <select
                    id="prod-category"
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        category: e.target.value as ProductFormInput['category'],
                      }))
                    }
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="prod-price" className="block text-zinc-300 font-semibold mb-1">
                    السعر قبل الخصم (ج.م) *
                  </label>
                  <input
                    id="prod-price"
                    type="number"
                    min={0}
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        price: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono-tabular focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label htmlFor="prod-discount" className="block text-zinc-300 font-semibold mb-1">
                    نسبة الخصم (%) *
                  </label>
                  <input
                    id="prod-discount"
                    type="number"
                    min={0}
                    max={90}
                    value={productForm.discountPercent}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        discountPercent: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono-tabular focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 flex flex-col justify-center">
                  <span className="text-zinc-500 text-[11px]">السعر النهائي للعميل:</span>
                  <span className="text-base font-extrabold text-amber-400 font-mono-tabular">
                    {previewDiscountedPrice.toLocaleString('en-US')} ج.م
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="prod-colors" className="block text-zinc-300 font-semibold mb-1">
                  الألوان المتاحة للطباعة (افصل بين كل لون بفاصلة) *
                </label>
                <input
                  id="prod-colors"
                  type="text"
                  value={productForm.colorsText}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, colorsText: e.target.value }))
                  }
                  placeholder="أحمر معدني، ذهبي مطفي، أسود كربوني"
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="prod-material" className="block text-zinc-300 font-semibold mb-1">
                    خامة الفيلمنت *
                  </label>
                  <input
                    id="prod-material"
                    type="text"
                    value={productForm.material}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, material: e.target.value }))
                    }
                    placeholder="PLA+ Silk / PETG Carbon"
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label htmlFor="prod-hours" className="block text-zinc-300 font-semibold mb-1">
                    وقت الطباعة (ساعة) *
                  </label>
                  <input
                    id="prod-hours"
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={productForm.printTimeHours}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        printTimeHours: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono-tabular focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label htmlFor="prod-dimensions" className="block text-zinc-300 font-semibold mb-1">
                    الأبعاد والمقاس *
                  </label>
                  <input
                    id="prod-dimensions"
                    type="text"
                    value={productForm.dimensions}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, dimensions: e.target.value }))
                    }
                    placeholder="25 × 18 × 15 سم"
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="prod-image" className="block text-zinc-300 font-semibold mb-1">
                  رابط صورة المنتج (أو اختر من صور المعمل الجاهزة) *
                </label>
                <input
                  id="prod-image"
                  type="text"
                  dir="ltr"
                  value={productForm.imageUrl}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500 text-left mb-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  {SEED_PRODUCTS.map((sp, idx) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() =>
                        setProductForm((prev) => ({ ...prev, imageUrl: sp.imageUrl }))
                      }
                      className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded text-[11px] text-zinc-300 cursor-pointer"
                    >
                      صورة نموذج #{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="prod-post-url" className="block text-zinc-300 font-semibold mb-1">
                  لينك الفيديو أو البوست على بيدج StarkLaBs (اختياري)
                </label>
                <input
                  id="prod-post-url"
                  type="url"
                  dir="ltr"
                  value={productForm.postUrl}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, postUrl: e.target.value }))
                  }
                  placeholder="https://www.facebook.com/StarkLaBs/videos/..."
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500 text-left"
                />
              </div>

              <div>
                <label htmlFor="prod-desc" className="block text-zinc-300 font-semibold mb-1">
                  تفاصيل ومواصفات المنتج *
                </label>
                <textarea
                  id="prod-desc"
                  rows={3}
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="اكتب وصفاً مختصراً يوضح دقة الطباعة والاستخدام..."
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.inStock}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, inStock: e.target.checked }))
                    }
                    className="rounded accent-amber-500"
                  />
                  <span>متوفر للطلب حالياً</span>
                </label>

                <label className="flex items-center gap-2 text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.featured}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, featured: e.target.checked }))
                    }
                    className="rounded accent-amber-500"
                  />
                  <span>عرض في المنتجات المميزة</span>
                </label>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 hover:text-zinc-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {isSavingProduct ? 'جاري الحفظ...' : editingProductId ? 'حفظ التعديلات' : 'نشر المنتج في المتجر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 id="delete-confirm-title" className="text-base font-bold text-zinc-100">
              تأكيد حذف المنتج
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              هل أنت متأكد من حذف المنتج{' '}
              <strong className="text-amber-400">{productToDelete.title}</strong> من كتالوج StarkLaBs؟
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = productToDelete.id;
                  setProductToDelete(null);
                  await onDeleteProduct(id);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
