import {
  BLUEPRINT_LIMITS,
  CartHistoryEntry,
  CartItem,
  CheckoutFormInput,
  Order,
  ORDER_STATUSES,
  Product,
  PRODUCT_CATEGORIES,
  ProductFormInput,
  ProductRatingSummary,
  ProductReview,
  PurchasedProductItem,
  ReviewFormInput,
} from '../types/store';

export const REVIEWS_STORAGE_KEY = 'starklabs_reviews_v1';
export const PRODUCTS_STORAGE_KEY = 'starklabs_products_v1';
export const CUSTOMER_INFO_STORAGE_KEY = 'starklabs_customer_info_v1';
export const CART_HISTORY_STORAGE_KEY = 'starklabs_cart_history_v1';
export const FEATURED_AUTO_ADVANCE_MS = 2000;

export interface SavedCustomerInfo {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  governorate: string;
  shippingAddress: string;
  notes?: string;
}

export function resolveSwipeDirection(
  deltaX: number,
  velocityX = 0,
  thresholdPx = 35
): 'next' | 'prev' | null {
  if (Math.abs(deltaX) < thresholdPx && Math.abs(velocityX) < 260) {
    return null;
  }
  const effectiveDelta = Math.abs(deltaX) >= thresholdPx ? deltaX : velocityX;
  // In RTL layout, dragging right (+X) pulls the next item from the left into view
  return effectiveDelta > 0 ? 'next' : 'prev';
}

export function formatFullShippingAddress(
  governorate?: string,
  shippingAddress?: string
): string {
  const gov = (governorate || '').trim();
  const addr = (shippingAddress || '').trim();
  if (gov && addr && !addr.startsWith(gov)) {
    return `${gov} — ${addr}`.slice(0, BLUEPRINT_LIMITS.SHIPPING_ADDRESS_MAX);
  }
  return (addr || gov).slice(0, BLUEPRINT_LIMITS.SHIPPING_ADDRESS_MAX);
}

