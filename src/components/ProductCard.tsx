import React, { useState } from 'react';
import { Plus, Box, Link2, Check, Star } from 'lucide-react';
import { Product } from '../types/store';
import { buildProductShareUrl, calculateDiscountedPrice } from '../utils/storeLogic';

interface ProductCardProps {
  product: Product;
  averageRating?: number;
  ratingsCount?: number;
  onSelectProduct: (product: Product, initialColor: string) => void;
  onAddToCart: (product: Product, selectedColor: string, quantity: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  averageRating = 0,
  ratingsCount = 0,
  onSelectProduct,
  onAddToCart,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors[0] || 'افتراضي'
  );
  const [imgError, setImgError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const finalPrice = calculateDiscountedPrice(product.price, product.discountPercent);
  const hasDiscount = product.discountPercent > 0;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url =
      typeof window !== 'undefined'
        ? buildProductShareUrl(window.location.origin, product.id)
        : `/?product=${encodeURIComponent(product.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  return (
    <article
      onClick={() => onSelectProduct(product, selectedColor)}
      className="group w-full min-w-0 max-w-full bg-zinc-900 border border-zinc-800/90 hover:border-amber-500/60 rounded-xl overflow-hidden flex flex-col justify-between shadow-md shadow-black/40 hover:shadow-2xl hover:shadow-amber-500/15 hover:scale-[1.025] hover:-translate-y-1 transition-all duration-300 ease-out will-change-transform cursor-pointer"
    >
      {/* Top: Crisp Product Image inside the card */}
      <div className="w-full">
        <div className="relative aspect-4/3 w-full bg-zinc-950 overflow-hidden border-b border-zinc-800/60">
          {!imgError && product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              loading="lazy"
              draggable={false}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover block select-none transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 p-4 text-center">
              <Box className="w-10 h-10 text-amber-500/60 mb-2" />
              <span className="text-xs font-medium text-zinc-400 line-clamp-1">{product.title}</span>
            </div>
          )}

          {hasDiscount && (
            <div className="absolute top-2.5 right-2.5 bg-zinc-950/90 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-mono-tabular font-bold text-amber-400">
              -{product.discountPercent}%
            </div>
          )}

          <button
            type="button"
            onClick={handleCopyLink}
            aria-label={`نسخ لينك ${product.title}`}
            title="نسخ لينك المنتج"
            className="absolute top-2.5 left-2.5 bg-zinc-950/90 hover:bg-zinc-900 backdrop-blur-sm px-2 py-1 rounded text-[11px] font-semibold text-zinc-200 border border-zinc-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">تم النسخ</span>
              </>
            ) : (
              <>
                <Link2 className="w-3 h-3 text-amber-400" />
                <span>لينك المنتج</span>
              </>
            )}
          </button>
        </div>

        {/* Concise Card Body */}
        <div className="p-4">
          {/* Quiet 1-line category & star rating (No materials shown on storefront) */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400 mb-1.5 min-w-0">
            <div className="flex items-center gap-1.5 truncate min-w-0">
              <span className="truncate font-semibold text-zinc-300">{product.category}</span>
            </div>

            <div
              className="flex items-center gap-1 shrink-0 text-zinc-300 font-mono-tabular"
              aria-label={
                ratingsCount > 0
                  ? `التقييم ${averageRating.toFixed(1)} من 5 بناءً على ${ratingsCount} تقييم`
                  : 'بدون تقييمات بعد'
              }
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" aria-hidden="true" />
              {ratingsCount > 0 ? (
                <>
                  <span className="font-bold text-zinc-100">{averageRating.toFixed(1)}</span>
                  <span className="text-zinc-500">({ratingsCount})</span>
                </>
              ) : (
                <span className="text-zinc-500">جديد</span>
              )}
            </div>
          </div>

          {/* Product Title */}
          <h3 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-amber-400 transition-colors leading-snug line-clamp-2 mb-3">
            {product.title}
          </h3>

          {/* Compact Color Selector */}
          <div
            className="flex items-center flex-wrap gap-1.5"
            role="group"
            aria-label={`ألوان ${product.title}`}
            onClick={(e) => e.stopPropagation()}
          >
            {product.colors.map((color) => {
              const isSelected = color === selectedColor;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`px-2 py-1 text-[11px] rounded-md transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-100 text-zinc-950 font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card Footer: Price + Quick Add */}
      <div className="px-4 pb-4 pt-3 border-t border-zinc-800/70 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-base sm:text-lg font-extrabold text-amber-400 font-mono-tabular">
            {finalPrice.toLocaleString('en-US')}
          </span>{' '}
          <span className="text-xs text-zinc-400">ج.م</span>
          {hasDiscount && (
            <span className="block text-[11px] text-zinc-500 line-through font-mono-tabular">
              {product.price.toLocaleString('en-US')} ج.م
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product, selectedColor, 1);
          }}
          disabled={!product.inStock}
          className="py-2 px-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{product.inStock ? 'أضف للسلة' : 'نفد'}</span>
        </button>
      </div>
    </article>
  );
};
