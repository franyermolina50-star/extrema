"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  createAdminStoreSale,
  getAdminOpsState,
  upsertAdminOnlineValidation
} from "@/lib/backend-api";
import { clearAdminSession, isAdminAuthenticated } from "@/lib/admin-auth";
import { toErrorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/formatters";
import { useCatalog } from "@/hooks/use-catalog";
import {
  AdminOpsState,
  OnlinePaymentValidation,
  StoreSaleCreatePayload,
  StoreSaleRecord
} from "@/types/admin-ops";

import styles from "./admin.module.css";
import { DashboardOverview } from "./dashboard-overview";
import { ProductManager } from "./product-manager";
import { SalesManager } from "./sales-manager";
import { VideoManager } from "./video-manager";

type AdminTab = "overview" | "inventory" | "sales" | "videos";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Resumen" },
  { id: "inventory", label: "Inventario" },
  { id: "sales", label: "Ventas" },
  { id: "videos", label: "Videos" }
];

const initialAdminOpsState: AdminOpsState = {
  storeSales: [],
  onlineValidations: []
};

export function AdminDashboard() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [opsReady, setOpsReady] = useState(false);
  const [adminOpsState, setAdminOpsState] = useState<AdminOpsState>(initialAdminOpsState);

  const {
    ready,
    state,
    loading,
    lastError,
    addProduct,
    updateProduct,
    addVideo,
    updateVideo,
    removeVideo,
    updatePurchaseStatus,
    reloadAdminData
  } = useCatalog();

  useEffect(() => {
    let active = true;

    const bootDashboard = async () => {
      const authenticated = await isAdminAuthenticated();
      if (!authenticated) {
        router.replace("/admin/login");
        return;
      }

      try {
        const [, opsState] = await Promise.all([reloadAdminData(), getAdminOpsState()]);
        if (!active) {
          return;
        }
        setAdminOpsState(opsState);
        setSessionError(null);
      } catch (error) {
        if (!active) {
          return;
        }
        setSessionError(toErrorMessage(error, "No se pudieron cargar los datos administrativos."));
      } finally {
        if (active) {
          setOpsReady(true);
          setIsCheckingSession(false);
        }
      }
    };

    void bootDashboard();
    return () => {
      active = false;
    };
  }, [reloadAdminData, router]);

  const onlineValidationByPurchaseId = useMemo(() => {
    const map = new Map<string, OnlinePaymentValidation>();
    for (const validation of adminOpsState.onlineValidations) {
      map.set(validation.purchaseId, validation);
    }
    return map;
  }, [adminOpsState.onlineValidations]);

  const totalInventoryUnits = useMemo(
    () => state.products.reduce((sum, product) => sum + product.stock, 0),
    [state.products]
  );

  const activeProducts = useMemo(
    () => state.products.filter((product) => product.active).length,
    [state.products]
  );

  const lowStockProducts = useMemo(
    () => state.products.filter((product) => product.stock > 0 && product.stock <= 5).length,
    [state.products]
  );

  const outOfStockProducts = useMemo(
    () => state.products.filter((product) => product.stock === 0).length,
    [state.products]
  );

  const activeVideos = useMemo(
    () => state.videos.filter((video) => video.active).length,
    [state.videos]
  );

  const storeValidatedSales = useMemo(
    () => adminOpsState.storeSales.filter((sale) => sale.validated).length,
    [adminOpsState.storeSales]
  );

  const storePendingSales = useMemo(
    () => adminOpsState.storeSales.length - storeValidatedSales,
    [adminOpsState.storeSales, storeValidatedSales]
  );

  const pendingOnlinePurchases = useMemo(
    () =>
      state.purchases.filter((purchase) => {
        if (purchase.status === "cancelled") {
          return false;
        }
        return !onlineValidationByPurchaseId.get(purchase.id)?.validated;
      }).length,
    [state.purchases, onlineValidationByPurchaseId]
  );

  const storeValidatedRevenue = useMemo(
    () =>
      adminOpsState.storeSales.reduce(
        (sum, sale) => sum + (sale.validated ? sale.paidAmount : 0),
        0
      ),
    [adminOpsState.storeSales]
  );

  const onlineValidatedRevenue = useMemo(
    () =>
      state.purchases.reduce((sum, purchase) => {
        if (purchase.status === "cancelled") {
          return sum;
        }
        const validation = onlineValidationByPurchaseId.get(purchase.id);
        if (!validation || !validation.validated) {
          return sum;
        }
        return sum + validation.paidAmount;
      }, 0),
    [state.purchases, onlineValidationByPurchaseId]
  );

  const onlineSalesValidated = useMemo(
    () =>
      state.purchases.filter(
        (purchase) =>
          purchase.status !== "cancelled" &&
          onlineValidationByPurchaseId.get(purchase.id)?.validated
      ).length,
    [state.purchases, onlineValidationByPurchaseId]
  );

  const pendingValidationAmount = useMemo(() => {
    const pendingOnline = state.purchases.reduce((sum, purchase) => {
      if (purchase.status === "cancelled") {
        return sum;
      }
      const validation = onlineValidationByPurchaseId.get(purchase.id);
      if (validation?.validated) {
        return sum;
      }
      return sum + purchase.total;
    }, 0);

    const pendingStore = adminOpsState.storeSales.reduce(
      (sum, sale) => sum + (sale.validated ? 0 : sale.expectedTotal),
      0
    );

    return pendingOnline + pendingStore;
  }, [state.purchases, adminOpsState.storeSales, onlineValidationByPurchaseId]);

  const totalValidatedRevenue = storeValidatedRevenue + onlineValidatedRevenue;

  const registerStoreSale = async (salePayload: StoreSaleCreatePayload): Promise<StoreSaleRecord> => {
    const createdSale = await createAdminStoreSale(salePayload);
    setAdminOpsState((previous) => ({
      ...previous,
      storeSales: [createdSale, ...previous.storeSales]
    }));
    await reloadAdminData();
    return createdSale;
  };

  const upsertOnlineValidation = async (
    validation: OnlinePaymentValidation
  ): Promise<OnlinePaymentValidation> => {
    const persisted = await upsertAdminOnlineValidation(
      validation.purchaseId,
      validation.paidAmount
    );

    setAdminOpsState((previous) => {
      const withoutCurrent = previous.onlineValidations.filter(
        (item) => item.purchaseId !== persisted.purchaseId
      );
      return {
        ...previous,
        onlineValidations: [persisted, ...withoutCurrent]
      };
    });
    return persisted;
  };

  if (!ready || isCheckingSession || !opsReady) {
    return <div className={styles.centeredScreen}>Validando sesion...</div>;
  }

  const dashboardError = sessionError ?? lastError;

  return (
    <div className={styles.adminPage}>
      <header className={styles.adminHeader}>
        <div className={styles.adminIdentity}>
          <Image
            alt="Logo Nutricion Extrema"
            className={styles.adminBrandLogo}
            height={76}
            priority
            src="/nutricion-extrema-logo.png"
            width={76}
          />
          <div>
            <p>Panel privado</p>
            <h1>Nutricion Extrema Control Center</h1>
            <span>
              Ganancias validadas: <strong>{formatPrice(totalValidatedRevenue)}</strong>
            </span>
            {dashboardError ? <p className={styles.inlineError}>{dashboardError}</p> : null}
          </div>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => router.push("/")} type="button">
            Ir a la tienda
          </button>
          <button
            disabled={isSigningOut}
            onClick={() => {
              setIsSigningOut(true);
              void (async () => {
                await clearAdminSession();
                router.replace("/admin/login");
              })();
            }}
            type="button"
          >
            {isSigningOut ? "Saliendo..." : "Cerrar sesion"}
          </button>
        </div>
      </header>

      <nav className={styles.tabNav}>
        {tabs.map((tab) => (
          <button
            className={
              activeTab === tab.id
                ? `${styles.tabButton} ${styles.tabButtonActive}`
                : styles.tabButton
            }
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className={styles.panelArea}>
        {activeTab === "overview" ? (
          <DashboardOverview
            activeProducts={activeProducts}
            activeVideos={activeVideos}
            lowStockProducts={lowStockProducts}
            inventoryUnits={totalInventoryUnits}
            onlineSalesValidated={onlineSalesValidated}
            pendingOnlinePurchases={pendingOnlinePurchases}
            pendingValidationAmount={pendingValidationAmount}
            storePendingSales={storePendingSales}
            storeRevenueValidated={storeValidatedRevenue}
            storeValidatedSales={storeValidatedSales}
            purchases={state.purchases.length}
            storeSales={adminOpsState.storeSales.length}
            totalProducts={state.products.length}
            totalValidatedRevenue={totalValidatedRevenue}
            totalVideos={state.videos.length}
            outOfStockProducts={outOfStockProducts}
            onlineRevenueValidated={onlineValidatedRevenue}
          />
        ) : null}

        {activeTab === "inventory" ? (
          <ProductManager
            products={state.products}
            onAddProduct={addProduct}
            onUpdateProduct={updateProduct}
          />
        ) : null}

        {activeTab === "sales" ? (
          <SalesManager
            onlineValidations={adminOpsState.onlineValidations}
            onRegisterStoreSale={registerStoreSale}
            onUpdatePurchaseStatus={updatePurchaseStatus}
            onUpsertOnlineValidation={upsertOnlineValidation}
            products={state.products}
            purchases={state.purchases}
            storeSales={adminOpsState.storeSales}
          />
        ) : null}

        {activeTab === "videos" ? (
          <VideoManager
            videos={state.videos}
            onAddVideo={addVideo}
            onRemoveVideo={removeVideo}
            onUpdateVideo={updateVideo}
          />
        ) : null}
      </section>

      {loading ? <p className={styles.statusPill}>Sincronizando datos...</p> : null}
    </div>
  );
}
