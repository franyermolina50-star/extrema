import type { Metadata } from "next";

import "./globals.css";
import { CatalogProvider } from "@/providers/catalog-provider";

export const metadata: Metadata = {
  title: "Nutricion Extrema",
  description: "Ecommerce de suplementos de alto rendimiento en Next.js 15."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <CatalogProvider>{children}</CatalogProvider>
      </body>
    </html>
  );
}
