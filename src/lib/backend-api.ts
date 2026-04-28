"use client";

import {
  OnlinePaymentValidation,
  StoreSaleCreatePayload,
  StoreSaleRecord
} from "@/types/admin-ops";
import {
  CheckoutPayload,
  Product,
  Purchase,
  PurchaseStatus,
  VideoContent
} from "@/types/catalog";

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api/v1"
    : "http://localhost:8000/api/v1";
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME?.trim() || "apex_csrf_token";

interface AdminIdentity {
  id: string;
  email: string;
}

interface AuthSessionResponse {
  user: AdminIdentity;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  csrfToken: string;
}

interface MeResponse {
  user: AdminIdentity;
}

interface MessageResponse {
  message: string;
}

interface AdminOpsStateResponse {
  storeSales: StoreSaleRecord[];
  onlineValidations: OnlinePaymentValidation[];
}

interface MediaUploadResponse {
  url: string;
}

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  withCsrf?: boolean;
  retryAuth?: boolean;
  headers?: Record<string, string>;
}

interface InternalRequestOptions extends ApiRequestOptions {
  allowRefreshAttempt: boolean;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let refreshPromise: Promise<boolean> | null = null;
let csrfTokenMemory: string | null = null;

function getApiBaseUrl(): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const rawBase = configuredBase || DEFAULT_API_BASE_URL;
  const normalizedBase = rawBase.replace(/\/+$/, "");

  // In browser production, avoid cross-origin API bases to preserve auth cookies.
  if (typeof window !== "undefined" && /^https?:\/\//i.test(normalizedBase)) {
    try {
      const apiUrl = new URL(normalizedBase);
      if (apiUrl.origin !== window.location.origin) {
        return apiUrl.pathname.replace(/\/+$/, "") || "/api/v1";
      }
    } catch {
      return "/api/v1";
    }
  }

  return normalizedBase;
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

function saveCsrfToken(token: string): void {
  csrfTokenMemory = token;
}

function readCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookiePairs = document.cookie.split(";").map((chunk) => chunk.trim());
  const match = cookiePairs.find((pair) => pair.startsWith(`${CSRF_COOKIE_NAME}=`));
  if (!match) {
    return null;
  }
  return decodeURIComponent(match.slice(CSRF_COOKIE_NAME.length + 1));
}

function readCsrfToken(): string | null {
  if (csrfTokenMemory) {
    return csrfTokenMemory;
  }
  const cookieToken = readCsrfTokenFromCookie();
  if (cookieToken) {
    csrfTokenMemory = cookieToken;
    return cookieToken;
  }
  return null;
}

export function clearCsrfToken(): void {
  csrfTokenMemory = null;
}

async function parseError(response: Response): Promise<ApiError> {
  let message = "No se pudo completar la solicitud.";

  try {
    const body = (await response.json()) as
      | { detail?: string; errors?: Array<{ msg?: string }> }
      | undefined;
    if (typeof body?.detail === "string" && body.detail.trim()) {
      message = body.detail;
    } else if (Array.isArray(body?.errors) && body.errors.length > 0) {
      const firstMessage = body.errors[0]?.msg;
      if (firstMessage) {
        message = firstMessage;
      }
    }
  } catch {
    message = response.statusText || message;
  }

  return new ApiError(message, response.status);
}

function createHeaders(options: InternalRequestOptions): Headers {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.withCsrf) {
    const csrfToken = readCsrfToken();
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }

  return headers;
}

async function executeRequest<T>(path: string, options: InternalRequestOptions): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      method: options.method ?? "GET",
      credentials: "include",
      headers: createHeaders(options),
      body:
        options.body !== undefined && !(options.body instanceof FormData)
          ? JSON.stringify(options.body)
          : (options.body as BodyInit | undefined),
      cache: "no-store"
    });
  } catch {
    throw new ApiError(
      `No se pudo conectar con la API (${getApiBaseUrl()}). Verifica URL y CORS.`,
      0
    );
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json()) as T;
  if (typeof data === "object" && data !== null && "csrfToken" in data) {
    const csrfToken = (data as { csrfToken?: unknown }).csrfToken;
    if (typeof csrfToken === "string" && csrfToken.trim()) {
      saveCsrfToken(csrfToken);
    }
  }
  return data;
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const csrfToken = readCsrfToken();
    if (!csrfToken) {
      return false;
    }

    try {
      await executeRequest<AuthSessionResponse>("/auth/refresh", {
        method: "POST",
        withCsrf: true,
        retryAuth: false,
        allowRefreshAttempt: false
      });
      return true;
    } catch {
      clearCsrfToken();
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const requestOptions: InternalRequestOptions = {
    ...options,
    allowRefreshAttempt: options.retryAuth ?? false
  };

  try {
    return await executeRequest<T>(path, requestOptions);
  } catch (error) {
    const shouldRetryWithRefresh =
      error instanceof ApiError &&
      error.status === 401 &&
      requestOptions.allowRefreshAttempt &&
      path !== "/auth/refresh";

    if (!shouldRetryWithRefresh) {
      throw error;
    }

    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw error;
    }

    return executeRequest<T>(path, {
      ...requestOptions,
      allowRefreshAttempt: false
    });
  }
}

