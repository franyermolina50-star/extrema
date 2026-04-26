"use client";
/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

import { useCatalog } from "@/hooks/use-catalog";
import { toErrorMessage } from "@/lib/errors";
import { categoryLabel, formatPrice } from "@/lib/formatters";
import { PaymentMethod, Product, ProductCategory } from "@/types/catalog";

import styles from "./storefront.module.css";

type CategoryFilter = ProductCategory | "todos" | `custom:${string}`;

interface CartLine {
  productId: string;
  quantity: number;
}

interface CheckoutFormState {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
}

const initialCheckoutState: CheckoutFormState = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  paymentMethod: "transferencia"
};

const categoryFilters: Array<{ id: CategoryFilter; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "proteina", label: "Proteina" },
  { id: "creatina", label: "Creatina" },
  { id: "preworkout", label: "Pre-Workout" },
  { id: "vitaminas", label: "Vitaminas" },
  { id: "quemador", label: "Quemadores" }
];

function normalizeCategoryKey(value: string): string {
  return value.trim().toLowerCase();
}

function badgeLabel(badge?: Product["badge"]): string | null {
  if (!badge) {
    return null;
  }

  const map: Record<NonNullable<Product["badge"]>, string> = {
    hot: "Hot",
    new: "Nuevo",
    sale: "Oferta"
  };

  return map[badge];
}