export function loadCustomerInfoFromStorage(
  storage: Pick<Storage, 'getItem'> | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
): SavedCustomerInfo {
  const empty: SavedCustomerInfo = {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    governorate: 'القاهرة',
    shippingAddress: '',
    notes: '',
  };
  if (!storage) return empty;
  try {
    const raw = storage.getItem(CUSTOMER_INFO_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return empty;
    return {
      customerName: typeof parsed.customerName === 'string' ? parsed.customerName : '',
      customerPhone: typeof parsed.customerPhone === 'string' ? parsed.customerPhone : '',
      customerEmail: typeof parsed.customerEmail === 'string' ? parsed.customerEmail : '',
      governorate:
        typeof parsed.governorate === 'string' && parsed.governorate.trim()
          ? parsed.governorate.trim()
          : 'القاهرة',
      shippingAddress: typeof parsed.shippingAddress === 'string' ? parsed.shippingAddress : '',
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    };
  } catch {
    return empty;
  }
}

export function saveCustomerInfoToStorage(
  info: SavedCustomerInfo,
  storage: Pick<Storage, 'setItem'> | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
): void {
  if (!storage) return;
  try {
    const payload: SavedCustomerInfo = {
      customerName: (info.customerName || '').slice(0, BLUEPRINT_LIMITS.CUSTOMER_NAME_MAX),
      customerPhone: (info.customerPhone || '').slice(0, BLUEPRINT_LIMITS.CUSTOMER_PHONE_MAX),
      customerEmail: (info.customerEmail || '').slice(0, BLUEPRINT_LIMITS.CUSTOMER_EMAIL_MAX),
      governorate: (info.governorate || 'القاهرة').slice(0, 60),
      shippingAddress: (info.shippingAddress || '').slice(0, BLUEPRINT_LIMITS.SHIPPING_ADDRESS_MAX),
      notes: (info.notes || '').slice(0, BLUEPRINT_LIMITS.NOTES_MAX),
    };
    storage.setItem(CUSTOMER_INFO_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

export function toggleProductFeaturedState(
  products: Product[],
  productId: string,
  nextFeatured?: boolean
): Product[] {
  return (products || []).map((prod) => {
    if (prod.id !== productId) return prod;
    const targetState = typeof nextFeatured === 'boolean' ? nextFeatured : !prod.featured;
    return { ...prod, featured: targetState };
  });
}

export function getFeaturedShowcaseProducts(products: Product[]): Product[] {
  const list = products || [];
  const featured = list.filter((p) => p.featured);
  return featured.length > 0 ? featured : list.slice(0, 3);
}

export function getNextCarouselIndex(
  currentIndex: number,
  totalItems: number,
  direction: 'next' | 'prev' = 'next'
): number {
  if (totalItems <= 1) return 0;
  const safeCurrent = ((currentIndex % totalItems) + totalItems) % totalItems;
  if (direction === 'prev') {
    return (safeCurrent - 1 + totalItems) % totalItems;
  }
  return (safeCurrent + 1) % totalItems;
}

export function loadProductsFromStorage(
  fallbackProducts: Product[] = [],
  storage: Pick<Storage, 'getItem'> | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
): Product[] {
  const merged = new Map<string, Product>();
  for (const p of fallbackProducts) merged.set(p.id, p);
  if (storage) {
    try {
      const raw = storage.getItem(PRODUCTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (
              item &&
              typeof item === 'object' &&
              typeof item.id === 'string' &&
              typeof item.title === 'string' &&
              typeof item.price === 'number' &&
              Array.isArray(item.colors)
            ) {
              merged.set(item.id, {
                id: item.id,
                title: item.title,
                category: item.category || 'مجسمات وخوذ',
                description: String(item.description || ''),
                price: Number(item.price || 0),
                discountPercent: Number(item.discountPercent || 0),
                imageUrl: String(item.imageUrl || ''),
                postUrl: String(item.postUrl || ''),
                material: String(item.material || 'PLA+'),
                printTimeHours: Number(item.printTimeHours || 1),
                dimensions: String(item.dimensions || ''),
                colors: item.colors.map(String),
                inStock: Boolean(item.inStock ?? true),
                featured: Boolean(item.featured ?? false),
                authorId: String(item.authorId || 'starklabs-admin'),
              });
            }
          }
        }
      }
    } catch {
      // Ignore storage errors
    }
  }
  return Array.from(merged.values());
}

export function saveProductsToStorage(
  products: Product[],
  storage: Pick<Storage, 'setItem'> | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
): void {
  if (!storage) return;
  try {
    storage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  } catch {
    // Ignore storage errors
  }
}

export function calculateProductRatingSummary(
  reviews: ProductReview[],
  productId: string
): ProductRatingSummary {
  const productReviews = (reviews || []).filter(
    (r) => r.productId === productId && r.visible !== false
  );
  const ratingsCount = productReviews.length;
  if (ratingsCount === 0) {
    return { averageRating: 0, ratingsCount: 0, productReviews: [] };
  }
  const sum = productReviews.reduce(
    (acc, r) => acc + Math.min(5, Math.max(1, Number(r.rating) || 5)),
    0
  );
  const averageRating = Math.round((sum / ratingsCount) * 10) / 10;
  return { averageRating, ratingsCount, productReviews };
}

export function toggleReviewVisibility(
  reviews: ProductReview[],
  reviewId: string,
  nextVisible?: boolean
): ProductReview[] {
  return (reviews || []).map((rev) => {
    if (rev.id !== reviewId) return rev;
    const currentVisible = rev.visible !== false;
    const targetVisible =
      typeof nextVisible === 'boolean' ? nextVisible : !currentVisible;
    return {
      ...rev,
      visible: targetVisible,
      updatedAt: new Date().toISOString(),
    };
  });
}

export function removeReviewById(
  reviews: ProductReview[],
  reviewId: string
): ProductReview[] {
  return (reviews || []).filter((rev) => rev.id !== reviewId);
}

export function createCartHistoryEntry(
  order: Order,
  cartItems: CartItem[]
): CartHistoryEntry {
  const items: PurchasedProductItem[] = (cartItems || []).map((ci) => ({
    productId: ci.product.id,
    title: ci.product.title,
    imageUrl: ci.product.imageUrl,
    selectedColor: ci.selectedColor,
    quantity: Math.max(1, Math.floor(ci.quantity)),
    unitPrice: calculateDiscountedPrice(ci.product.price, ci.product.discountPercent),
  }));

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    shippingAddress: order.shippingAddress,
    totalAmount: order.totalAmount,
    status: order.status,
    createdAt: order.createdAt,
    items,
  };
}

export function canCustomerReviewProduct(
  cartHistory: CartHistoryEntry[],
  productId: string
): boolean {
  if (!productId) return false;
  return (cartHistory || []).some((entry) =>
    (entry.items || []).some((item) => item.productId === productId)
  );
}

export function loadCartHistoryFromStorage(
  storage: Pick<Storage, 'getItem'> | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
): CartHistoryEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(CART_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid: CartHistoryEntry[] = [];
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry === 'object' &&
        typeof entry.orderId === 'string' &&
        typeof entry.orderNumber === 'string' &&
        Array.isArray(entry.items)
      ) {
        valid.push({
          orderId: entry.orderId,
          orderNumber: entry.orderNumber,
          customerName: String(entry.customerName || ''),
          customerPhone: String(entry.customerPhone || ''),
          customerEmail: String(entry.customerEmail || ''),
          shippingAddress: String(entry.shippingAddress || ''),
          totalAmount: Number(entry.totalAmount || 0),
          status: entry.status || 'قيد المراجعة',
          createdAt: String(entry.createdAt || new Date().toISOString()),
          items: entry.items
            .filter((it: unknown) => it && typeof it === 'object')
            .map((it: Record<string, unknown>) => ({
              productId: String(it.productId || ''),
              title: String(it.title || ''),
              imageUrl: String(it.imageUrl || ''),
              selectedColor: String(it.selectedColor || 'افتراضي'),
              quantity: Math.max(1, Number(it.quantity || 1)),
              unitPrice: Number(it.unitPrice || 0),
            })),
        });
      }
    }
    return valid;
  } catch {
    return [];
  }
}

