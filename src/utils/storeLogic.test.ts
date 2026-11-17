import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDiscountedPrice,
  calculateCartTotals,
  formatItemsSummary,
  validateCheckoutInput,
  validateProductInput,
  buildOrderConfirmationMime,
  isAdminPortalLocation,
  CART_STORAGE_KEY,
  serializeCartItems,
  parseStoredCartItems,
  loadCartFromStorage,
  saveCartToStorage,
  buildProductShareUrl,
  getRequestedProductIdFromLocation,
  filterProductsByCategoryAndSearch,
} from './storeLogic';
import { CartItem, Order, Product } from '../types/store';

const sampleProduct: Product = {
  id: 'prod-helmet-1',
  title: 'خوذة آيرون مان MK-85 متحركة',
  category: 'مجسمات وخوذ',
  description: 'خوذة مطبوعة بتقنية 3D عالية الدقة بخامة PLA+ Silk',
  price: 2000,
  discountPercent: 15,
  imageUrl: '/src/assets/images/product_iron_helmet_mk85_1794811279383.jpg',
  postUrl: 'https://facebook.com/StarkLaBs/videos/101',
  material: 'PLA+ Silk Metallic',
  printTimeHours: 36,
  dimensions: '28 × 22 × 25 سم',
  colors: ['أحمر معدني', 'ذهبي مطفي'],
  inStock: true,
  featured: true,
  authorId: 'admin-1',
};

test('calculateDiscountedPrice applies percentage discount accurately', () => {
  assert.equal(calculateDiscountedPrice(2000, 15), 1700);
  assert.equal(calculateDiscountedPrice(1000, 0), 1000);
  assert.equal(calculateDiscountedPrice(500, 20), 400);
});

test('calculateCartTotals computes subtotal, discountTotal, totalAmount, and itemsCount', () => {
  const items: CartItem[] = [
    { product: sampleProduct, selectedColor: 'أحمر معدني', quantity: 2 },
  ];
  const totals = calculateCartTotals(items);
  assert.equal(totals.itemsCount, 2);
  assert.equal(totals.subtotal, 4000);
  assert.equal(totals.totalAmount, 3400);
  assert.equal(totals.discountTotal, 600);
});

test('formatItemsSummary includes product title, color, quantity, and price', () => {
  const items: CartItem[] = [
    { product: sampleProduct, selectedColor: 'ذهبي مطفي', quantity: 1 },
  ];
  const summary = formatItemsSummary(items);
  assert.equal(summary.includes('خوذة آيرون مان MK-85 متحركة'), true);
  assert.equal(summary.includes('ذهبي مطفي'), true);
  assert.equal(summary.includes('1700 ج.م'), true);
});

test('validateCheckoutInput rejects invalid or empty customer fields and accepts valid data', () => {
  const invalidResult = validateCheckoutInput({
    customerName: 'أ',
    customerEmail: 'invalid-email',
    customerPhone: '123',
    shippingAddress: 'قصير',
    notes: '',
  });
  assert.equal(invalidResult.valid, false);
  assert.ok(invalidResult.errors.customerName);
  assert.ok(invalidResult.errors.customerEmail);
  assert.ok(invalidResult.errors.customerPhone);
  assert.ok(invalidResult.errors.shippingAddress);

  const validResult = validateCheckoutInput({
    customerName: 'أحمد محمود',
    customerEmail: 'ahmed@example.com',
    customerPhone: '01012345678',
    shippingAddress: 'القاهرة، مدينة نصر، شارع عباس العقاد، عمارة 15',
    notes: 'يرجى التأكيد قبل الشحن',
  });
  assert.equal(validResult.valid, true);
  assert.equal(Object.keys(validResult.errors).length, 0);
});

