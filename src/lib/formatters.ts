import { ProductCategory, PurchaseStatus } from "@/types/catalog";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function formatPrice(value: number): string {
  return currencyFormatter.format(value);
}

export function formatDateTime(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function categoryLabel(category: ProductCategory, customLabel?: string | null): string {
  if (customLabel && customLabel.trim()) {
    return customLabel.trim();
  }

  const labels: Record<ProductCategory, string> = {
    proteina: "Proteina",
    creatina: "Creatina",
    preworkout: "Pre-Workout",
    vitaminas: "Vitaminas",
    quemador: "Quemador"
  };

  return labels[category];
}

export function purchaseStatusLabel(status: PurchaseStatus): string {
  const labels: Record<PurchaseStatus, string> = {
    pending: "Pendiente",
    paid: "Pagada",
    shipping: "En envio",
    cancelled: "Cancelada"
  };

  return labels[status];
}