export function saveCartHistoryToStorage(
  history: CartHistoryEntry[],
  storage: Pick<Storage, 'setItem'> | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
): void {
  if (!storage) return;
  try {
    storage.setItem(CART_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage errors
  }
}

export function validateReviewInput(input: ReviewFormInput): {
  valid: boolean;
  error?: string;
} {
  const productId = (input.productId || '').trim();
  const reviewerName = (input.reviewerName || '').trim();
  const comment = (input.comment || '').trim();
  const rating = Number(input.rating);

  if (
    !productId ||
    productId.length > BLUEPRINT_LIMITS.ID_MAX_LEN ||
    !BLUEPRINT_LIMITS.ID_PATTERN.test(productId)
  ) {
    return { valid: false, error: 'معرّف المنتج غير صالح.' };
  }

  if (
    reviewerName.length < BLUEPRINT_LIMITS.REVIEWER_NAME_MIN ||
    reviewerName.length > BLUEPRINT_LIMITS.REVIEWER_NAME_MAX
  ) {
    return { valid: false, error: 'يرجى إدخال اسمك (حرفين على الأقل).' };
  }

  if (
    isNaN(rating) ||
    rating < BLUEPRINT_LIMITS.REVIEW_RATING_MIN ||
    rating > BLUEPRINT_LIMITS.REVIEW_RATING_MAX
  ) {
    return { valid: false, error: 'يرجى اختيار تقييم بين نجمة و 5 نجوم.' };
  }

  if (
    comment.length < BLUEPRINT_LIMITS.REVIEW_COMMENT_MIN ||
    comment.length > BLUEPRINT_LIMITS.REVIEW_COMMENT_MAX
  ) {
    return { valid: false, error: 'يرجى كتابة تعليق التقييم (بين حرفين و 500 حرف).' };
  }

  return { valid: true };
}

export function parseStoredReviews(raw: string | null): ProductReview[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid: ProductReview[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.productId === 'string' &&
        typeof item.reviewerName === 'string' &&
        typeof item.rating === 'number' &&
        item.rating >= 1 &&
        item.rating <= 5 &&
        typeof item.comment === 'string'
      ) {
        valid.push({
          id: item.id,
          productId: item.productId,
          userId: typeof item.userId === 'string' ? item.userId : 'guest-reviewer',
          reviewerName: item.reviewerName,
          rating: Math.min(5, Math.max(1, Math.round(item.rating))),
          comment: item.comment,
          visible: typeof item.visible === 'boolean' ? item.visible : true,
          orderId: typeof item.orderId === 'string' ? item.orderId : undefined,
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
          updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
        });
      }
    }
    return valid;
  } catch {
    return [];
  }
}

