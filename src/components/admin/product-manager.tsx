/* eslint-disable @next/next/no-img-element */
import { FormEvent, useMemo, useState } from "react";

import { MediaUploadField } from "@/components/admin/media-upload-field";
import { uploadAdminMedia } from "@/lib/backend-api";
import { toErrorMessage } from "@/lib/errors";
import { categoryLabel, formatPrice } from "@/lib/formatters";
import { Product, ProductCategory } from "@/types/catalog";

import styles from "./admin.module.css";

interface ProductManagerProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onUpdateProduct: (
    id: string,
    updates: Partial<Omit<Product, "id" | "createdAt">>
  ) => Promise<void>;
}

interface ProductFormState {
  name: string;
  category: ProductCategory;
  customCategoryLabel: string;
  description: string;
  price: number;
  oldPrice: number | "";
  imageUrl: string;
  stock: number;
  active: boolean;
}

const initialFormState: ProductFormState = {
  name: "",
  category: "proteina",
  customCategoryLabel: "",
  description: "",
  price: 0,
  oldPrice: "",
  imageUrl: "",
  stock: 0,
  active: true
};

export function ProductManager({
  products,
  onAddProduct,
  onUpdateProduct
}: ProductManagerProps) {
  const [form, setForm] = useState<ProductFormState>(initialFormState);
  const [restockDrafts, setRestockDrafts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingMediaKey, setUploadingMediaKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderedProducts = useMemo(
    () => [...products].sort((left, right) => left.name.localeCompare(right.name)),
    [products]
  );

  const totalUnits = useMemo(
    () => products.reduce((sum, product) => sum + product.stock, 0),
    [products]
  );

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.stock > 0 && product.stock <= 5).length,
    [products]
  );

  const outOfStockProducts = useMemo(
    () => products.filter((product) => product.stock === 0).length,
    [products]
  );

  const uploadMedia = async (
    file: File,
    kind: "image",
    loadingKey: string
  ): Promise<string> => {
    setError(null);
    setUploadingMediaKey(loadingKey);
    try {
      return await uploadAdminMedia(file, kind);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, "No se pudo subir el archivo."));
      throw caughtError;
    } finally {
      setUploadingMediaKey((current) => (current === loadingKey ? null : current));
    }
  };

  const runUpdate = (id: string, updates: Partial<Omit<Product, "id" | "createdAt">>) => {
    void onUpdateProduct(id, updates).catch((caughtError) => {
      setError(toErrorMessage(caughtError, "No se pudo actualizar el producto."));
    });
  };

  const addStock = async (product: Product, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Ingresa una cantidad valida para sumar inventario.");
      return;
    }

    setError(null);
    try {
      await onUpdateProduct(product.id, {
        stock: product.stock + quantity
      });
      setRestockDrafts((previous) => ({
        ...previous,
        [product.id]: ""
      }));
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, "No se pudo sumar inventario."));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.description.trim() || !form.imageUrl.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAddProduct({
        name: form.name.trim(),
        category: form.category,
        customCategoryLabel: form.customCategoryLabel.trim() || undefined,
        description: form.description.trim(),
        price: Number(form.price),
        oldPrice: form.oldPrice === "" ? undefined : Number(form.oldPrice),
        imageUrl: form.imageUrl.trim(),
        stock: Number(form.stock),
        active: form.active
      });

      setForm(initialFormState);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, "No se pudo crear el producto."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.panelStack}>
      <section className={styles.kpiStrip}>
        <article>
          <h3>Productos</h3>
          <p>{products.length}</p>
        </article>
        <article>
          <h3>Unidades en inventario</h3>
          <p>{totalUnits}</p>
        </article>
        <article>
          <h3>Stock bajo</h3>
          <p>{lowStockProducts}</p>
        </article>
        <article>
          <h3>Sin stock</h3>
          <p>{outOfStockProducts}</p>
        </article>
      </section>

      <section className={styles.formCard}>
        <h2>Agregar producto al catalogo</h2>
        <form className={styles.formGrid} onSubmit={(event) => void handleSubmit(event)}>
          <label>
            Nombre
            <input
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              type="text"
              value={form.name}
            />
          </label>
          <label>
            Categoria
            <select
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  category: event.target.value as ProductCategory
                }))
              }
              value={form.category}
            >
              <option value="proteina">Proteina</option>
              <option value="creatina">Creatina</option>
              <option value="preworkout">Pre-Workout</option>
              <option value="vitaminas">Vitaminas</option>
              <option value="quemador">Quemador</option>
            </select>
          </label>
          <label>
            Categoria personalizada (opcional)
            <input
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  customCategoryLabel: event.target.value
                }))
              }
              placeholder="Ej. Ganadores de masa"
              type="text"
              value={form.customCategoryLabel}
            />
          </label>
          <label>
            Precio
            <input
              min={0}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, price: Number(event.target.value) }))
              }
              required
              type="number"
              value={form.price}
            />
          </label>
          <label>
            Precio anterior (opcional)
            <input
              min={0}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  oldPrice:
                    event.target.value === "" ? "" : Number(event.target.value)
                }))
              }
              type="number"
              value={form.oldPrice}
            />
          </label>
          <label>
            Stock inicial
            <input
              min={0}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, stock: Number(event.target.value) }))
              }
              required
              type="number"
              value={form.stock}
            />
          </label>
          <div className={styles.fullWidth}>
            <MediaUploadField
              accept="image/*"
              helperText="Arrastra una imagen o haz clic para elegirla desde tu computador."
              label="Imagen del producto"
              onUpload={async (file) => {
                const uploadedUrl = await uploadMedia(file, "image", "product-form-image");
                setForm((prev) => ({ ...prev, imageUrl: uploadedUrl }));
              }}
              previewAlt={form.name || "Vista previa del producto"}
              previewKind="image"
              previewUrl={form.imageUrl}
              uploading={uploadingMediaKey === "product-form-image"}
            />
          </div>
          <label className={styles.fullWidth}>
            Descripcion
            <textarea
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              required
              rows={3}
              value={form.description}
            />
          </label>
          <label className={styles.inlineCheck}>
            <input
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              type="checkbox"
            />
            Producto activo al crear
          </label>
          <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
            {isSubmitting ? "Guardando..." : "Agregar producto"}
          </button>
        </form>
      </section>

      <section className={styles.listCard}>
        <h2>Inventario actual</h2>
        <div className={styles.inventoryGrid}>
          {orderedProducts.map((product) => (
            <article className={styles.inventoryCard} key={product.id}>
              <MediaUploadField
                accept="image/*"
                compact
                helperText="Arrastra una imagen nueva para reemplazarla."
                label="Imagen actual"
                onUpload={async (file) => {
                  const uploadedUrl = await uploadMedia(
                    file,
                    "image",
                    `product-card-${product.id}`
                  );
                  runUpdate(product.id, { imageUrl: uploadedUrl });
                }}
                previewAlt={product.name}
                previewKind="image"
                previewUrl={product.imageUrl}
                uploading={uploadingMediaKey === `product-card-${product.id}`}
              />
              <div className={styles.inventoryBody}>
                <div className={styles.inventoryTitleRow}>
                  <h3>{product.name}</h3>
                  <span
                    className={
                      product.stock === 0
                        ? styles.inventoryBadgeEmpty
                        : product.stock <= 5
                          ? styles.inventoryBadgeLow
                          : styles.inventoryBadgeOk
                    }
                  >
                    {product.stock} u.
                  </span>
                </div>
                <p>{categoryLabel(product.category)}</p>
                {product.customCategoryLabel ? (
                  <span className={styles.customCategoryTag}>
                    Etiqueta: {product.customCategoryLabel}
                  </span>
                ) : null}
                <strong>{formatPrice(product.price)}</strong>
                <label className={styles.inlineCheck}>
                  <input
                    checked={product.active}
                    onChange={(event) =>
                      runUpdate(product.id, { active: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Visible en tienda
                </label>

                <div className={styles.restockRow}>
                  <input
                    min={1}
                    onChange={(event) =>
                      setRestockDrafts((previous) => ({
                        ...previous,
                        [product.id]: event.target.value
                      }))
                    }
                    placeholder="Cantidad a sumar"
                    type="number"
                    value={restockDrafts[product.id] ?? ""}
                  />
                  <button
                    className={styles.secondaryButton}
                    onClick={() => addStock(product, Number(restockDrafts[product.id] ?? "0"))}
                    type="button"
                  >
                    Sumar stock
                  </button>
                </div>

                <div className={styles.quickStockActions}>
                  <button onClick={() => void addStock(product, 1)} type="button">
                    +1
                  </button>
                  <button onClick={() => void addStock(product, 5)} type="button">
                    +5
                  </button>
                  <button onClick={() => void addStock(product, 10)} type="button">
                    +10
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {error ? <p className={styles.inlineError}>{error}</p> : null}
    </div>
  );
}
