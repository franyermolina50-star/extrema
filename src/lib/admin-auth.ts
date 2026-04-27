"use client";

import {
  ApiError,
  changeAdminCredentials as changeAdminCredentialsRequest,
  getAdminMe,
  loginAdmin,
  logoutAdmin
} from "@/lib/backend-api";

interface SignInResult {
  ok: boolean;
  error?: string;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    await getAdminMe();
    return true;
  } catch {
    return false;
  }
}

export async function signInAdmin(email: string, password: string): Promise<SignInResult> {
  try {
    await loginAdmin(email, password);
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof Error && error.message.trim()) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: "No se pudo iniciar sesion. Verifica conexion y credenciales."
    };
  }
}

export async function changeAdminCredentials(
  currentEmail: string,
  currentPassword: string,
  newEmail: string,
  newPassword: string
): Promise<SignInResult> {
  try {
    await changeAdminCredentialsRequest({
      currentEmail,
      currentPassword,
      newEmail,
      newPassword
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof Error && error.message.trim()) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: "No se pudieron actualizar las credenciales. Verifica conexion y datos."
    };
  }
}

export async function clearAdminSession(): Promise<void> {
  try {
    await logoutAdmin();
  } catch {
    // ignore logout errors client-side; session cookies may already be invalid.
  }
}