export function loadReviewsFromStorage(
  fallbackReviews: ProductReview[] = [],
  storage: Pick<Storage, 'getItem'> | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
): ProductReview[] {
  const merged = new Map<string, ProductReview>();
  for (const r of fallbackReviews) merged.set(r.id, { ...r, visible: r.visible !== false });
  if (storage) {
    try {
      const storedRaw = storage.getItem(REVIEWS_STORAGE_KEY);
      if (storedRaw !== null) {
        const stored = parseStoredReviews(storedRaw);
        return stored;
      }
    } catch {
      // Ignore storage errors
    }
  }
  return Array.from(merged.values());
}

export function saveReviewsToStorage(
  reviews: ProductReview[],
  storage: Pick<Storage, 'setItem'> | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
): void {
  if (!storage) return;
  try {
    storage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // Ignore storage errors
  }
}

export type CatalogSortOption =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'rating-desc'
  | 'discount-desc';

export interface CatalogFilterOptions {
  sortBy?: CatalogSortOption;
  onlyDiscounted?: boolean;
  onlyFeatured?: boolean;
  reviews?: ProductReview[];
}

export function normalizeArabicSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // Strip Arabic diacritics (tashkeel)
    .trim();
}

export function matchesProductSearchQuery(
  product: Product,
  searchQuery: string
): boolean {
  const normalizedQuery = normalizeArabicSearchText(searchQuery);
  if (!normalizedQuery) return true;

  const searchableCorpus = normalizeArabicSearchText(
    [
      product.title,
      product.description,
      product.category,
      product.material,
      product.dimensions,
      ...(product.colors || []),
    ].join(' ')
  );

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return tokens.every((token) => searchableCorpus.includes(token));
}

