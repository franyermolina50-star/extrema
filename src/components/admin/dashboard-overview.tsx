import { formatPrice } from "@/lib/formatters";

import styles from "./admin.module.css";

interface DashboardOverviewProps {
  totalProducts: number;
  activeProducts: number;
  totalVideos: number;
  activeVideos: number;
  purchases: number;
  inventoryUnits: number;
  storeSales: number;
  storeValidatedSales: number;
  storeRevenueValidated: number;
  onlineSalesValidated: number;
  onlineRevenueValidated: number;
  totalValidatedRevenue: number;
  pendingValidationAmount: number;
  pendingOnlinePurchases: number;
  storePendingSales: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

export function DashboardOverview({
  totalProducts,
  activeProducts,
  totalVideos,
  activeVideos,
  purchases,
  inventoryUnits,
  storeSales,
  storeValidatedSales,
  storeRevenueValidated,
  onlineSalesValidated,
  onlineRevenueValidated,
  totalValidatedRevenue,
  pendingValidationAmount,
  pendingOnlinePurchases,
  storePendingSales,
  lowStockProducts,
  outOfStockProducts
}: DashboardOverviewProps) {
  const cards = [
    {
      title: "Ganancias validadas",
      value: formatPrice(totalValidatedRevenue),
      description: "Suma lo confirmado en caja y los pagos online que ya pasaron validacion."
    },
    {
      title: "Ventas de tienda",
      value: formatPrice(storeRevenueValidated),
      description: `${storeValidatedSales}/${storeSales} ventas de mostrador cerradas.`
    },
    {
      title: "Ventas online",
      value: formatPrice(onlineRevenueValidated),
      description: `${onlineSalesValidated}/${purchases} compras online revisadas.`
    },
    {
      title: "Pendiente por validar",
      value: formatPrice(pendingValidationAmount),
      description: `${storePendingSales} ventas de tienda y ${pendingOnlinePurchases} compras online siguen en revision.`
    },
    {
      title: "Inventario disponible",
      value: `${inventoryUnits} uds`,
      description: `${lowStockProducts} productos estan en stock bajo y ${outOfStockProducts} se agotaron.`
    },
    {
      title: "Catalogo activo",
      value: `${activeProducts}/${totalProducts}`,
      description: "Productos visibles para la tienda y listos para vender."
    },
    {
      title: "Videos activos",
      value: `${activeVideos}/${totalVideos}`,
      description: "Piezas audiovisuales que se muestran en la portada."
    }
  ];

  const notes = [
    {
      title: "Que cuenta como ganancia",
      body:
        "Este panel solo suma dinero ya confirmado. No resta costos de compra, publicidad ni envios, asi que muestra ingresos operativos, no utilidad neta."
    },
    {
      title: "Como leer el pendiente",
      body:
        "El valor pendiente agrupa ventas de tienda sin cierre y compras online que todavia no se validan. Es la fila que primero conviene revisar."
    },
    {
      title: "Estado de catalogo",
      body:
        "Los productos y videos activos reflejan lo que ve el cliente. Si un numero cae, la tienda sigue funcionando, pero el escaparate se esta quedando corto."
    }
  ];

  return (
    <div className={styles.overviewStack}>
      <section className={styles.overviewHero}>
        <div className={styles.overviewHeroCopy}>
          <p>Lectura ejecutiva</p>
          <h2>Tu tienda resumida como un tablero real de operacion.</h2>
          <span>
            Aqui ves ingresos confirmados, pendientes por cerrar y el estado del catalogo con
            contexto, no solo cifras sueltas.
          </span>
        </div>

        <div className={styles.overviewHeroMetric}>
          <strong>{formatPrice(totalValidatedRevenue)}</strong>
          <span>Ganancias validadas</span>
          <small>
            Suma tienda + online ya confirmados. Es el mejor numero para medir lo cobrado.
          </small>
        </div>
      </section>

      <section className={styles.overviewGrid}>
        {cards.map((card) => (
          <article className={styles.metricCard} key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.value}</p>
            <span>{card.description}</span>
          </article>
        ))}
      </section>

      <section className={styles.overviewNotes}>
        {notes.map((note) => (
          <article className={styles.overviewNoteCard} key={note.title}>
            <h3>{note.title}</h3>
            <p>{note.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