test('validateProductInput parses Arabic comma-separated colors and validates bounds', () => {
  const result = validateProductInput({
    title: 'مصباح هندسي فورنوي',
    category: 'إضاءة وديكور',
    description: 'مصباح مكتبي مطبوع بتقنية ثلاثية الأبعاد مع إضاءة دافئة.',
    price: 850,
    discountPercent: 10,
    imageUrl: '/src/assets/images/product_geometric_lamp_1794811300622.jpg',
    postUrl: 'https://facebook.com/StarkLaBs/posts/202',
    material: 'PLA Matte',
    printTimeHours: 14,
    dimensions: '24 × 15 سم',
    colorsText: 'أبيض دافئ، أسود مطفي, رمادي تيتانيوم',
    inStock: true,
    featured: true,
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.colors, ['أبيض دافئ', 'أسود مطفي', 'رمادي تيتانيوم']);
});

test('buildOrderConfirmationMime generates valid base64url encoded MIME message', () => {
  const order: Order = {
    id: 'ord-101',
    orderNumber: 'SL-1041',
    customerId: 'user-123',
    customerName: 'أحمد علي',
    customerEmail: 'customer@example.com',
    customerPhone: '01098765432',
    shippingAddress: 'الجيزة، المهندسين، شارع جامعة الدول العربية',
    itemsSummary: 'خوذة آيرون مان (اللون: أحمر معدني) × 1 — 1700 ج.م',
    itemsCount: 1,
    subtotal: 2000,
    discountTotal: 300,
    totalAmount: 1700,
    status: 'قيد المراجعة',
    notes: '',
    emailSent: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const encoded = buildOrderConfirmationMime({
    recipientEmail: 'customer@example.com',
    recipientRole: 'customer',
    order,
  });
  assert.equal(typeof encoded, 'string');
  assert.equal(encoded.length > 50, true);
  assert.equal(encoded.includes('+'), false);
  assert.equal(encoded.includes('/'), false);
});

test('isAdminPortalLocation detects standalone /admin path, query, and hash routes', () => {
  assert.equal(isAdminPortalLocation({ pathname: '/', search: '', hash: '' }), false);
  assert.equal(isAdminPortalLocation({ pathname: '/admin', search: '', hash: '' }), true);
  assert.equal(isAdminPortalLocation({ pathname: '/admin/', search: '', hash: '' }), true);
  assert.equal(isAdminPortalLocation({ pathname: '/', search: '?portal=admin', hash: '' }), true);
  assert.equal(isAdminPortalLocation({ pathname: '/', search: '', hash: '#/admin' }), true);
});

test('loadCartFromStorage and saveCartToStorage persist and restore cart items accurately', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, val);
    },
  };

  const items: CartItem[] = [
    { product: sampleProduct, selectedColor: 'أحمر معدني', quantity: 3 },
  ];

  saveCartToStorage(items, mockStorage);
  assert.equal(store.has(CART_STORAGE_KEY), true);

  const restored = loadCartFromStorage(mockStorage);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].product.id, 'prod-helmet-1');
  assert.equal(restored[0].selectedColor, 'أحمر معدني');
  assert.equal(restored[0].quantity, 3);

  // Corrupted JSON returns empty array gracefully
  assert.deepEqual(parseStoredCartItems('{broken-json'), []);
  assert.deepEqual(parseStoredCartItems(serializeCartItems([])), []);
});

test('buildProductShareUrl and getRequestedProductIdFromLocation generate and parse individual product links', () => {
  const link = buildProductShareUrl('https://starklabs.example.com/', 'prod-iron-helmet-mk85');
  assert.equal(link, 'https://starklabs.example.com/?product=prod-iron-helmet-mk85');

  assert.equal(
    getRequestedProductIdFromLocation({
      pathname: '/',
      search: '?product=prod-iron-helmet-mk85',
      hash: '',
    }),
    'prod-iron-helmet-mk85'
  );
  assert.equal(
    getRequestedProductIdFromLocation({
      pathname: '/product/prod-dragon-2',
      search: '',
      hash: '',
    }),
    'prod-dragon-2'
  );
  assert.equal(
    getRequestedProductIdFromLocation({
      pathname: '/',
      search: '',
      hash: '',
    }),
    null
  );
});

test('filterProductsByCategoryAndSearch filters in real time by product title or description', () => {
  const secondProduct: Product = {
    ...sampleProduct,
    id: 'prod-lamp-2',
    title: 'مصباح مكتب معماري حلزوني مضيء',
    category: 'إضاءة وديكور',
    description: 'وحدة إضاءة ديكورية بتصميم بارامتري ومشتت ضوئي ناعم.',
    price: 600,
    colors: ['أبيض دافئ', 'فحمي مطفي'],
  };
  const catalog = [sampleProduct, secondProduct];

  // Match by title (including Arabic alef/teh-marbuta normalization)
  const byTitle = filterProductsByCategoryAndSearch(catalog, 'الكل', 'خوذه ايرون');
  assert.equal(byTitle.length, 1);
  assert.equal(byTitle[0].id, 'prod-helmet-1');

  // Match by description
  const byDesc = filterProductsByCategoryAndSearch(catalog, 'الكل', 'مشتت ضوئي');
  assert.equal(byDesc.length, 1);
  assert.equal(byDesc[0].id, 'prod-lamp-2');

  // Match by color or material
  const byColor = filterProductsByCategoryAndSearch(catalog, 'الكل', 'ذهبي');
  assert.equal(byColor.length, 1);
  assert.equal(byColor[0].id, 'prod-helmet-1');

  // Sort by price ascending
  const sortedAsc = filterProductsByCategoryAndSearch(catalog, 'الكل', '', {
    sortBy: 'price-asc',
  });
  assert.equal(sortedAsc[0].id, 'prod-lamp-2');

  // Combined category + search query
  const mismatchCategory = filterProductsByCategoryAndSearch(catalog, 'مجسمات وخوذ', 'مصباح');
  assert.equal(mismatchCategory.length, 0);
});