export function filterProductsByCategoryAndSearch(
  products: Product[],
  selectedCategory: string,
  searchQuery: string,
  options?: CatalogFilterOptions
): Product[] {
  const list = products || [];
  const onlyDiscounted = Boolean(options?.onlyDiscounted);
  const onlyFeatured = Boolean(options?.onlyFeatured);
  const sortBy: CatalogSortOption = options?.sortBy || 'featured';
  const reviews = options?.reviews || [];

  const filtered = list.filter((product) => {
    const matchesCategory =
      !selectedCategory ||
      selectedCategory === 'الكل' ||
      product.category === selectedCategory;

    if (!matchesCategory) return false;
    if (onlyDiscounted && !(product.discountPercent > 0)) return false;
    if (onlyFeatured && !product.featured) return false;

    return matchesProductSearchQuery(product, searchQuery);
  });

  const sorted = [...filtered];
  if (sortBy === 'price-asc') {
    sorted.sort(
      (a, b) =>
        calculateDiscountedPrice(a.price, a.discountPercent) -
        calculateDiscountedPrice(b.price, b.discountPercent)
    );
  } else if (sortBy === 'price-desc') {
    sorted.sort(
      (a, b) =>
        calculateDiscountedPrice(b.price, b.discountPercent) -
        calculateDiscountedPrice(a.price, a.discountPercent)
    );
  } else if (sortBy === 'discount-desc') {
    sorted.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
  } else if (sortBy === 'rating-desc') {
    sorted.sort((a, b) => {
      const rA = calculateProductRatingSummary(reviews, a.id);
      const rB = calculateProductRatingSummary(reviews, b.id);
      if (rB.averageRating !== rA.averageRating) {
        return rB.averageRating - rA.averageRating;
      }
      return rB.ratingsCount - rA.ratingsCount;
    });
  } else if (options?.sortBy === 'featured') {
    sorted.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  }

  return sorted;
}

export function getCategoryProductCounts(
  products: Product[],
  searchQuery = '',
  options?: Pick<CatalogFilterOptions, 'onlyDiscounted' | 'onlyFeatured'>
): Record<string, number> {
  const counts: Record<string, number> = { الكل: 0 };
  for (const cat of PRODUCT_CATEGORIES) {
    counts[cat] = 0;
  }

  const onlyDiscounted = Boolean(options?.onlyDiscounted);
  const onlyFeatured = Boolean(options?.onlyFeatured);

  for (const product of products || []) {
    if (onlyDiscounted && !(product.discountPercent > 0)) continue;
    if (onlyFeatured && !product.featured) continue;
    if (!matchesProductSearchQuery(product, searchQuery)) continue;

    counts['الكل'] = (counts['الكل'] || 0) + 1;
    counts[product.category] = (counts[product.category] || 0) + 1;
  }

  return counts;
}

export const STORE_OWNER_EMAIL = 'ah2005211@gmail.com';
export const CART_STORAGE_KEY = 'starklabs_cart_v1';

export function serializeCartItems(items: CartItem[]): string {
  return JSON.stringify(items);
}

export function parseStoredCartItems(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validItems: CartItem[] = [];
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry === 'object' &&
        entry.product &&
        typeof entry.product === 'object' &&
        typeof entry.product.id === 'string' &&
        typeof entry.product.title === 'string' &&
        typeof entry.product.price === 'number' &&
        typeof entry.selectedColor === 'string' &&
        entry.selectedColor.trim().length > 0 &&
        typeof entry.quantity === 'number' &&
        entry.quantity >= 1
      ) {
        validItems.push({
          product: entry.product,
          selectedColor: entry.selectedColor,
          quantity: Math.max(1, Math.floor(entry.quantity)),
        });
      }
    }
    return validItems;
  } catch {
    return [];
  }
}

