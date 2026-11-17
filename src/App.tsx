/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowUpDown,
  CheckCircle2,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import {
  auth,
  db,
  googleSignIn,
  handleFirestoreError,
  initAuth,
  logout,
  OperationType,
  sendOrderConfirmationViaGmail,
} from './lib/firebase';
import {
  CartHistoryEntry,
  CartItem,
  CheckoutFormInput,
  Order,
  OrderStatus,
  Product,
  PRODUCT_CATEGORIES,
  ProductFormInput,
  ProductReview,
  ReviewFormInput,
} from './types/store';
import {
  calculateCartTotals,
  calculateProductRatingSummary,
  CatalogSortOption,
  createCartHistoryEntry,
  filterProductsByCategoryAndSearch,
  formatFullShippingAddress,
  formatItemsSummary,
  generateOrderNumber,
  getCategoryProductCounts,
  getFeaturedShowcaseProducts,
  getRequestedProductIdFromLocation,
  isAdminPortalLocation,
  loadCartFromStorage,
  loadCartHistoryFromStorage,
  loadProductsFromStorage,
  loadReviewsFromStorage,
  removeReviewById,
  saveCartHistoryToStorage,
  saveCartToStorage,
  saveProductsToStorage,
  saveReviewsToStorage,
  STORE_OWNER_EMAIL,
  toggleProductFeaturedState,
  toggleReviewVisibility,
  validateProductInput,
  validateReviewInput,
} from './utils/storeLogic';
import { HERO_IMAGE_PATH, SEED_ORDERS, SEED_PRODUCTS, SEED_REVIEWS } from './data/seedProducts';
import { Navbar, AppView } from './components/Navbar';
import { StarkLabsLogo } from './components/StarkLabsLogo';
import { OfflineIndicator } from './components/PWAInstallButton';
import { ProductCard } from './components/ProductCard';
import { FeaturedProductCarousel } from './components/FeaturedProductCarousel';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer, CartDrawerTab } from './components/CartDrawer';
import { GmailConfirmModal } from './components/GmailConfirmModal';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [isAdminPortal, setIsAdminPortal] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isAdminPortalLocation(window.location) : false
  );
  const [activeView, setActiveView] = useState<AppView>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [catalogSortBy, setCatalogSortBy] = useState<CatalogSortOption>('featured');
  const [onlyDiscounted, setOnlyDiscounted] = useState<boolean>(false);
  const [onlyFeatured, setOnlyFeatured] = useState<boolean>(false);

  // Auth & Gmail OAuth Token State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Store Catalog, Orders & Product Reviews State
  const [products, setProducts] = useState<Product[]>(() =>
    loadProductsFromStorage(SEED_PRODUCTS)
  );
  const [orders, setOrders] = useState<Order[]>(SEED_ORDERS);
  const [reviews, setReviews] = useState<ProductReview[]>(() =>
    loadReviewsFromStorage(SEED_REVIEWS)
  );

  // Shopping Cart & Cart Order History (Persisted in LocalStorage) & Selected Product Modal State
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadCartFromStorage());
  const [cartHistory, setCartHistory] = useState<CartHistoryEntry[]>(() =>
    loadCartHistoryFromStorage()
  );
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartInitialTab, setCartInitialTab] = useState<CartDrawerTab>('items');
  const [activeProductModal, setActiveProductModal] = useState<{
    product: Product;
    initialColor: string;
  } | null>(null);

  // Gmail Explicit Confirmation Dialog State
  const [orderPendingEmail, setOrderPendingEmail] = useState<Order | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Persist shopping cart to LocalStorage whenever cartItems change
  useEffect(() => {
    saveCartToStorage(cartItems);
  }, [cartItems]);

  // Persist customer Cart History to LocalStorage whenever cartHistory changes
  useEffect(() => {
    saveCartHistoryToStorage(cartHistory);
  }, [cartHistory]);

  // Persist catalog & featured flags to LocalStorage whenever products change
  useEffect(() => {
    saveProductsToStorage(products);
  }, [products]);

  // Persist product reviews to LocalStorage whenever reviews change
  useEffect(() => {
    saveReviewsToStorage(reviews);
  }, [reviews]);

  const openProductModal = (prod: Product, initialColor: string) => {
    setActiveProductModal({ product: prod, initialColor });
    if (typeof window !== 'undefined' && !isAdminPortalLocation(window.location)) {
      const nextUrl = `${window.location.pathname}?product=${encodeURIComponent(prod.id)}`;
      window.history.replaceState(null, '', nextUrl);
    }
  };

  const closeProductModal = () => {
    setActiveProductModal(null);
    if (typeof window !== 'undefined' && !isAdminPortalLocation(window.location)) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // Automatically open product modal if URL contains ?product=<id>
  useEffect(() => {
    if (typeof window === 'undefined' || isAdminPortal) return;
    const requestedId = getRequestedProductIdFromLocation(window.location);
    if (requestedId) {
      const matched = products.find((p) => p.id === requestedId);
      if (matched) {
        setActiveProductModal({
          product: matched,
          initialColor: matched.colors[0] || 'افتراضي',
        });
      }
    }
  }, [products, isAdminPortal]);

  useEffect(() => {
    const syncLocation = () => {
      setIsAdminPortal(isAdminPortalLocation(window.location));
      const requestedId = getRequestedProductIdFromLocation(window.location);
      if (requestedId) {
        const matched = products.find((p) => p.id === requestedId);
        if (matched) {
          setActiveProductModal({
            product: matched,
            initialColor: matched.colors[0] || 'افتراضي',
          });
        }
      }
    };
    window.addEventListener('popstate', syncLocation);
    window.addEventListener('hashchange', syncLocation);
    return () => {
      window.removeEventListener('popstate', syncLocation);
      window.removeEventListener('hashchange', syncLocation);
    };
  }, [products]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (loggedInUser, token) => {
        setUser(loggedInUser);
        if (token) setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeView, isAdminPortal]);

  // Firestore real-time listener for Products
  useEffect(() => {
    const productsQuery = query(collection(db, 'products'), where('price', '>=', 0));
    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Product[] = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              title: String(d.title || ''),
              category: d.category || 'مجسمات وخوذ',
              description: String(d.description || ''),
              price: Number(d.price || 0),
              discountPercent: Number(d.discountPercent || 0),
              imageUrl: String(d.imageUrl || ''),
              postUrl: String(d.postUrl || ''),
              material: String(d.material || 'PLA+'),
              printTimeHours: Number(d.printTimeHours || 1),
              dimensions: String(d.dimensions || ''),
              colors: Array.isArray(d.colors) ? d.colors : ['افتراضي'],
              inStock: Boolean(d.inStock ?? true),
              featured: Boolean(d.featured ?? false),
              authorId: String(d.authorId || ''),
            };
          });
          const mergedMap = new Map<string, Product>();
          for (const sp of SEED_PRODUCTS) mergedMap.set(sp.id, sp);
          for (const lp of loaded) mergedMap.set(lp.id, lp);
          setProducts(Array.from(mergedMap.values()));
        }
      },
      (err) => {
        if (auth.currentUser) {
          try {
            handleFirestoreError(err, OperationType.LIST, 'products');
          } catch {
            // Handled
          }
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Firestore real-time listener for Product Reviews
  useEffect(() => {
    const reviewsQuery = query(collection(db, 'reviews'), where('rating', '>=', 1));
    const unsubscribe = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedReviews: ProductReview[] = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              productId: String(d.productId || ''),
              userId: String(d.userId || ''),
              reviewerName: String(d.reviewerName || 'عميل StarkLaBs'),
              rating: Math.min(5, Math.max(1, Number(d.rating || 5))),
              comment: String(d.comment || ''),
              visible: typeof d.visible === 'boolean' ? d.visible : true,
              orderId: typeof d.orderId === 'string' ? d.orderId : undefined,
              createdAt: d.createdAt?.toDate
                ? d.createdAt.toDate().toISOString()
                : new Date().toISOString(),
              updatedAt: d.updatedAt?.toDate
                ? d.updatedAt.toDate().toISOString()
                : new Date().toISOString(),
            };
          });
          setReviews((prev) => {
            const merged = new Map<string, ProductReview>();
            for (const pr of prev) merged.set(pr.id, pr);
            for (const lr of loadedReviews) merged.set(lr.id, lr);
            return Array.from(merged.values());
          });
        }
      },
      (err) => {
        if (auth.currentUser) {
          try {
            handleFirestoreError(err, OperationType.LIST, 'reviews');
          } catch {
            // Handled
          }
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Firestore real-time listener for Orders
  useEffect(() => {
    if (!user || !user.emailVerified) return;

    const isAdminUser = user.email === STORE_OWNER_EMAIL;
    const ordersQuery = isAdminUser
      ? collection(db, 'orders')
      : query(collection(db, 'orders'), where('customerId', '==', user.uid));

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedOrders: Order[] = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              orderNumber: String(d.orderNumber || 'SL-1000'),
              customerId: String(d.customerId || ''),
              customerName: String(d.customerName || ''),
              customerEmail: String(d.customerEmail || ''),
              customerPhone: String(d.customerPhone || ''),
              shippingAddress: String(d.shippingAddress || ''),
              itemsSummary: String(d.itemsSummary || ''),
              itemsCount: Number(d.itemsCount || 1),
              subtotal: Number(d.subtotal || 0),
              discountTotal: Number(d.discountTotal || 0),
              totalAmount: Number(d.totalAmount || 0),
              status: (d.status as OrderStatus) || 'قيد المراجعة',
              notes: String(d.notes || ''),
              emailSent: Boolean(d.emailSent),
              createdAt: d.createdAt?.toDate
                ? d.createdAt.toDate().toISOString()
                : new Date().toISOString(),
              updatedAt: d.updatedAt?.toDate
                ? d.updatedAt.toDate().toISOString()
                : new Date().toISOString(),
            };
          });
          const mergedOrders = new Map<string, Order>();
          for (const so of SEED_ORDERS) mergedOrders.set(so.id, so);
          for (const lo of loadedOrders) mergedOrders.set(lo.id, lo);
          setOrders(Array.from(mergedOrders.values()));
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'orders');
        } catch {
          // Handled
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setAccessToken(result.accessToken);
      showToast(`تم ربط حساب Google (${result.user.displayName || result.user.email})`);
    } catch {
      showToast('تعذر تسجيل الدخول عبر Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    showToast('تم تسجيل الخروج.');
  };

  const handleAddToCart = (product: Product, selectedColor: string, quantity: number) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedColor === selectedColor
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { product, selectedColor, quantity }];
    });
    showToast(`أُضيف "${product.title}" (${selectedColor}) للسلة`);
  };

  const handleUpdateCartQuantity = (productId: string, color: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.selectedColor === color) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((Boolean as unknown) as (item: CartItem | null) => item is CartItem)
    );
  };

  const handleRemoveCartItem = (productId: string, color: string) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.product.id === productId && item.selectedColor === color))
    );
  };

  const handleAddReview = async (input: ReviewFormInput) => {
    const validation = validateReviewInput(input);
    if (!validation.valid) return;

    const reviewId = `rev-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const reviewerUid = user?.uid || `guest-${Date.now()}`;

    const newReview: ProductReview = {
      id: reviewId,
      productId: input.productId.trim().slice(0, 128),
      userId: reviewerUid,
      reviewerName: input.reviewerName.trim().slice(0, 80),
      rating: Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5))),
      comment: input.comment.trim().slice(0, 500),
      visible: true,
      orderId: input.orderId ? input.orderId.trim().slice(0, 128) : undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setReviews((prev) => [newReview, ...prev]);

    if (user && user.emailVerified) {
      try {
        await setDoc(doc(db, 'reviews', reviewId), {
          productId: newReview.productId,
          userId: user.uid,
          reviewerName: newReview.reviewerName,
          rating: newReview.rating,
          comment: newReview.comment,
          visible: true,
          ...(newReview.orderId ? { orderId: newReview.orderId } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, `reviews/${reviewId}`);
        } catch {
          // Local state preserved
        }
      }
    }

    showToast(`شكراً لتقييمك (${newReview.rating}/5 نجوم)!`);
  };

  const handleToggleReviewVisibility = async (reviewId: string, nextVisible: boolean) => {
    setReviews((prev) => toggleReviewVisibility(prev, reviewId, nextVisible));

    if (user && user.email === STORE_OWNER_EMAIL && user.emailVerified) {
      try {
        await updateDoc(doc(db, 'reviews', reviewId), {
          visible: nextVisible,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
        } catch {
          // Handled
        }
      }
    }

    showToast(nextVisible ? 'تم إظهار التعليق في المتجر' : 'تم إخفاء التعليق عن المتجر');
  };

  const handleDeleteReview = async (reviewId: string) => {
    setReviews((prev) => removeReviewById(prev, reviewId));

    if (user && user.email === STORE_OWNER_EMAIL && user.emailVerified) {
      try {
        await deleteDoc(doc(db, 'reviews', reviewId));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `reviews/${reviewId}`);
        } catch {
          // Handled
        }
      }
    }

    showToast('تم حذف التعليق نهائياً.');
  };

  const handleCreateOrder = async (input: CheckoutFormInput): Promise<Order> => {
    const { subtotal, discountTotal, totalAmount, itemsCount } = calculateCartTotals(cartItems);
    const itemsSummary = formatItemsSummary(cartItems);
    const orderNumber = generateOrderNumber(orders.length);
    const orderId = `ord-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const customerUid = user?.uid || `guest-${Date.now()}`;
    const fullShippingAddress = formatFullShippingAddress(
      input.governorate,
      input.shippingAddress
    );

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerId: customerUid,
      customerName: input.customerName.trim().slice(0, 100),
      customerEmail: input.customerEmail.trim().slice(0, 150),
      customerPhone: input.customerPhone.trim().slice(0, 25),
      shippingAddress: fullShippingAddress,
      itemsSummary,
      itemsCount,
      subtotal,
      discountTotal,
      totalAmount,
      status: 'قيد المراجعة',
      notes: input.notes.trim().slice(0, 500),
      emailSent: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const historyEntry = createCartHistoryEntry(newOrder, cartItems);
    setCartHistory((prev) => [historyEntry, ...prev]);
    setOrders((prev) => [newOrder, ...prev]);
    setCartItems([]);

    if (user && user.emailVerified) {
      try {
        await setDoc(doc(db, 'orders', orderId), {
          orderNumber: newOrder.orderNumber,
          customerId: user.uid,
          customerName: newOrder.customerName,
          customerEmail: newOrder.customerEmail,
          customerPhone: newOrder.customerPhone,
          shippingAddress: newOrder.shippingAddress,
          itemsSummary: newOrder.itemsSummary,
          itemsCount: newOrder.itemsCount,
          subtotal: newOrder.subtotal,
          discountTotal: newOrder.discountTotal,
          totalAmount: newOrder.totalAmount,
          status: 'قيد المراجعة',
          notes: newOrder.notes,
          emailSent: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
        } catch {
          // Keep local state resilient
        }
      }
    }

    showToast(`تم تسجيل طلبك رقم ${orderNumber} بنجاح!`);
    return newOrder;
  };

  const handleSaveProduct = async (input: ProductFormInput, existingId?: string) => {
    const validation = validateProductInput(input);
    if (!validation.valid) return;

    const prodId = existingId || `prod-${Date.now()}`;
    const authorId = user?.uid || 'starklabs-admin';

    const newProduct: Product = {
      id: prodId,
      title: input.title.trim().slice(0, 120),
      category: input.category,
      description: input.description.trim().slice(0, 1000),
      price: Number(input.price),
      discountPercent: Number(input.discountPercent),
      imageUrl: input.imageUrl.trim().slice(0, 500),
      postUrl: input.postUrl.trim().slice(0, 500),
      material: input.material.trim().slice(0, 60),
      printTimeHours: Number(input.printTimeHours),
      dimensions: input.dimensions.trim().slice(0, 60),
      colors: validation.colors,
      inStock: input.inStock,
      featured: input.featured,
      authorId,
    };

    setProducts((prev) => {
      const exists = prev.some((p) => p.id === prodId);
      if (exists) {
        return prev.map((p) => (p.id === prodId ? newProduct : p));
      }
      return [newProduct, ...prev];
    });

    if (user && user.email === STORE_OWNER_EMAIL && user.emailVerified) {
      try {
        if (existingId) {
          await updateDoc(doc(db, 'products', prodId), {
            title: newProduct.title,
            category: newProduct.category,
            description: newProduct.description,
            price: newProduct.price,
            discountPercent: newProduct.discountPercent,
            imageUrl: newProduct.imageUrl,
            postUrl: newProduct.postUrl,
            material: newProduct.material,
            printTimeHours: newProduct.printTimeHours,
            dimensions: newProduct.dimensions,
            colors: newProduct.colors,
            inStock: newProduct.inStock,
            featured: newProduct.featured,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'products', prodId), {
            title: newProduct.title,
            category: newProduct.category,
            description: newProduct.description,
            price: newProduct.price,
            discountPercent: newProduct.discountPercent,
            imageUrl: newProduct.imageUrl,
            postUrl: newProduct.postUrl,
            material: newProduct.material,
            printTimeHours: newProduct.printTimeHours,
            dimensions: newProduct.dimensions,
            colors: newProduct.colors,
            inStock: newProduct.inStock,
            featured: newProduct.featured,
            authorId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        try {
          handleFirestoreError(
            err,
            existingId ? OperationType.UPDATE : OperationType.CREATE,
            `products/${prodId}`
          );
        } catch {
          // Handled
        }
      }
    }

    showToast(existingId ? 'تم تحديث المنتج' : 'تمت إضافة المنتج الجديد');
  };

  const handleToggleProductFeatured = async (productId: string, nextFeatured: boolean) => {
    setProducts((prev) => toggleProductFeaturedState(prev, productId, nextFeatured));

    if (user && user.email === STORE_OWNER_EMAIL && user.emailVerified) {
      try {
        await updateDoc(doc(db, 'products', productId), {
          featured: nextFeatured,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
        } catch {
          // Handled
        }
      }
    }

    showToast(
      nextFeatured
        ? 'تم تحديد المنتج ضمن العناصر المميزة في العرض الرئيسي'
        : 'تمت إزالة المنتج من العرض المميز'
    );
  };

  const handleDeleteProduct = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    if (user && user.email === STORE_OWNER_EMAIL && user.emailVerified) {
      try {
        await deleteDoc(doc(db, 'products', productId));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
        } catch {
          // Handled
        }
      }
    }
    showToast('تم حذف المنتج.');
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? { ...ord, status: newStatus, updatedAt: new Date().toISOString() }
          : ord
      )
    );

    if (user && user.email === STORE_OWNER_EMAIL && user.emailVerified) {
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status: newStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
        } catch {
          // Handled
        }
      }
    }
    showToast(`حالة الطلب: ${newStatus}`);
  };

  const handleConfirmSendGmail = async (order: Order) => {
    if (!accessToken) {
      setEmailError('يرجى ربط حساب Google أولاً لإرسال الإيميل عبر Gmail.');
      return;
    }
    setIsSendingEmail(true);
    setEmailError(null);
    try {
      await sendOrderConfirmationViaGmail(order, accessToken);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, emailSent: true } : o))
      );

      if (user && user.emailVerified) {
        try {
          await updateDoc(doc(db, 'orders', order.id), {
            emailSent: true,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Local state updated
        }
      }

      setOrderPendingEmail(null);
      showToast(`تم إرسال إيميل التأكيد للطرفين بنجاح!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر إرسال البريد الإلكتروني.';
      setEmailError(msg);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const filteredProducts = filterProductsByCategoryAndSearch(
    products,
    selectedCategory,
    productSearchQuery,
    {
      sortBy: catalogSortBy,
      onlyDiscounted,
      onlyFeatured,
      reviews,
    }
  );

  const categoryCounts = getCategoryProductCounts(products, productSearchQuery, {
    onlyDiscounted,
    onlyFeatured,
  });

  const hasActiveFilters =
    selectedCategory !== 'الكل' ||
    productSearchQuery.trim().length > 0 ||
    catalogSortBy !== 'featured' ||
    onlyDiscounted ||
    onlyFeatured;

  const resetAllFilters = () => {
    setSelectedCategory('الكل');
    setProductSearchQuery('');
    setCatalogSortBy('featured');
    setOnlyDiscounted(false);
    setOnlyFeatured(false);
  };

  const featuredProducts = getFeaturedShowcaseProducts(products);
  const totalCartItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // =========================================================================
  // STANDALONE EXTERNAL ADMIN & ORDERS PORTAL (/admin or ?portal=admin)
  // =========================================================================
  if (isAdminPortal) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-zinc-950 text-zinc-100">
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 left-4 right-4 sm:right-auto sm:left-5 z-50 bg-zinc-900 border border-amber-500/50 text-zinc-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="break-words">{toastMessage}</span>
          </div>
        )}

        <AdminDashboard
          products={products}
          orders={orders}
          reviews={reviews}
          user={user}
          isLoggingIn={isLoggingIn}
          onGoogleLogin={handleGoogleLogin}
          onLogout={handleLogout}
          onSaveProduct={handleSaveProduct}
          onToggleProductFeatured={handleToggleProductFeatured}
          onDeleteProduct={handleDeleteProduct}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onToggleReviewVisibility={handleToggleReviewVisibility}
          onDeleteReview={handleDeleteReview}
          onRequestGmailConfirmation={(ord) => {
            setEmailError(null);
            setOrderPendingEmail(ord);
          }}
        />

        <GmailConfirmModal
          order={orderPendingEmail}
          hasAccessToken={Boolean(accessToken)}
          isSending={isSendingEmail}
          error={emailError}
          onConfirmSend={handleConfirmSendGmail}
          onCancel={() => setOrderPendingEmail(null)}
          onConnectGoogle={handleGoogleLogin}
        />
      </div>
    );
  }

  // =========================================================================
  // PUBLIC CUSTOMER STOREFRONT (/) — 100% SEPARATED FROM ADMIN & ORDERS
  // =========================================================================
  return (
    <div id="top" className="min-h-screen w-full max-w-full overflow-x-hidden bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navigation (Custom StarkLaBs Emblem Logo + Clean View Switcher + Mobile PWA Install) */}
      <Navbar
        activeView={activeView}
        onChangeView={setActiveView}
      />

      {/* Offline Status Banner */}
      <OfflineIndicator />

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 left-4 right-4 sm:right-auto sm:left-6 z-50 bg-zinc-900 border border-amber-500/50 text-zinc-100 px-3.5 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-medium"
        >
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="break-words">{toastMessage}</span>
        </div>
      )}

      {/* Sleek, Compact Floating Cart Button */}
      <button
        type="button"
        onClick={() => {
          setCartInitialTab(totalCartItems > 0 ? 'items' : cartHistory.length > 0 ? 'history' : 'items');
          setIsCartOpen(true);
        }}
        aria-label={`سلة المشتريات (${totalCartItems} منتجات)`}
        className="fixed bottom-4 left-4 sm:left-6 z-40 h-10 px-3 bg-zinc-900/95 hover:bg-zinc-900 text-zinc-100 border border-amber-500/60 rounded-full shadow-xl backdrop-blur-md flex items-center gap-2 transition-transform duration-150 hover:scale-105 cursor-pointer"
      >
        <div className="w-6 h-6 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        <span className="text-xs font-extrabold whitespace-nowrap">السلة</span>
        <span className="px-1.5 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-amber-400 text-[11px] font-mono-tabular font-extrabold leading-none">
          {totalCartItems}
        </span>
      </button>

      {/* Main Content Router (Home vs Products Only) */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {activeView === 'products' ? (
          /* Dedicated Products Page with Sleek, Compact Search & Horizontal Category Filter Bar */
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5">
            {/* Compact & Sleek Search + Filter Header */}
            <div className="space-y-3">
              {/* Row 1: Compact Title + Live Count Badge */}
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg sm:text-2xl font-extrabold text-zinc-100">
                  المنتجات والكتالوج
                </h1>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-zinc-300 shrink-0">
                  <span>المعروض:</span>
                  <span className="text-amber-400 font-mono-tabular">
                    {filteredProducts.length} / {products.length}
                  </span>
                </div>
              </div>

              {/* Row 2: Unified Glassmorphic Search Pill Bar + Compact Sort Pill */}
              <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800/90 focus-within:border-amber-500/80 rounded-2xl p-1.5 shadow-lg transition-colors">
                <div className="relative flex-1 min-w-0 flex items-center">
                  <Search
                    className="w-4 h-4 text-amber-400 mr-3 ml-2 shrink-0 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    role="searchbox"
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، الوصف، القسم أو اللون..."
                    aria-label="ابحث باسم المنتج أو الوصف"
                    className="w-full py-2 pl-7 bg-transparent text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                  />
                  {productSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setProductSearchQuery('')}
                      aria-label="مسح نص البحث"
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-100 rounded-full bg-zinc-800/80 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Integrated Compact Sort Selector inside the Search Pill */}
                <div className="relative shrink-0 border-r border-zinc-800 pr-2">
                  <ArrowUpDown
                    className="w-3.5 h-3.5 text-amber-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <select
                    value={catalogSortBy}
                    onChange={(e) => setCatalogSortBy(e.target.value as CatalogSortOption)}
                    aria-label="ترتيب المنتجات"
                    className="pr-7 pl-2.5 py-2 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl text-[11px] sm:text-xs font-bold text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="featured">الأحدث والمميز</option>
                    <option value="price-asc">الأقل سعراً</option>
                    <option value="price-desc">الأعلى سعراً</option>
                    <option value="rating-desc">الأعلى تقييماً</option>
                    <option value="discount-desc">الأقوى خصماً</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Single-Line Horizontal Touch-Scrollable Filter Pills (No Multi-Row Wrapping!) */}
              <div
                className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="تصفية المنتجات حسب القسم"
              >
                {['الكل', ...PRODUCT_CATEGORIES].map((cat) => {
                  const isActive = selectedCategory === cat;
                  const countForCat = categoryCounts[cat] ?? 0;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSelectedCategory(cat)}
                      className={`h-9 px-3.5 text-xs font-bold rounded-full border transition-all inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-zinc-100'
                      }`}
                    >
                      <span>{cat}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono-tabular leading-none ${
                          isActive
                            ? 'bg-zinc-950/20 text-zinc-950 font-extrabold'
                            : 'bg-zinc-950 text-zinc-400'
                        }`}
                      >
                        {countForCat}
                      </span>
                    </button>
                  );
                })}

                {/* Quick Filter Chips in the same sleek horizontal strip */}
                <button
                  type="button"
                  onClick={() => setOnlyDiscounted((prev) => !prev)}
                  aria-pressed={onlyDiscounted}
                  className={`h-9 px-3.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    onlyDiscounted
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                      : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:text-zinc-100'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>عروض وخصومات</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOnlyFeatured((prev) => !prev)}
                  aria-pressed={onlyFeatured}
                  className={`h-9 px-3.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    onlyFeatured
                      ? 'bg-amber-500/25 text-amber-300 border-amber-500/60'
                      : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:text-zinc-100'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>المميزة فقط</span>
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="h-9 px-3.5 rounded-full text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-amber-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>إعادة ضبط</span>
                  </button>
                )}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-10 text-center space-y-3">
                <p className="text-sm sm:text-base font-bold text-zinc-200">
                  لا توجد منتجات مطابقة لخيارات البحث أو الفلترة الحالية
                </p>
                <p className="text-xs text-zinc-400">
                  جرّب البحث بكلمات أخرى من اسم المنتج أو الوصف أو اللون، أو قم بإعادة ضبط الفلاتر.
                </p>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  عرض كل المنتجات
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {filteredProducts.map((product) => {
                  const ratingSummary = calculateProductRatingSummary(reviews, product.id);
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      averageRating={ratingSummary.averageRating}
                      ratingsCount={ratingSummary.ratingsCount}
                      onSelectProduct={openProductModal}
                      onAddToCart={handleAddToCart}
                    />
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* Organized Home View with Custom StarkLaBs Logo & Clean Showcase (No Clutter Buttons) */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10">
            {/* Hero Section — Custom StarkLaBs Emblem Logo + Organized Architectural Layout */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 border border-zinc-800/90 rounded-2xl p-5 sm:p-8 shadow-2xl">
              <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-right space-y-4 min-w-0">
                {/* Custom Website Logo + Brand Name */}
                <StarkLabsLogo size="hero" />

                <div className="space-y-2 max-w-xl">
                  <p className="text-xs sm:text-sm font-extrabold text-amber-400 tracking-wide">
                    معمل الطباعة ثلاثية الأبعاد والنماذج الهندسية
                  </p>
                  <p
                    className="text-base sm:text-xl font-bold text-zinc-200 leading-relaxed"
                    style={{ textWrap: 'balance' }}
                  >
                    مجسمات ومنتجات 3D بدقة عالية وألوان حسب اختيارك
                  </p>
                </div>
              </div>

              <div className="lg:col-span-6 w-full min-w-0">
                <div className="aspect-16/9 w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-lg">
                  <img
                    src={HERO_IMAGE_PATH}
                    alt="معمل StarkLaBs للطباعة ثلاثية الأبعاد"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover block"
                  />
                </div>
              </div>
            </section>

            {/* Single-Card Auto-Advancing & Manually Swipeable Featured Showcase */}
            <FeaturedProductCarousel
              featuredProducts={featuredProducts}
              totalCatalogCount={products.length}
              reviews={reviews}
              onSelectProduct={openProductModal}
              onAddToCart={handleAddToCart}
              onViewAllProducts={() => setActiveView('products')}
            />
          </div>
        )}
      </main>

      {/* Quiet Customer Footer with Custom StarkLaBs Logo */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2.5">
            <StarkLabsLogo size="sm" />
            <span>·</span>
            <span>طباعة ثلاثية الأبعاد</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              الرئيسية
            </button>
            <button
              type="button"
              onClick={() => setActiveView('products')}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              المنتجات
            </button>
            <a
              href="https://www.facebook.com/StarkLaBs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-300 transition-colors"
            >
              بيدج StarkLaBs
            </a>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ProductDetailModal
        product={activeProductModal?.product || null}
        initialColor={activeProductModal?.initialColor || ''}
        reviews={reviews}
        cartHistory={cartHistory}
        onClose={closeProductModal}
        onAddToCart={handleAddToCart}
        onOpenCartHistory={() => {
          setCartInitialTab('history');
          setIsCartOpen(true);
        }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        initialTab={cartInitialTab}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        cartHistory={cartHistory}
        reviews={reviews}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onSubmitOrder={handleCreateOrder}
        onAddVerifiedReview={handleAddReview}
        onRequestGmailConfirmation={(ord) => {
          setEmailError(null);
          setOrderPendingEmail(ord);
        }}
      />

      <GmailConfirmModal
        order={orderPendingEmail}
        hasAccessToken={Boolean(accessToken)}
        isSending={isSendingEmail}
        error={emailError}
        onConfirmSend={handleConfirmSendGmail}
        onCancel={() => setOrderPendingEmail(null)}
        onConnectGoogle={handleGoogleLogin}
      />
    </div>
  );
}