test('calculateProductRatingSummary and validateReviewInput compute ratings and validate review bounds', async () => {
  const { calculateProductRatingSummary, validateReviewInput } = await import('./storeLogic');

  const summary = calculateProductRatingSummary(
    [
      {
        id: 'r1',
        productId: 'prod-helmet-1',
        userId: 'u1',
        reviewerName: 'أحمد',
        rating: 5,
        comment: 'ممتاز جداً',
        createdAt: '2026-11-16T00:00:00.000Z',
        updatedAt: '2026-11-16T00:00:00.000Z',
      },
      {
        id: 'r2',
        productId: 'prod-helmet-1',
        userId: 'u2',
        reviewerName: 'سارة',
        rating: 4,
        comment: 'جودة طباعة رائعة',
        createdAt: '2026-11-16T00:00:00.000Z',
        updatedAt: '2026-11-16T00:00:00.000Z',
      },
    ],
    'prod-helmet-1'
  );

  assert.equal(summary.ratingsCount, 2);
  assert.equal(summary.averageRating, 4.5);

  assert.equal(
    validateReviewInput({
      productId: 'prod-helmet-1',
      reviewerName: 'كريم',
      rating: 5,
      comment: 'خامة ممتازة وتفاصيل دقيقة',
    }).valid,
    true
  );

  assert.equal(
    validateReviewInput({
      productId: 'prod-helmet-1',
      reviewerName: 'أ',
      rating: 5,
      comment: 'جيد',
    }).valid,
    false
  );
});

test('toggleProductFeaturedState, getFeaturedShowcaseProducts, and getNextCarouselIndex manage featured showcase', async () => {
  const {
    toggleProductFeaturedState,
    getFeaturedShowcaseProducts,
    getNextCarouselIndex,
    FEATURED_AUTO_ADVANCE_MS,
  } = await import('./storeLogic');

  assert.equal(FEATURED_AUTO_ADVANCE_MS, 2000);

  const p1: Product = { ...sampleProduct, id: 'p1', featured: true };
  const p2: Product = { ...sampleProduct, id: 'p2', featured: false };
  const catalog = [p1, p2];

  assert.equal(getFeaturedShowcaseProducts(catalog).length, 1);
  assert.equal(getFeaturedShowcaseProducts(catalog)[0].id, 'p1');

  const toggled = toggleProductFeaturedState(catalog, 'p2', true);
  assert.equal(getFeaturedShowcaseProducts(toggled).length, 2);

  assert.equal(getNextCarouselIndex(0, 3, 'next'), 1);
  assert.equal(getNextCarouselIndex(2, 3, 'next'), 0);
  assert.equal(getNextCarouselIndex(0, 3, 'prev'), 2);
});

