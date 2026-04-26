import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  OnlinePaymentValidation,
  StoreSaleCreatePayload,
  StoreSaleRecord
} from "@/types/admin-ops";
import { Product, Purchase, PurchaseStatus } from "@/types/catalog";
import { toErrorMessage } from "@/lib/errors";
import { formatDateTime, formatPrice, purchaseStatusLabel } from "@/lib/formatters";

import styles from "./admin.module.css";

interface SalesManagerProps {
  products: Product[];
  purchases: Purchase[];
  storeSales: StoreSaleRecord[];
  onlineValidations: OnlinePaymentValidation[];
  onRegisterStoreSale: (sale: StoreSaleCreatePayload) => Promise<StoreSaleRecord>;
  onUpsertOnlineValidation: (
    validation: OnlinePaymentValidation
  ) => Promise<OnlinePaymentValidation>;
  onUpdatePurchaseStatus: (purchaseId: string, status: PurchaseStatus) => Promise<void>;
}

interface StoreSaleFormState {
  productId: string;
  quantity: number;
  unitPrice: number;
  paidAmount: number;
}

const initialSaleForm: StoreSaleFormState = {
  productId: "",
  quantity: 1,
  unitPrice: 0,
  paidAmount: 0
};

export function SalesManager({
  products,
  purchases,
  storeSales,
  onlineValidations,
  onRegisterStoreSale,
  onUpsertOnlineValidation,
  onUpdatePurchaseStatus
}: SalesManagerProps) {
  const [storeSaleForm, setStoreSaleForm] = useState<StoreSaleFormState>(initialSaleForm);
  const [onlinePaidDrafts, setOnlinePaidDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmittingStoreSale, setIsSubmittingStoreSale] = useState(false);

  const orderedProducts = useMemo(
    () => [...products].sort((left, right) => left.name.localeCompare(right.name)),
    [products]
  );

  const selectedProduct = useMemo(
    () =>
      orderedProducts.find((product) => product.id === storeSaleForm.productId) ?? null,
    [orderedProducts, storeSaleForm.productId]
  );

  const onlineValidationByPurchaseId = useMemo(() => {
    const map = new Map<string, OnlinePaymentValidation>();
    for (const validation of onlineValidations) {
      map.set(validation.purchaseId, validation);
    }
    return map;
  }, [onlineValidations]);

  const storeRevenueValidated = useMemo(
    () =>
      storeSales.reduce(
        (sum, sale) => sum + (sale.validated ? sale.paidAmount : 0),
        0
      ),
    [storeSales]
  );

  const onlineRevenueValidated = useMemo(
    () =>
      purchases.reduce((sum, purchase) => {
        if (purchase.status === "cancelled") {
          return sum;
        }
        const validation = onlineValidationByPurchaseId.get(purchase.id);
        if (!validation || !validation.validated) {
          return sum;
        }
        return sum + validation.paidAmount;
      }, 0),
    [purchases, onlineValidationByPurchaseId]
  );

  const pendingValidationAmount = useMemo(() => {
    const pendingOnline = purchases.reduce((sum, purchase) => {
      if (purchase.status === "cancelled") {
        return sum;
      }
      const validation = onlineValidationByPurchaseId.get(purchase.id);
      if (validation?.validated) {
        return sum;
      }
      return sum + purchase.total;
    }, 0);

    const pendingStore = storeSales.reduce(
      (sum, sale) => sum + (sale.validated ? 0 : sale.expectedTotal),
      0
    );

    return pendingOnline + pendingStore;
  }, [purchases, storeSales, onlineValidationByPurchaseId]);

  const totalValidatedRevenue = storeRevenueValidated + onlineRevenueValidated;

  useEffect(() => {
    if (orderedProducts.length === 0) {
      return;
    }

    setStoreSaleForm((previous) => {
      if (previous.productId) {
        return previous;
      }

      return {
        ...previous,
        productId: orderedProducts[0].id,
        unitPrice: orderedProducts[0].price
      };
    });
  }, [orderedProducts]);

  const initializeFormFromProduct = (productId: string) => {
    const product = orderedProducts.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    setStoreSaleForm((previous) => ({
      ...previous,
      productId,
      quantity: 1,
      unitPrice: product.price
    }));
  };

  const handleSubmitStoreSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!selectedProduct) {
      setError("Selecciona un producto para registrar la venta.");
      return;
    }

    if (storeSaleForm.quantity <= 0) {
      setError("La cantidad debe ser mayor que 0.");
      return;
    }

    if (storeSaleForm.quantity > selectedProduct.stock) {
      setError("No hay inventario suficiente para registrar esta venta.");
      return;
    }

    if (storeSaleForm.unitPrice <= 0) {
      setError("El valor unitario debe ser mayor que 0.");
      return;
    }

    if (storeSaleForm.paidAmount < 0) {
      setError("El monto pagado no puede ser negativo.");
      return;
    }

    setIsSubmittingStoreSale(true);
    try {
      const createdSale = await onRegisterStoreSale({
        productId: selectedProduct.id,
        quantity: storeSaleForm.quantity,
        unitPrice: storeSaleForm.unitPrice,
        paidAmount: storeSaleForm.paidAmount,
      });

      setStoreSaleForm({
        productId: selectedProduct.id,
        quantity: 1,
        unitPrice: selectedProduct.price,
        paidAmount: 0
      });

      setNotice(
        createdSale.validated
          ? "Venta en tienda validada y sumada a ganancias."
          : "Venta registrada como pendiente de validacion."
      );
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, "No se pudo registrar la venta en tienda."));
    } finally {
      setIsSubmittingStoreSale(false);
    }
  };

  const handleUpdateOnlineValidation = async (purchase: Purchase) => {
    setError(null);
    setNotice(null);

    const typedValue = onlinePaidDrafts[purchase.id];
    const amountValue =
      typedValue !== undefined && typedValue.trim() !== ""
        ? Number(typedValue)
        : purchase.total;

    if (!Number.isFinite(amountValue) || amountValue < 0) {
      setError("Ingresa un monto pagado valido para la venta online.");
      return;
    }

    const validated = purchase.status !== "cancelled" && amountValue >= purchase.total;

    try {
      const persisted = await onUpsertOnlineValidation({
        purchaseId: purchase.id,
        paidAmount: amountValue,
        validated,
        validatedAt: new Date().toISOString()
      });

      setNotice(
        persisted.validated
          ? "Pago online validado y agregado a ganancias."
          : "Pago online registrado como pendiente o insuficiente."
      );
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, "No se pudo validar el pago online."));
    }
  };

  const handleStatusChange = (purchaseId: string, status: PurchaseStatus) => {
    setError(null);
    setNotice(null);
    void onUpdatePurchaseStatus(purchaseId, status).catch((caughtError) => {
      setError(toErrorMessage(caughtError, "No se pudo actualizar el estado de la venta."));
    });
  };

  return (
    <div className={styles.panelStack}>
      <section className={styles.kpiStrip}>
        <article>
          <h3>Ganancias validadas</h3>
          <p>{formatPrice(totalValidatedRevenue)}</p>
        </article>
        <article>
          <h3>Ventas tienda validadas</h3>
          <p>{formatPrice(storeRevenueValidated)}</p>
        </article>
        <article>
          <h3>Ventas online validadas</h3>
          <p>{formatPrice(onlineRevenueValidated)}</p>
        </article>
        <article>
          <h3>Pendiente por validar</h3>
          <p>{formatPrice(pendingValidationAmount)}</p>
        </article>
      </section>

      <section className={styles.formCard}>
        <h2>Registrar venta en tienda</h2>
        <form className={styles.formGrid} onSubmit={(event) => void handleSubmitStoreSale(event)}>
          <label>
            Producto
            <select
              onChange={(event) => initializeFormFromProduct(event.target.value)}
              required
              value={storeSaleForm.productId}
            >
              <option value="" disabled>
                Selecciona producto
              </option>
              {orderedProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.stock} u.)
                </option>
              ))}
            </select>
          </label>
          <label>
            Cantidad
            <input
              min={1}
              onChange={(event) =>
                setStoreSaleForm((previous) => ({
                  ...previous,
                  quantity: Number(event.target.value)
                }))
              }
              required
              type="number"
              value={storeSaleForm.quantity}
            />
          </label>
          <label>
            Valor unitario
            <input
              min={0}
              onChange={(event) =>
                setStoreSaleForm((previous) => ({
                  ...previous,
                  unitPrice: Number(event.target.value)
                }))
              }
              required
              type="number"
              value={storeSaleForm.unitPrice}
            />
          </label>
          <label>
            Monto pagado
            <input
              min={0}
              onChange={(event) =>
                setStoreSaleForm((previous) => ({
                  ...previous,
                  paidAmount: Number(event.target.value)
                }))
              }
              required
              type="number"
              value={storeSaleForm.paidAmount}
            />
          </label>
          <div className={styles.saleFormula}>
            <span>Total esperado</span>
            <strong>
              {formatPrice(
                storeSaleForm.quantity > 0 && storeSaleForm.unitPrice > 0
                  ? storeSaleForm.quantity * storeSaleForm.unitPrice
                  : 0
              )}
            </strong>
          </div>
          <button className={styles.primaryButton} disabled={isSubmittingStoreSale} type="submit">
            {isSubmittingStoreSale ? "Guardando venta..." : "Registrar venta"}
          </button>
        </form>
      </section>

      <section className={styles.listCard}>
        <h2>Ventas en tienda registradas</h2>
        {storeSales.length === 0 ? (
          <p className={styles.emptyLabel}>Todavia no hay ventas en tienda registradas.</p>
        ) : (
          <div className={styles.salesList}>
            {[...storeSales]
              .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1))
              .map((sale) => (
                <article className={styles.saleCard} key={sale.id}>
                  <div>
                    <h3>{sale.productName}</h3>
                    <p>{formatDateTime(sale.createdAt)}</p>
                  </div>
                  <div>
                    <span>Cantidad</span>
                    <strong>{sale.quantity}</strong>
                  </div>
                  <div>
                    <span>Total esperado</span>
                    <strong>{formatPrice(sale.expectedTotal)}</strong>
                  </div>
                  <div>
                    <span>Monto pagado</span>
                    <strong>{formatPrice(sale.paidAmount)}</strong>
                  </div>
                  <span
                    className={
                      sale.validated ? styles.validationBadgeOk : styles.validationBadgePending
                    }
                  >
                    {sale.validated ? "Validada" : "Pendiente"}
                  </span>
                </article>
              ))}
          </div>
        )}
      </section>

      <section className={styles.listCard}>
        <h2>Ventas online y validacion de pago</h2>
        {purchases.length === 0 ? (
          <p className={styles.emptyLabel}>No hay ventas online registradas.</p>
        ) : (
          <div className={styles.purchasesTableWrap}>
            <table className={styles.purchasesTable}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Total esperado</th>
                  <th>Monto pagado</th>
                  <th>Validacion</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => {
                  const validation = onlineValidationByPurchaseId.get(purchase.id);
                  const isCancelled = purchase.status === "cancelled";
                  const paidDraft =
                    onlinePaidDrafts[purchase.id] ??
                    (validation ? String(validation.paidAmount) : "");

                  return (
                    <tr key={purchase.id}>
                      <td>{formatDateTime(purchase.createdAt)}</td>
                      <td>
                        <span>{purchase.customerName}</span>
                        <span>{purchase.customerEmail}</span>
                      </td>
                      <td>{formatPrice(purchase.total)}</td>
                      <td>
                        <div className={styles.onlineValidationInput}>
                          <input
                            disabled={isCancelled}
                            min={0}
                            onChange={(event) =>
                              setOnlinePaidDrafts((previous) => ({
                                ...previous,
                                [purchase.id]: event.target.value
                              }))
                            }
                            placeholder={String(purchase.total)}
                            type="number"
                            value={paidDraft}
                          />
                          <button
                            className={styles.secondaryButton}
                            disabled={isCancelled}
                            onClick={() => void handleUpdateOnlineValidation(purchase)}
                            type="button"
                          >
                            Validar
                          </button>
                        </div>
                      </td>
                      <td>
                        <span
                          className={
                            isCancelled
                              ? styles.validationBadgeCancelled
                              : validation?.validated
                              ? styles.validationBadgeOk
                              : styles.validationBadgePending
                          }
                        >
                          {isCancelled ? "Cancelada" : validation?.validated ? "Validada" : "Pendiente"}
                        </span>
                      </td>
                      <td>
                        <select
                          onChange={(event) =>
                            handleStatusChange(purchase.id, event.target.value as PurchaseStatus)
                          }
                          value={purchase.status}
                        >
                          <option value="pending">{purchaseStatusLabel("pending")}</option>
                          <option value="paid">{purchaseStatusLabel("paid")}</option>
                          <option value="shipping">{purchaseStatusLabel("shipping")}</option>
                          <option value="cancelled">{purchaseStatusLabel("cancelled")}</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error ? <p className={styles.inlineError}>{error}</p> : null}
      {notice ? <p className={styles.inlineNotice}>{notice}</p> : null}
    </div>
  );
}