export function loadCartFromStorage(
  storage: Pick<Storage, 'getItem'> | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
): CartItem[] {
  if (!storage) return [];
  try {
    return parseStoredCartItems(storage.getItem(CART_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveCartToStorage(
  items: CartItem[],
  storage: Pick<Storage, 'setItem'> | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
): void {
  if (!storage) return;
  try {
    storage.setItem(CART_STORAGE_KEY, serializeCartItems(items));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function calculateDiscountedPrice(price: number, discountPercent: number): number {
  const safePrice = Math.max(0, Number(price) || 0);
  const safeDiscount = Math.min(90, Math.max(0, Number(discountPercent) || 0));
  return Math.round(safePrice * (1 - safeDiscount / 100));
}

export function calculateCartTotals(items: CartItem[]): {
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  itemsCount: number;
} {
  let subtotal = 0;
  let totalAmount = 0;
  let itemsCount = 0;

  for (const item of items) {
    const qty = Math.max(1, Math.floor(item.quantity));
    const unitOriginal = Math.max(0, item.product.price);
    const unitFinal = calculateDiscountedPrice(item.product.price, item.product.discountPercent);
    subtotal += unitOriginal * qty;
    totalAmount += unitFinal * qty;
    itemsCount += qty;
  }

  const discountTotal = Math.max(0, subtotal - totalAmount);
  return { subtotal, discountTotal, totalAmount, itemsCount };
}

export function formatItemsSummary(items: CartItem[]): string {
  const lines = items.map((item) => {
    const unitPrice = calculateDiscountedPrice(item.product.price, item.product.discountPercent);
    return `${item.product.title} (اللون: ${item.selectedColor}) × ${item.quantity} — ${unitPrice * item.quantity} ج.م`;
  });
  const joined = lines.join(' | ');
  return joined.slice(0, BLUEPRINT_LIMITS.ITEMS_SUMMARY_MAX);
}

export function generateOrderNumber(existingCount: number): string {
  const base = 1040 + Math.max(1, existingCount + 1);
  return `SL-${base}`;
}

export function validateCheckoutInput(input: CheckoutFormInput): {
  valid: boolean;
  errors: Partial<Record<keyof CheckoutFormInput, string>>;
} {
  const errors: Partial<Record<keyof CheckoutFormInput, string>> = {};
  const name = input.customerName.trim();
  const email = input.customerEmail.trim();
  const phone = input.customerPhone.trim();
  const address = input.shippingAddress.trim();

  if (name.length < BLUEPRINT_LIMITS.CUSTOMER_NAME_MIN || name.length > BLUEPRINT_LIMITS.CUSTOMER_NAME_MAX) {
    errors.customerName = 'يرجى إدخال الاسم بالكامل (حرفين على الأقل).';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (
    email.length < BLUEPRINT_LIMITS.CUSTOMER_EMAIL_MIN ||
    email.length > BLUEPRINT_LIMITS.CUSTOMER_EMAIL_MAX ||
    !emailRegex.test(email)
  ) {
    errors.customerEmail = 'يرجى إدخال بريد إلكتروني صحيح لاستلام تأكيد الطلب.';
  }

  const phoneClean = phone.replace(/\s+/g, '');
  if (
    phoneClean.length < BLUEPRINT_LIMITS.CUSTOMER_PHONE_MIN ||
    phoneClean.length > BLUEPRINT_LIMITS.CUSTOMER_PHONE_MAX ||
    !/^[0-9+()-]+$/.test(phoneClean)
  ) {
    errors.customerPhone = 'يرجى إدخال رقم هاتف أو واتساب صحيح (8 أرقام على الأقل).';
  }

  if (typeof input.governorate === 'string' && input.governorate.trim().length === 0) {
    errors.governorate = 'يرجى اختيار المحافظة.';
  }

  if (
    address.length < BLUEPRINT_LIMITS.SHIPPING_ADDRESS_MIN ||
    address.length > BLUEPRINT_LIMITS.SHIPPING_ADDRESS_MAX
  ) {
    errors.shippingAddress = 'يرجى كتابة العنوان بالتفصيل (المنطقة، الشارع، رقم العقار).';
  }

  if (input.notes.trim().length > BLUEPRINT_LIMITS.NOTES_MAX) {
    errors.notes = 'الملاحظات يجب ألا تتجاوز 500 حرف.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateProductInput(input: ProductFormInput): {
  valid: boolean;
  error?: string;
  colors: string[];
} {
  const title = input.title.trim();
  const description = input.description.trim();
  const material = input.material.trim();
  const dimensions = input.dimensions.trim();
  const imageUrl = input.imageUrl.trim();
  const postUrl = input.postUrl.trim();

  if (title.length < BLUEPRINT_LIMITS.PRODUCT_TITLE_MIN || title.length > BLUEPRINT_LIMITS.PRODUCT_TITLE_MAX) {
    return { valid: false, error: 'اسم المنتج يجب أن يكون بين حرفين و 120 حرفاً.', colors: [] };
  }

  if (!PRODUCT_CATEGORIES.includes(input.category)) {
    return { valid: false, error: 'يرجى اختيار قسم صحيح للمنتج.', colors: [] };
  }

  if (
    description.length < BLUEPRINT_LIMITS.PRODUCT_DESC_MIN ||
    description.length > BLUEPRINT_LIMITS.PRODUCT_DESC_MAX
  ) {
    return { valid: false, error: 'وصف المنتج يجب أن يكون بين 5 و 1000 حرف.', colors: [] };
  }

  if (isNaN(input.price) || input.price < 0 || input.price > 1000000) {
    return { valid: false, error: 'يرجى تحديد سعر صحيح للمنتج.', colors: [] };
  }

  if (isNaN(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 90) {
    return { valid: false, error: 'نسبة الخصم يجب أن تكون بين 0% و 90%.', colors: [] };
  }

  if (imageUrl.length < 1 || imageUrl.length > BLUEPRINT_LIMITS.PRODUCT_IMAGE_MAX) {
    return { valid: false, error: 'يرجى إدخال رابط صورة المنتج.', colors: [] };
  }

  if (postUrl.length > BLUEPRINT_LIMITS.PRODUCT_POST_URL_MAX) {
    return { valid: false, error: 'رابط البوست أو الفيديو طويل جداً.', colors: [] };
  }

  if (
    material.length < BLUEPRINT_LIMITS.PRODUCT_MATERIAL_MIN ||
    material.length > BLUEPRINT_LIMITS.PRODUCT_MATERIAL_MAX
  ) {
    return { valid: false, error: 'يرجى تحديد خامة الطباعة (مثل PLA+ أو PETG).', colors: [] };
  }

  if (
    dimensions.length < BLUEPRINT_LIMITS.PRODUCT_DIMENSIONS_MIN ||
    dimensions.length > BLUEPRINT_LIMITS.PRODUCT_DIMENSIONS_MAX
  ) {
    return { valid: false, error: 'يرجى تحديد أبعاد المنتج.', colors: [] };
  }

  const parsedColors = input.colorsText
    .split(/[،,]/)
    .map((c) => c.trim().slice(0, BLUEPRINT_LIMITS.COLOR_NAME_MAX))
    .filter((c) => c.length > 0)
    .slice(0, BLUEPRINT_LIMITS.PRODUCT_COLORS_MAX);

  if (parsedColors.length === 0) {
    return { valid: false, error: 'يرجى إضافة لون واحد متاح على الأقل.', colors: [] };
  }

  return { valid: true, colors: parsedColors };
}

export function isValidOrderStatus(status: string): boolean {
  return (ORDER_STATUSES as string[]).includes(status);
}

/**
 * Determines whether the current browser location targets the standalone
 * Admin & Orders portal (/admin, ?portal=admin, ?admin=1, or #/admin).
 */
export function isAdminPortalLocation(loc: {
  pathname: string;
  search: string;
  hash: string;
}): boolean {
  const path = (loc.pathname || '').toLowerCase();
  if (path === '/admin' || path.startsWith('/admin/')) {
    return true;
  }
  const params = new URLSearchParams(loc.search || '');
  if (params.get('portal') === 'admin' || params.has('admin')) {
    return true;
  }
  const hash = (loc.hash || '').toLowerCase();
  if (hash === '#admin' || hash.startsWith('#/admin')) {
    return true;
  }
  return false;
}

/**
 * Builds a shareable direct link for an individual product.
 */
export function buildProductShareUrl(origin: string, productId: string): string {
  const cleanOrigin = (origin || '').replace(/\/+$/, '');
  return `${cleanOrigin}/?product=${encodeURIComponent(productId.trim())}`;
}

/**
 * Extracts a requested product ID from the current URL (?product=..., /product/..., or #product=...).
 */
export function getRequestedProductIdFromLocation(loc: {
  pathname: string;
  search: string;
  hash: string;
}): string | null {
  const params = new URLSearchParams(loc.search || '');
  const queryProduct = params.get('product');
  if (queryProduct && queryProduct.trim().length > 0) {
    return queryProduct.trim();
  }

  const pathMatch = (loc.pathname || '').match(/^\/product\/([^/?#]+)/i);
  if (pathMatch && pathMatch[1]) {
    try {
      return decodeURIComponent(pathMatch[1]).trim();
    } catch {
      return pathMatch[1].trim();
    }
  }

  const hash = loc.hash || '';
  if (hash.startsWith('#product=')) {
    return decodeURIComponent(hash.slice('#product='.length)).trim() || null;
  }

  return null;
}

/**
 * Encodes a UTF-8 string into base64url format required by the Gmail REST API.
 */
export function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(str, 'utf-8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Builds an RFC 2822 MIME message encoded in base64url for Gmail API users/me/messages/send.
 */
export function buildOrderConfirmationMime(params: {
  recipientEmail: string;
  recipientRole: 'customer' | 'admin';
  order: Order;
}): string {
  const { recipientEmail, recipientRole, order } = params;
  const subjectText =
    recipientRole === 'customer'
      ? `تأكيد طلبك من StarkLaBs رقم ${order.orderNumber}`
      : `طلب جديد على StarkLaBs رقم ${order.orderNumber} — ${order.customerName}`;

  const encodedSubjectBytes = new TextEncoder().encode(subjectText);
  let subjectBinary = '';
  for (let i = 0; i < encodedSubjectBytes.byteLength; i++) {
    subjectBinary += String.fromCharCode(encodedSubjectBytes[i]);
  }
  const subjectBase64 =
    typeof btoa === 'function'
      ? btoa(subjectBinary)
      : Buffer.from(subjectText, 'utf-8').toString('base64');
  const mimeSubject = `=?UTF-8?B?${subjectBase64}?=`;

  const greeting =
    recipientRole === 'customer'
      ? `مرحباً ${order.customerName}،\nشكراً لطلبك من معمل StarkLaBs للطباعة ثلاثية الأبعاد! تم استلام طلبك بنجاح وجاري تجهيزه.`
      : `مرحباً إدارة StarkLaBs،\nتم تسجيل طلب طباعة ثلاثية الأبعاد جديد على الموقع وفيما يلي التفاصيل الكاملة:`;

  const bodyLines = [
    greeting,
    '',
    '========================================',
    `رقم الطلب: ${order.orderNumber}`,
    `الحالة الحالية: ${order.status}`,
    `اسم العميل: ${order.customerName}`,
    `البريد الإلكتروني: ${order.customerEmail}`,
    `رقم الهاتف / واتساب: ${order.customerPhone}`,
    `عنوان التوصيل: ${order.shippingAddress}`,
    '----------------------------------------',
    'المنتجات المطلوبة والألوان:',
    order.itemsSummary,
    '----------------------------------------',
    `إجمالي المنتجات قبل الخصم: ${order.subtotal} ج.م`,
    `قيمة الخصم: ${order.discountTotal} ج.م`,
    `الإجمالي النهائي المطلوب: ${order.totalAmount} ج.م`,
    order.notes ? `ملاحظات خاصة: ${order.notes}` : '',
    '========================================',
    '',
    'StarkLaBs — دقة هندسية في الطباعة ثلاثية الأبعاد',
  ].filter(Boolean);

  const rawMessage = [
    `To: ${recipientEmail}`,
    `Subject: ${mimeSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    bodyLines.join('\r\n'),
  ].join('\r\n');

  return encodeBase64Url(rawMessage);
}
