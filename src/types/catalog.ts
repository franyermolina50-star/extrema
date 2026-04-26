export type ProductCategory =
  | "proteina"
  | "creatina"
  | "preworkout"
  | "vitaminas"
  | "quemador";

export type ProductBadge = "new" | "hot" | "sale";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  customCategoryLabel?: string | null;
  description: string;
  price: number;
  oldPrice?: number;
  imageUrl: string;
  badge?: ProductBadge;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VideoContent {
  id: string;
  title: string;
  subtitle: string;
  videoUrl: string;
  coverUrl: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = "transferencia" | "credito" | "pse";
export type PurchaseStatus = "pending" | "paid" | "shipping" | "cancelled";

export interface PurchaseItem {
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Purchase {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  status: PurchaseStatus;
  items: PurchaseItem[];
  total: number;
  createdAt: string;
}

export interface CatalogState {
  products: Product[];
  videos: VideoContent[];
  purchases: Purchase[];
}

export interface CheckoutPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}