test('loadCustomerInfoFromStorage, saveCustomerInfoToStorage, formatFullShippingAddress, and resolveSwipeDirection work accurately', async () => {
  const {
    CUSTOMER_INFO_STORAGE_KEY,
    loadCustomerInfoFromStorage,
    saveCustomerInfoToStorage,
    formatFullShippingAddress,
    resolveSwipeDirection,
  } = await import('./storeLogic');

  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, val);
    },
  };

  saveCustomerInfoToStorage(
    {
      customerName: 'كريم عادل',
      customerPhone: '01099887766',
      customerEmail: 'karim@example.com',
      governorate: 'الإسكندرية',
      shippingAddress: 'سموحة، شارع فوزي معاذ، برج النور',
      notes: 'التوصيل مساءً',
    },
    mockStorage
  );

  assert.equal(store.has(CUSTOMER_INFO_STORAGE_KEY), true);
  const loaded = loadCustomerInfoFromStorage(mockStorage);
  assert.equal(loaded.customerName, 'كريم عادل');
  assert.equal(loaded.customerPhone, '01099887766');
  assert.equal(loaded.customerEmail, 'karim@example.com');
  assert.equal(loaded.governorate, 'الإسكندرية');
  assert.equal(loaded.shippingAddress, 'سموحة، شارع فوزي معاذ، برج النور');

  assert.equal(
    formatFullShippingAddress('الإسكندرية', 'سموحة، شارع فوزي معاذ'),
    'الإسكندرية — سموحة، شارع فوزي معاذ'
  );

  // Manual RTL swipe direction resolution (+X right swipe -> next, -X left swipe -> prev)
  assert.equal(resolveSwipeDirection(65, 0), 'next');
  assert.equal(resolveSwipeDirection(-65, 0), 'prev');
  assert.equal(resolveSwipeDirection(10, 0), null);
});

test('Cart History, verified-purchase review eligibility, and admin review moderation work accurately', async () => {
  const {
    createCartHistoryEntry,
    canCustomerReviewProduct,
    loadCartHistoryFromStorage,
    saveCartHistoryToStorage,
    toggleReviewVisibility,
    removeReviewById,
    calculateProductRatingSummary,
  } = await import('./storeLogic');

  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, val);
    },
  };

  const sampleOrder: Order = {
    id: 'ord-500',
    orderNumber: 'SL-1055',
    customerId: 'guest-500',
    customerName: 'يوسف طارق',
    customerEmail: 'youssef@example.com',
    customerPhone: '01122334455',
    shippingAddress: 'القاهرة — المعادي، شارع 9',
    itemsSummary: 'خوذة آيرون مان × 1',
    itemsCount: 1,
    subtotal: 2000,
    discountTotal: 300,
    totalAmount: 1700,
    status: 'قيد المراجعة',
    notes: '',
    emailSent: false,
    createdAt: '2026-11-16T00:00:00.000Z',
    updatedAt: '2026-11-16T00:00:00.000Z',
  };

  const historyEntry = createCartHistoryEntry(sampleOrder, [
    { product: sampleProduct, selectedColor: 'أحمر معدني', quantity: 1 },
  ]);

  saveCartHistoryToStorage([historyEntry], mockStorage);
  const loadedHistory = loadCartHistoryFromStorage(mockStorage);
  assert.equal(loadedHistory.length, 1);
  assert.equal(loadedHistory[0].orderNumber, 'SL-1055');
  assert.equal(loadedHistory[0].items.length, 1);
  assert.equal(loadedHistory[0].items[0].productId, 'prod-helmet-1');

  // Customer can review purchased product, but CANNOT review unpurchased product
  assert.equal(canCustomerReviewProduct(loadedHistory, 'prod-helmet-1'), true);
  assert.equal(canCustomerReviewProduct(loadedHistory, 'prod-unpurchased-99'), false);

  // Admin review visibility toggle & deletion
  const initialReviews = [
    {
      id: 'rev-1',
      productId: 'prod-helmet-1',
      userId: 'u1',
      reviewerName: 'يوسف طارق',
      rating: 5,
      comment: 'ممتاز',
      visible: true,
      createdAt: '2026-11-16T00:00:00.000Z',
      updatedAt: '2026-11-16T00:00:00.000Z',
    },
    {
      id: 'rev-2',
      productId: 'prod-helmet-1',
      userId: 'u2',
      reviewerName: 'عميل آخر',
      rating: 3,
      comment: 'جيد',
      visible: true,
      createdAt: '2026-11-16T00:00:00.000Z',
      updatedAt: '2026-11-16T00:00:00.000Z',
    },
  ];

  assert.equal(calculateProductRatingSummary(initialReviews, 'prod-helmet-1').ratingsCount, 2);

  const afterHide = toggleReviewVisibility(initialReviews, 'rev-2', false);
  const summaryAfterHide = calculateProductRatingSummary(afterHide, 'prod-helmet-1');
  assert.equal(summaryAfterHide.ratingsCount, 1);
  assert.equal(summaryAfterHide.averageRating, 5);

  const afterDelete = removeReviewById(afterHide, 'rev-1');
  assert.equal(afterDelete.length, 1);
  assert.equal(calculateProductRatingSummary(afterDelete, 'prod-helmet-1').ratingsCount, 0);
});


