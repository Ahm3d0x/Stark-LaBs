import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, PanInfo } from 'motion/react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Product, ProductReview } from '../types/store';
import {
  calculateProductRatingSummary,
  FEATURED_AUTO_ADVANCE_MS,
  getNextCarouselIndex,
  resolveSwipeDirection,
} from '../utils/storeLogic';
import { ProductCard } from './ProductCard';

interface FeaturedProductCarouselProps {
  featuredProducts: Product[];
  totalCatalogCount: number;
  reviews: ProductReview[];
  onSelectProduct: (product: Product, initialColor: string) => void;
  onAddToCart: (product: Product, selectedColor: string, quantity: number) => void;
  onViewAllProducts: () => void;
}

const cardSlideVariants = {
  enter: (dir: 'next' | 'prev') => ({
    x: dir === 'next' ? -220 : 220,
    opacity: 0,
    scale: 0.9,
    rotateZ: dir === 'next' ? -2.5 : 2.5,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateZ: 0,
  },
  exit: (dir: 'next' | 'prev') => ({
    x: dir === 'next' ? 220 : -220,
    opacity: 0,
    scale: 0.9,
    rotateZ: dir === 'next' ? 2.5 : -2.5,
  }),
};

export const FeaturedProductCarousel: React.FC<FeaturedProductCarouselProps> = ({
  featuredProducts,
  totalCatalogCount,
  reviews,
  onSelectProduct,
  onAddToCart,
  onViewAllProducts,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Track manual drag/swipe so a swipe gesture doesn't trigger card click modal
  const didSwipeRef = useRef<boolean>(false);
  const lastStepTimeRef = useRef<number>(0);

  const count = featuredProducts.length;
  const safeIndex = count > 0 ? ((activeIndex % count) + count) % count : 0;
  const currentProduct = count > 0 ? featuredProducts[safeIndex] : null;

  // Auto-advance every 2 seconds (2000ms) unless paused or only 1 item
  useEffect(() => {
    if (count <= 1 || isPaused) return;
    const timer = window.setInterval(() => {
      setDirection('next');
      setActiveIndex((prev) => getNextCarouselIndex(prev, count, 'next'));
    }, FEATURED_AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [count, isPaused]);

  const handleStep = (dir: 'next' | 'prev') => {
    if (count <= 1) return;
    const now = Date.now();
    if (now - lastStepTimeRef.current < 220) return;
    lastStepTimeRef.current = now;
    setDirection(dir);
    setActiveIndex((prev) => getNextCarouselIndex(prev, count, dir));
  };

  const handleJumpTo = (idx: number) => {
    if (idx === safeIndex) return;
    setDirection(idx > safeIndex ? 'next' : 'prev');
    setActiveIndex(idx);
  };

  const handleDragStart = () => {
    didSwipeRef.current = false;
    setIsPaused(true);
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const swipeDir = resolveSwipeDirection(info.offset.x, info.velocity.x, 30);
    if (swipeDir) {
      didSwipeRef.current = true;
      handleStep(swipeDir);
      window.setTimeout(() => {
        didSwipeRef.current = false;
      }, 240);
    }
    setIsPaused(false);
  };

  if (!currentProduct) return null;

  const ratingSummary = calculateProductRatingSummary(reviews, currentProduct.id);

  return (
    <section
      className="space-y-4 w-full max-w-full overflow-hidden"
      aria-label="المنتجات المميزة وأحدث منتجات المعمل"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>عرض تفاعلي للمنتجات المختارة</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-extrabold text-zinc-100">
            أحدث منتجات المعمل المميزة
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            اسحب الكرت يميناً أو يساراً للتمرير اليدوي — ويتبدل تلقائياً كل ثانيتين
          </p>
        </div>

        <button
          type="button"
          onClick={onViewAllProducts}
          className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>عرض الكل ({totalCatalogCount})</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Single-Card Showcase Container (1 Card on Screen at a time, manual swipe + 2s auto-advance) */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative w-full max-w-xl mx-auto overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800/90 p-3 sm:p-4 select-none shadow-2xl"
      >
        {/* Top Segmented Progress & Slide Counter */}
        {count > 1 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 grid grid-flow-col auto-cols-fr gap-1.5">
              {featuredProducts.map((item, idx) => {
                const isCurrent = idx === safeIndex;
                const isPassed = idx < safeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleJumpTo(idx)}
                    aria-label={`الانتقال إلى ${item.title}`}
                    className="h-1.5 bg-zinc-800 rounded-full overflow-hidden cursor-pointer relative"
                  >
                    {isPassed && (
                      <div className="w-full h-full bg-amber-500/70 rounded-full" />
                    )}
                    {isCurrent && (
                      <motion.div
                        key={`${currentProduct.id}-${isPaused ? 'paused' : 'running'}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isPaused ? 0.4 : 1 }}
                        transition={{
                          duration: isPaused ? 0.2 : FEATURED_AUTO_ADVANCE_MS / 1000,
                          ease: 'linear',
                        }}
                        className="h-full w-full bg-amber-500 origin-right rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] font-mono-tabular font-bold text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-950/90 border border-zinc-800 shrink-0">
              {safeIndex + 1} / {count}
            </span>
          </div>
        )}

        {/* Animated & Manually Swipeable Single Product Card Viewport */}
        <div className="relative w-full overflow-hidden touch-pan-y">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={currentProduct.id}
              custom={direction}
              variants={cardSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                type: 'spring',
                stiffness: 310,
                damping: 28,
                mass: 0.85,
              }}
              drag={count > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.28}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              className="w-full cursor-grab active:cursor-grabbing will-change-transform"
            >
              <ProductCard
                product={currentProduct}
                averageRating={ratingSummary.averageRating}
                ratingsCount={ratingSummary.ratingsCount}
                onSelectProduct={(prod, color) => {
                  if (didSwipeRef.current) return;
                  onSelectProduct(prod, color);
                }}
                onAddToCart={onAddToCart}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Slide Indicators / Quick Product Switcher */}
        {count > 1 && (
          <div
            className="flex flex-wrap items-center justify-center gap-2 pt-3.5"
            role="tablist"
            aria-label="التنقل بين المنتجات المميزة"
          >
            {featuredProducts.map((item, idx) => {
              const isActive = idx === safeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`عرض ${item.title}`}
                  onClick={() => handleJumpTo(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    isActive
                      ? 'w-8 bg-amber-500'
                      : 'w-2.5 bg-zinc-700 hover:bg-zinc-500'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
