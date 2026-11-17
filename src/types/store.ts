export type ProductCategory =
  | 'مجسمات وخوذ'
  | 'إضاءة وديكور'
  | 'إكسسوارات مكتبية'
  | 'قطع هندسية مخصصة';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'مجسمات وخوذ',
  'إضاءة وديكور',
  'إكسسوارات مكتبية',
  'قطع هندسية مخصصة',
];

export type OrderStatus =
  | 'قيد المراجعة'
  | 'جاري الطباعة 3D'
  | 'تم الشحن'
  | 'مكتمل'
  | 'ملغي';

export const ORDER_STATUSES: OrderStatus[] = [
  'قيد المراجعة',
  'جاري الطباعة 3D',
  'تم الشحن',
  'مكتمل',
  'ملغي',
];

// Blueprint-synced volumetric & pattern constants
export const BLUEPRINT_LIMITS = {
  ID_MAX_LEN: 128,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  PRODUCT_TITLE_MIN: 2,
  PRODUCT_TITLE_MAX: 120,
  PRODUCT_DESC_MIN: 5,
  PRODUCT_DESC_MAX: 1000,
  PRODUCT_IMAGE_MAX: 500,
  PRODUCT_POST_URL_MAX: 500,
  PRODUCT_MATERIAL_MIN: 2,
  PRODUCT_MATERIAL_MAX: 60,
  PRODUCT_DIMENSIONS_MIN: 2,
  PRODUCT_DIMENSIONS_MAX: 60,
  PRODUCT_COLORS_MAX: 8,
  COLOR_NAME_MAX: 40,
  ORDER_NUMBER_MAX: 32,
  CUSTOMER_NAME_MIN: 2,
  CUSTOMER_NAME_MAX: 100,
  CUSTOMER_EMAIL_MIN: 5,
  CUSTOMER_EMAIL_MAX: 150,
  CUSTOMER_PHONE_MIN: 8,
  CUSTOMER_PHONE_MAX: 25,
  SHIPPING_ADDRESS_MIN: 5,
  SHIPPING_ADDRESS_MAX: 300,
  ITEMS_SUMMARY_MAX: 1500,
  NOTES_MAX: 500,
  REVIEWER_NAME_MIN: 2,
  REVIEWER_NAME_MAX: 80,
  REVIEW_COMMENT_MIN: 2,
  REVIEW_COMMENT_MAX: 500,
  REVIEW_RATING_MIN: 1,
  REVIEW_RATING_MAX: 5,
} as const;

export interface Product {
  id: string;
  title: string;
  category: ProductCategory;
  description: string;
  price: number;
  discountPercent: number;
  imageUrl: string;
  postUrl: string;
  material: string;
  printTimeHours: number;
  dimensions: string;
  colors: string[];
  inStock: boolean;
  featured: boolean;
  authorId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  visible?: boolean;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewFormInput {
  productId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  orderId?: string;
}

export interface ProductRatingSummary {
  averageRating: number;
  ratingsCount: number;
  productReviews: ProductReview[];
}

export interface CartItem {
  product: Product;
  selectedColor: string;
  quantity: number;
}

export interface PurchasedProductItem {
  productId: string;
  title: string;
  imageUrl: string;
  selectedColor: string;
  quantity: number;
  unitPrice: number;
}

export interface CartHistoryEntry {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  items: PurchasedProductItem[];
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  itemsSummary: string;
  itemsCount: number;
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  status: OrderStatus;
  notes: string;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export const EGYPT_GOVERNORATES: string[] = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الدقهلية',
  'الشرقية',
  'الغربية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'مطروح',
  'شمال سيناء',
  'جنوب سيناء',
  'الوادي الجديد',
];

export interface CheckoutFormInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  governorate?: string;
  shippingAddress: string;
  notes: string;
}

export interface ProductFormInput {
  title: string;
  category: ProductCategory;
  description: string;
  price: number;
  discountPercent: number;
  imageUrl: string;
  postUrl: string;
  material: string;
  printTimeHours: number;
  dimensions: string;
  colorsText: string;
  inStock: boolean;
  featured: boolean;
}