export async function loginAdmin(email: string, password: string): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>("/auth/login", {
    method: "POST",
    body: {
      email,
      password
    }
  });
}

export async function changeAdminCredentials(payload: {
  currentEmail: string;
  currentPassword: string;
  newEmail: string;
  newPassword: string;
}): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>("/auth/change-credentials", {
    method: "POST",
    body: payload
  });
}

export async function logoutAdmin(): Promise<MessageResponse> {
  try {
    return await apiRequest<MessageResponse>("/auth/logout", {
      method: "POST",
      withCsrf: true,
      retryAuth: false
    });
  } finally {
    clearCsrfToken();
  }
}

export async function getAdminMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>("/auth/me", {
    retryAuth: true
  });
}

export async function getStoreProducts(activeOnly = true): Promise<Product[]> {
  return apiRequest<Product[]>(`/store/products?active_only=${String(activeOnly)}`);
}

export async function getStoreVideos(activeOnly = true): Promise<VideoContent[]> {
  return apiRequest<VideoContent[]>(`/store/videos?active_only=${String(activeOnly)}`);
}

export async function checkoutStore(payload: CheckoutPayload): Promise<Purchase> {
  return apiRequest<Purchase>("/store/checkout", {
    method: "POST",
    body: payload
  });
}

export async function getAdminProducts(): Promise<Product[]> {
  return apiRequest<Product[]>("/admin/products/", { retryAuth: true });
}

export async function createAdminProduct(
  payload: Omit<Product, "id" | "createdAt" | "updatedAt">
): Promise<Product> {
  return apiRequest<Product>("/admin/products/", {
    method: "POST",
    withCsrf: true,
    retryAuth: true,
    body: payload
  });
}

export async function updateAdminProduct(
  id: string,
  payload: Partial<Omit<Product, "id" | "createdAt">>
): Promise<Product> {
  return apiRequest<Product>(`/admin/products/${id}`, {
    method: "PATCH",
    withCsrf: true,
    retryAuth: true,
    body: payload
  });
}

export async function getAdminVideos(): Promise<VideoContent[]> {
  return apiRequest<VideoContent[]>("/admin/videos/", { retryAuth: true });
}

export async function createAdminVideo(
  payload: Omit<VideoContent, "id" | "createdAt" | "updatedAt">
): Promise<VideoContent> {
  return apiRequest<VideoContent>("/admin/videos/", {
    method: "POST",
    withCsrf: true,
    retryAuth: true,
    body: payload
  });
}

export async function uploadAdminMedia(file: File, kind: "image" | "video"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const response = await apiRequest<MediaUploadResponse>("/admin/media/upload", {
    method: "POST",
    withCsrf: true,
    retryAuth: true,
    body: formData
  });

  return response.url;
}

export async function updateAdminVideo(
  id: string,
  payload: Partial<Omit<VideoContent, "id" | "createdAt">>
): Promise<VideoContent> {
  return apiRequest<VideoContent>(`/admin/videos/${id}`, {
    method: "PATCH",
    withCsrf: true,
    retryAuth: true,
    body: payload
  });
}

export async function deleteAdminVideo(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`/admin/videos/${id}`, {
    method: "DELETE",
    withCsrf: true,
    retryAuth: true
  });
}

export async function getAdminPurchases(): Promise<Purchase[]> {
  return apiRequest<Purchase[]>("/admin/purchases/", { retryAuth: true });
}

export async function updateAdminPurchaseStatus(
  purchaseId: string,
  status: PurchaseStatus
): Promise<Purchase> {
  return apiRequest<Purchase>(`/admin/purchases/${purchaseId}/status`, {
    method: "PATCH",
    withCsrf: true,
    retryAuth: true,
    body: { status }
  });
}

export async function getAdminOpsState(): Promise<AdminOpsStateResponse> {
  return apiRequest<AdminOpsStateResponse>("/admin/ops/state", {
    retryAuth: true
  });
}

export async function getAdminStoreSales(): Promise<StoreSaleRecord[]> {
  return apiRequest<StoreSaleRecord[]>("/admin/ops/store-sales", {
    retryAuth: true
  });
}

export async function createAdminStoreSale(
  payload: StoreSaleCreatePayload
): Promise<StoreSaleRecord> {
  return apiRequest<StoreSaleRecord>("/admin/ops/store-sales", {
    method: "POST",
    withCsrf: true,
    retryAuth: true,
    body: payload
  });
}

export async function getAdminOnlineValidations(): Promise<OnlinePaymentValidation[]> {
  return apiRequest<OnlinePaymentValidation[]>("/admin/ops/online-validations", {
    retryAuth: true
  });
}

export async function upsertAdminOnlineValidation(
  purchaseId: string,
  paidAmount: number
): Promise<OnlinePaymentValidation> {
  return apiRequest<OnlinePaymentValidation>(`/admin/ops/online-validations/${purchaseId}`, {
    method: "PUT",
    withCsrf: true,
    retryAuth: true,
    body: { paidAmount }
  });
}
