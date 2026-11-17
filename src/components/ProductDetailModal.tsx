import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  ShoppingBag,
  Minus,
  Plus,
  Box,
  Link2,
  Check,
  Star,
  History,
} from 'lucide-react';
import { CartHistoryEntry, Product, ProductReview } from '../types/store';
import {
  buildProductShareUrl,
  calculateDiscountedPrice,
  calculateProductRatingSummary,
  canCustomerReviewProduct,
} from '../utils/storeLogic';

interface ProductDetailModalProps {
  product: Product | null;
  initialColor: string;
  reviews: ProductReview[];
  cartHistory: CartHistoryEntry[];
  onClose: () => void;
  onAddToCart: (product: Product, selectedColor: string, quantity: number) => void;
  onOpenCartHistory: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  initialColor,
  reviews,
  cartHistory,
  onClose,
  onAddToCart,
  onOpenCartHistory,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>(
    initialColor || product?.colors[0] || 'افتراضي'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [imgError, setImgError] = useState(false);
  const [copiedProductLink, setCopiedProductLink] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedColor(initialColor || product.colors[0] || 'افتراضي');
      setQuantity(1);
      setImgError(false);
    }
  }, [product, initialColor]);

  if (!product) return null;

  const finalPrice = calculateDiscountedPrice(product.price, product.discountPercent);
  const hasDiscount = product.discountPercent > 0;

  const { averageRating, ratingsCount, productReviews } = calculateProductRatingSummary(
    reviews,
    product.id
  );

  const hasPurchasedProduct = canCustomerReviewProduct(cartHistory, product.id);

  const directProductUrl =
    typeof window !== 'undefined'
      ? buildProductShareUrl(window.location.origin, product.id)
      : `/?product=${encodeURIComponent(product.id)}`;

  const handleCopyProductLink = async () => {
    try {
      await navigator.clipboard.writeText(directProductUrl);
      setCopiedProductLink(true);
      setTimeout(() => setCopiedProductLink(false), 2500);
    } catch {
      setCopiedProductLink(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-x-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-semibold min-w-0 truncate">
            <span className="truncate">{product.category}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyProductLink}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedProductLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400">تم نسخ اللينك</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>نسخ لينك المنتج</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق تفاصيل المنتج"
              className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body (Strictly vertical scroll, zero horizontal scroll) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-start">
            {/* Product Image Box — Always visible with 4:3 aspect ratio */}
            <div className="w-full min-w-0">
              <div className="relative aspect-4/3 w-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800">
                {!imgError && product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover block"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                    <Box className="w-12 h-12 text-amber-500/60 mx-auto mb-2" />
                    <p className="text-xs">{product.title}</p>
                  </div>
                )}

                {hasDiscount && (
                  <div className="absolute top-3 right-3 bg-zinc-950/90 px-2.5 py-1 rounded text-xs font-mono-tabular font-bold text-amber-400">
                    خصم {product.discountPercent}%
                  </div>
                )}
              </div>
            </div>

            {/* Product Details & Controls */}
            <div className="w-full min-w-0 flex flex-col space-y-4">
              <div>
                <h2
                  id="modal-product-title"
                  className="text-lg sm:text-2xl font-extrabold text-zinc-100 leading-snug mb-2 break-words"
                >
                  {product.title}
                </h2>

                {/* Star Rating Summary */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300 mb-3">
                  <div className="flex items-center gap-0.5" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= Math.round(averageRating || 5)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-zinc-600'
                        }`}
                      />
                    ))}
                  </div>
                  {ratingsCount > 0 ? (
                    <>
                      <span className="font-bold text-zinc-100 font-mono-tabular">
                        {averageRating.toFixed(1)} من 5
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-400 font-mono-tabular">
                        ({ratingsCount} {ratingsCount === 1 ? 'تقييم' : 'تقييمات'})
                      </span>
                    </>
                  ) : (
                    <span className="text-zinc-400">لا توجد تقييمات بعد</span>
                  )}
                </div>

                {/* Price */}
                <div className="flex flex-wrap items-baseline gap-2.5 pb-3 border-b border-zinc-800">
                  <span className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono-tabular">
                    {finalPrice.toLocaleString('en-US')} ج.م
                  </span>
                  {hasDiscount && (
                    <span className="text-xs sm:text-sm text-zinc-500 line-through font-mono-tabular">
                      {product.price.toLocaleString('en-US')} ج.م
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed break-words">
                {product.description}
              </p>

              {/* Compact Specs (Category & Dimensions — No Material Clutter) */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-xs">
                <div className="min-w-0">
                  <span className="text-zinc-500 block text-[11px]">القسم</span>
                  <span className="text-zinc-200 font-semibold truncate block">{product.category}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-zinc-500 block text-[11px]">الأبعاد والمقاس</span>
                  <span className="text-zinc-200 font-semibold font-mono-tabular truncate block">
                    {product.dimensions}
                  </span>
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <span className="block text-xs font-semibold text-zinc-300 mb-2">
                  اختر اللون المطلوب:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                        selectedColor === color
                          ? 'bg-amber-500 text-zinc-950 font-bold'
                          : 'bg-zinc-950 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Video/Post Link */}
              {product.postUrl && (
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={product.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>فيديو / بوست المنتج على البيدج</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Product Ratings & Customer Reviews Section (Verified Purchases via Cart History Only) */}
          <div className="pt-5 border-t border-zinc-800 space-y-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-zinc-100">
                تقييمات المشترين ({ratingsCount})
              </h3>
              {ratingsCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono-tabular">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-zinc-100">{averageRating.toFixed(1)}</span>
                  <span className="text-zinc-500">/ 5.0</span>
                </div>
              )}
            </div>

            {/* Verified Purchase Review Notice / Action */}
            <div className="p-3.5 bg-zinc-950 border border-zinc-800/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-zinc-300 min-w-0">
                <History className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {hasPurchasedProduct
                    ? 'لقد قمت بشراء هذا المنتج — يمكنك إضافة تقييمك الآن من سجل السلة.'
                    : 'التقييم متاح فقط للعملاء الذين قاموا بشراء المنتج من خلال سجل السلة.'}
                </span>
              </div>
              {hasPurchasedProduct && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCartHistory();
                  }}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  قيّم من سجل السلة
                </button>
              )}
            </div>

            {/* Customer Reviews List */}
            {productReviews.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-2">
                لا توجد تقييمات معروضة لهذا المنتج حتى الآن.
              </p>
            ) : (
              <div className="space-y-2.5">
                {productReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 bg-zinc-950/70 border border-zinc-800/70 rounded-xl space-y-1.5 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-100 truncate">
                        {rev.reviewerName}
                      </span>
                      <div
                        className="flex items-center gap-0.5 shrink-0"
                        aria-label={`تقييم ${rev.rating} من 5`}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= rev.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed break-words">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Purchase Bar inside Modal */}
        <div className="px-4 sm:px-6 py-3.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="تقليل الكمية"
              className="p-2 text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-bold font-mono-tabular text-zinc-100">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              aria-label="زيادة الكمية"
              className="p-2 text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onAddToCart(product, selectedColor, quantity);
              onClose();
            }}
            disabled={!product.inStock}
            className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer min-w-0"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="truncate">
              إضافة للسلة — {(finalPrice * quantity).toLocaleString('en-US')} ج.م
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

