"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import {
  changeAdminCredentials,
  isAdminAuthenticated,
  signInAdmin
} from "@/lib/admin-auth";

import styles from "./auth.module.css";

interface CredentialsState {
  email: string;
  password: string;
  newEmail: string;
  newPassword: string;
  confirmNewPassword: string;
}

const initialCredentials: CredentialsState = {
  email: "",
  password: "",
  newEmail: "",
  newPassword: "",
  confirmNewPassword: ""
};

type LoginMode = "login" | "change";

export function AdminLogin() {
  const router = useRouter();
  const [credentials, setCredentials] = useState(initialCredentials);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<LoginMode>("login");

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const authenticated = await isAdminAuthenticated();
      if (authenticated && active) {
        router.replace("/admin");
      }
    };

    void checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === "login") {
        const result = await signInAdmin(credentials.email, credentials.password);
        if (!result.ok) {
          setError(result.error ?? "Credenciales invalidas.");
          return;
        }
      } else {
        if (credentials.newPassword !== credentials.confirmNewPassword) {
          setError("La nueva contraseña no coincide.");
          return;
        }

        const result = await changeAdminCredentials(
          credentials.email,
          credentials.password,
          credentials.newEmail,
          credentials.newPassword
        );
        if (!result.ok) {
          setError(result.error ?? "No se pudieron actualizar las credenciales.");
          return;
        }
      }

      router.replace("/admin");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brandHeader}>
          <Image
            alt="Logo Nutricion Extrema"
            className={styles.brandLogo}
            height={66}
            priority
            src="/nutricion-extrema-logo.png"
            width={66}
          />
          <div>
            <p className={styles.kicker}>Acceso privado</p>
            <h1>Ingreso privado</h1>
          </div>
        </div>
        <p className={styles.helper}>
          Inicia sesion con tu cuenta autorizada o cambia tus credenciales usando
          el usuario y la clave anteriores.
        </p>
        <div className={styles.modeSwitch} role="tablist" aria-label="Opciones de acceso">
          <button
            aria-selected={mode === "login"}
            className={
              mode === "login"
                ? `${styles.modeButton} ${styles.modeButtonActive}`
                : styles.modeButton
            }
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            role="tab"
            type="button"
          >
            Ingresar
          </button>
          <button
            aria-selected={mode === "change"}
            className={
              mode === "change"
                ? `${styles.modeButton} ${styles.modeButtonActive}`
                : styles.modeButton
            }
            onClick={() => {
              setMode("change");
              setError(null);
            }}
            role="tab"
            type="button"
          >
            Cambiar usuario y contraseña
          </button>
        </div>
        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          <label>
            {mode === "change" ? "Usuario anterior" : "Usuario autorizado (email)"}
            <input
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="usuario@dominio.com"
              required
              type="email"
              value={credentials.email}
            />
          </label>
          <label>
            {mode === "change" ? "Password anterior" : "Password"}
            <input
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder="Ingresa tu password"
              required
              type="password"
              value={credentials.password}
            />
          </label>
          {mode === "change" ? (
            <>
              <p className={styles.fieldHint}>
                Para cambiar tus datos, confirma primero el usuario y la contraseña
                actuales.
              </p>
              <label>
                Nuevo usuario
                <input
                  onChange={(event) =>
                    setCredentials((prev) => ({ ...prev, newEmail: event.target.value }))
                  }
                  placeholder="nuevo@dominio.com"
                  required
                  type="email"
                  value={credentials.newEmail}
                />
              </label>
              <label>
                Nueva contraseña
                <input
                  onChange={(event) =>
                    setCredentials((prev) => ({
                      ...prev,
                      newPassword: event.target.value
                    }))
                  }
                  placeholder="Nueva contraseña"
                  required
                  type="password"
                  value={credentials.newPassword}
                />
              </label>
              <label>
                Confirmar nueva contraseña
                <input
                  onChange={(event) =>
                    setCredentials((prev) => ({
                      ...prev,
                      confirmNewPassword: event.target.value
                    }))
                  }
                  placeholder="Repite la nueva contraseña"
                  required
                  type="password"
                  value={credentials.confirmNewPassword}
                />
              </label>
            </>
          ) : null}
          {error ? <p className={styles.error}>{error}</p> : null}
          <button disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Validando..."
              : mode === "change"
                ? "Actualizar credenciales"
                : "Entrar al panel"}
          </button>
        </form>
      </section>
    </div>
  );
}
