export interface StoreSaleRecord {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  expectedTotal: number;
  paidAmount: number;
  validated: boolean;
  createdAt: string;
}

export interface StoreSaleCreatePayload {
  productId: string;
  quantity: number;
  unitPrice: number;
  paidAmount: number;
}

export interface OnlinePaymentValidation {
  purchaseId: string;
  paidAmount: number;
  validated: boolean;
  validatedAt: string;
}

export interface AdminOpsState {
  storeSales: StoreSaleRecord[];
  onlineValidations: OnlinePaymentValidation[];
}
