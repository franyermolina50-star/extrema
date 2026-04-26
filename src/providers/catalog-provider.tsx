"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  checkoutStore,
  createAdminProduct,
  createAdminVideo,
  deleteAdminVideo,
  getAdminProducts,
  getAdminPurchases,
  getAdminVideos,
  getStoreProducts,
  getStoreVideos,
  updateAdminProduct,
  updateAdminPurchaseStatus,
  updateAdminVideo
} from "@/lib/backend-api";
import { toErrorMessage } from "@/lib/errors";
import {
  CatalogState,
  CheckoutPayload,
  Product,
  PurchaseStatus,
  VideoContent
} from "@/types/catalog";

interface CatalogContextValue {
  ready: boolean;
  loading: boolean;
  lastError: string | null;
  state: CatalogState;
  activeProducts: Product[];
  activeVideos: VideoContent[];
  clearLastError: () => void;
  reloadStorefrontData: () => Promise<void>;
  reloadAdminData: () => Promise<void>;
  addProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateProduct: (
    id: string,
    updates: Partial<Omit<Product, "id" | "createdAt">>
  ) => Promise<void>;
  addVideo: (video: Omit<VideoContent, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateVideo: (
    id: string,
    updates: Partial<Omit<VideoContent, "id" | "createdAt">>
  ) => Promise<void>;
  removeVideo: (id: string) => Promise<void>;
  createPurchase: (payload: CheckoutPayload) => Promise<void>;
  updatePurchaseStatus: (purchaseId: string, status: PurchaseStatus) => Promise<void>;
}

const initialState: CatalogState = {
  products: [],
  videos: [],
  purchases: []
};

export const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [state, setState] = useState<CatalogState>(initialState);

  const clearLastError = useCallback(() => {
    setLastError(null);
  }, []);

  const reloadStorefrontData = useCallback(async () => {
    setLoading(true);
    try {
      const [products, videos] = await Promise.all([getStoreProducts(true), getStoreVideos(true)]);

      setState((previous) => ({
        ...previous,
        products,
        videos
      }));
      setLastError(null);
    } catch (error) {
      setLastError(toErrorMessage(error, "No se pudo cargar el catalogo de la tienda."));
      throw error;
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  const reloadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [products, videos, purchases] = await Promise.all([
        getAdminProducts(),
        getAdminVideos(),
        getAdminPurchases()
      ]);

      setState({
        products,
        videos,
        purchases
      });
      setLastError(null);
    } catch (error) {
      setLastError(toErrorMessage(error, "No se pudieron cargar los datos de admin."));
      throw error;
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reloadStorefrontData().catch(() => undefined);
  }, [reloadStorefrontData]);

  const activeProducts = useMemo(
    () => state.products.filter((product) => product.active),
    [state.products]
  );

  const activeVideos = useMemo(
    () =>
      state.videos
        .filter((video) => video.active)
        .sort((left, right) => left.order - right.order),
    [state.videos]
  );

  const addProduct = useCallback(
    async (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
      const created = await createAdminProduct(product);
      setState((previous) => ({
        ...previous,
        products: [created, ...previous.products]
      }));
      setLastError(null);
    },
    []
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Omit<Product, "id" | "createdAt">>) => {
      const updated = await updateAdminProduct(id, updates);
      setState((previous) => ({
        ...previous,
        products: previous.products.map((product) => (product.id === id ? updated : product))
      }));
      setLastError(null);
    },
    []
  );

  const addVideo = useCallback(
    async (video: Omit<VideoContent, "id" | "createdAt" | "updatedAt">) => {
      const created = await createAdminVideo(video);
      setState((previous) => ({
        ...previous,
        videos: [...previous.videos, created]
      }));
      setLastError(null);
    },
    []
  );

  const updateVideo = useCallback(
    async (id: string, updates: Partial<Omit<VideoContent, "id" | "createdAt">>) => {
      const updated = await updateAdminVideo(id, updates);
      setState((previous) => ({
        ...previous,
        videos: previous.videos.map((video) => (video.id === id ? updated : video))
      }));
      setLastError(null);
    },
    []
  );

  const removeVideo = useCallback(async (id: string) => {
    await deleteAdminVideo(id);
    setState((previous) => ({
      ...previous,
      videos: previous.videos.filter((video) => video.id !== id)
    }));
    setLastError(null);
  }, []);

  const createPurchase = useCallback(async (payload: CheckoutPayload) => {
    const purchase = await checkoutStore(payload);
    setState((previous) => {
      const quantitiesByProductId = new Map<string, number>();
      for (const item of purchase.items) {
        if (!item.productId) {
          continue;
        }
        const accumulated = quantitiesByProductId.get(item.productId) ?? 0;
        quantitiesByProductId.set(item.productId, accumulated + item.quantity);
      }

      return {
        products: previous.products.map((product) => {
          const requested = quantitiesByProductId.get(product.id) ?? 0;
          if (requested === 0) {
            return product;
          }
          return {
            ...product,
            stock: Math.max(0, product.stock - requested)
          };
        }),
        videos: previous.videos,
        purchases: [purchase, ...previous.purchases]
      };
    });
    setLastError(null);
  }, []);

  const updatePurchaseStatus = useCallback(async (purchaseId: string, status: PurchaseStatus) => {
    const updatedPurchase = await updateAdminPurchaseStatus(purchaseId, status);
    setState((previous) => ({
      ...previous,
      purchases: previous.purchases.map((purchase) =>
        purchase.id === purchaseId ? updatedPurchase : purchase
      )
    }));
    setLastError(null);
  }, []);

  const value = useMemo<CatalogContextValue>(
    () => ({
      ready,
      loading,
      lastError,
      state,
      activeProducts,
      activeVideos,
      clearLastError,
      reloadStorefrontData,
      reloadAdminData,
      addProduct,
      updateProduct,
      addVideo,
      updateVideo,
      removeVideo,
      createPurchase,
      updatePurchaseStatus
    }),
    [
      ready,
      loading,
      lastError,
      state,
      activeProducts,
      activeVideos,
      clearLastError,
      reloadStorefrontData,
      reloadAdminData,
      addProduct,
      updateProduct,
      addVideo,
      updateVideo,
      removeVideo,
      createPurchase,
      updatePurchaseStatus
    ]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