export function StorefrontPage() {
  const {
    ready,
    activeProducts,
    activeVideos,
    createPurchase,
    lastError,
    reloadStorefrontData,
    loading
  } = useCatalog();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("todos");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormState>(initialCheckoutState);
  const [notice, setNotice] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "todos") {
      return activeProducts;
    }
    if (selectedCategory.startsWith("custom:")) {
      const selectedCustomCategory = selectedCategory.slice("custom:".length);
      return activeProducts.filter(
        (product) =>
          normalizeCategoryKey(product.customCategoryLabel ?? "") === selectedCustomCategory
      );
    }
    return activeProducts.filter((product) => product.category === selectedCategory);
  }, [activeProducts, selectedCategory]);

  const customCategoryFilters = useMemo(() => {
    const standardLabels = new Set(
      categoryFilters
        .filter((category) => category.id !== "todos")
        .map((category) => normalizeCategoryKey(category.label))
    );
    const uniqueLabels = new Map<string, string>();

    for (const product of activeProducts) {
      const customLabel = product.customCategoryLabel?.trim();
      if (!customLabel) {
        continue;
      }

      const normalizedLabel = normalizeCategoryKey(customLabel);
      if (standardLabels.has(normalizedLabel) || uniqueLabels.has(normalizedLabel)) {
        continue;
      }

      uniqueLabels.set(normalizedLabel, customLabel);
    }

    return [...uniqueLabels.entries()]
      .sort((left, right) => left[1].localeCompare(right[1]))
      .map(([normalizedLabel, label]) => ({
        id: `custom:${normalizedLabel}` as const,
        label
      }));
  }, [activeProducts]);

  const availableCategoryFilters = useMemo(
    () => [...categoryFilters, ...customCategoryFilters],
    [customCategoryFilters]
  );

  const detailedCart = useMemo(() => {
    return cartLines
      .map((line) => {
        const product = activeProducts.find((item) => item.id === line.productId);
        if (!product) {
          return null;
        }
        return {
          ...line,
          product
        };
      })
      .filter(Boolean) as Array<{ productId: string; quantity: number; product: Product }>;
  }, [activeProducts, cartLines]);

  const cartCount = useMemo(
    () => detailedCart.reduce((total, line) => total + line.quantity, 0),
    [detailedCart]
  );

  const cartTotal = useMemo(
    () =>
      detailedCart.reduce(
        (total, line) => total + line.quantity * line.product.price,
        0
      ),
    [detailedCart]
  );

  const addToCart = (productId: string) => {
    setCartLines((previous) => {
      const existing = previous.find((line) => line.productId === productId);
      if (existing) {
        return previous.map((line) =>
          line.productId === productId
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }

      return [...previous, { productId, quantity: 1 }];
    });
    setNotice("Producto agregado al carrito.");
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartLines((previous) => previous.filter((line) => line.productId !== productId));
      return;
    }

    setCartLines((previous) =>
      previous.map((line) =>
        line.productId === productId ? { ...line, quantity } : line
      )
    );
  };

  const openCheckout = () => {
    if (detailedCart.length === 0) {
      setNotice("Agrega al menos un producto para continuar.");
      return;
    }

    setIsCheckoutOpen(true);
  };

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (detailedCart.length === 0) {
      return;
    }

    setIsCheckoutSubmitting(true);
    try {
      await createPurchase({
        ...checkoutForm,
        items: detailedCart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity
        }))
      });

      setCartLines([]);
      setCheckoutForm(initialCheckoutState);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setNotice("Compra registrada con exito. El equipo la revisara pronto.");
    } catch (error) {
      setNotice(toErrorMessage(error, "No se pudo registrar la compra. Intenta nuevamente."));
    } finally {
      setIsCheckoutSubmitting(false);
    }
  };

  if (!ready) {
    return <div className={styles.loadingScreen}>Cargando tienda...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <a className={styles.logo} href="#inicio">
          <Image
            alt="Logo Nutricion Extrema"
            className={styles.logoImage}
            height={52}
            priority
            src="/nutricion-extrema-logo.png"
            width={52}
          />
          <span className={styles.logoText}>Nutricion Extrema</span>
        </a>
        <nav className={styles.navLinks}>
          <a href="#productos">Productos</a>
          <a href="#videos">Videos</a>
        </nav>
        <button
          className={styles.cartButton}
          onClick={() => setIsCartOpen((open) => !open)}
          type="button"
        >
          Carrito <span>{cartCount}</span>
        </button>
      </header>

      <main>
        <section className={styles.hero} id="inicio">
          <div className={styles.heroTag}>Suplementacion de Elite</div>
          <h1>
            Activa tu mejor version
            <br />
            con <span>Nutricion Extrema</span>
          </h1>
          <p>
            Catalogo premium con enfoque en resultados, seguimiento profesional y
            experiencia de compra clara.
          </p>
          <a className={styles.heroCta} href="#productos">
            Ver productos activos
          </a>
        </section>

        {lastError ? (
          <section className={styles.errorBanner} role="alert">
            <div>
              <p>Tenemos un problema cargando el catalogo.</p>
              <span>{lastError}</span>
            </div>
            <button
              disabled={loading}
              onClick={() => void reloadStorefrontData().catch(() => undefined)}
              type="button"
            >
              {loading ? "Reintentando..." : "Reintentar"}
            </button>
          </section>
        ) : null}

        <section className={styles.productsSection} id="productos">
          <div className={styles.sectionHeading}>
            <p>Catalogo actualizado internamente</p>
            <h2>Productos Activos</h2>
          </div>

          <div className={styles.filters}>
            {availableCategoryFilters.map((category) => (
              <button
                className={
                  selectedCategory === category.id
                    ? `${styles.filterButton} ${styles.filterButtonActive}`
                    : styles.filterButton
                }
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                type="button"
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <article className={styles.productCard} key={product.id}>
                <div className={styles.productImageWrap}>
                  {product.badge ? (
                    <div className={styles.badge}>{badgeLabel(product.badge)}</div>
                  ) : null}
                  <img alt={product.name} src={product.imageUrl} />
                </div>
                <div className={styles.productInfo}>
                  <p className={styles.category}>
                    {categoryLabel(product.category, product.customCategoryLabel)}
                  </p>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className={styles.priceRow}>
                    <div>
                      <strong>{formatPrice(product.price)}</strong>
                      {product.oldPrice ? <span>{formatPrice(product.oldPrice)}</span> : null}
                    </div>
                    <button
                      onClick={() => addToCart(product.id)}
                      type="button"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.videosSection} id="videos">
          <div className={styles.sectionHeading}>
            <p>Contenido destacado</p>
            <h2>Videos Destacados</h2>
          </div>
          <div className={styles.videoGrid}>
            {activeVideos.length === 0 ? (
              <p className={styles.emptyMessage}>
                No hay videos activos en este momento.
              </p>
            ) : (
              activeVideos.map((video) => (
                <article className={styles.videoCard} key={video.id}>
                  <img alt={video.title} src={video.coverUrl} />
                  <div>
                    <h3>{video.title}</h3>
                    <p>{video.subtitle}</p>
                    <a href={video.videoUrl} rel="noreferrer" target="_blank">
                      Ver video
                    </a>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <aside className={isCartOpen ? `${styles.cart} ${styles.cartOpen}` : styles.cart}>
        <div className={styles.cartHeader}>
          <h3>Tu carrito</h3>
          <button onClick={() => setIsCartOpen(false)} type="button">
            Cerrar
          </button>
        </div>

        <div className={styles.cartBody}>
          {detailedCart.length === 0 ? (
            <p className={styles.emptyMessage}>No hay productos agregados.</p>
          ) : (
            detailedCart.map((line) => (
              <div className={styles.cartLine} key={line.productId}>
                <img alt={line.product.name} src={line.product.imageUrl} />
                <div>
                  <h4>{line.product.name}</h4>
                  <p>{formatPrice(line.product.price)}</p>
                  <div className={styles.qtyControls}>
                    <button
                      onClick={() =>
                        updateCartQuantity(line.productId, line.quantity - 1)
                      }
                      type="button"
                    >
                      -
                    </button>
                    <span>{line.quantity}</span>
                    <button
                      onClick={() =>
                        updateCartQuantity(line.productId, line.quantity + 1)
                      }
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.cartFooter}>
          <div>
            <span>Total</span>
            <strong>{formatPrice(cartTotal)}</strong>
          </div>
          <button onClick={openCheckout} type="button">
            Comprar ahora
          </button>
        </div>
      </aside>

      {isCheckoutOpen ? (
        <div className={styles.modalOverlay}>
          <section className={styles.checkoutModal}>
            <div className={styles.checkoutHeader}>
              <h3>Checkout</h3>
              <button onClick={() => setIsCheckoutOpen(false)} type="button">
                Cerrar
              </button>
            </div>

            <form className={styles.checkoutForm} onSubmit={(event) => void handleCheckout(event)}>
              <label>
                Nombre completo
                <input
                  onChange={(event) =>
                    setCheckoutForm((previous) => ({
                      ...previous,
                      customerName: event.target.value
                    }))
                  }
                  required
                  type="text"
                  value={checkoutForm.customerName}
                />
              </label>
              <label>
                Email
                <input
                  onChange={(event) =>
                    setCheckoutForm((previous) => ({
                      ...previous,
                      customerEmail: event.target.value
                    }))
                  }
                  required
                  type="email"
                  value={checkoutForm.customerEmail}
                />
              </label>
              <label>
                Telefono
                <input
                  onChange={(event) =>
                    setCheckoutForm((previous) => ({
                      ...previous,
                      customerPhone: event.target.value
                    }))
                  }
                  required
                  type="tel"
                  value={checkoutForm.customerPhone}
                />
              </label>
              <label>
                Metodo de pago
                <select
                  onChange={(event) =>
                    setCheckoutForm((previous) => ({
                      ...previous,
                      paymentMethod: event.target.value as PaymentMethod
                    }))
                  }
                  value={checkoutForm.paymentMethod}
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="credito">Credito / Debito</option>
                  <option value="pse">PSE</option>
                </select>
              </label>
              <button disabled={isCheckoutSubmitting} type="submit">
                {isCheckoutSubmitting ? "Procesando..." : "Confirmar compra"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {notice ? (
        <div
          className={styles.notice}
          onAnimationEnd={() => setNotice(null)}
          role="status"
        >
          {notice}
        </div>
      ) : null}
    </div>
  );
}
