"use client";

import { useContext } from "react";

import { CatalogContext } from "@/providers/catalog-provider";

export function useCatalog() {
  const context = useContext(CatalogContext);

  if (!context) {
    throw new Error("useCatalog debe usarse dentro de CatalogProvider.");
  }

  return context;
}
