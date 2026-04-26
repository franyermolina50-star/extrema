export type ProductCategory = 'proteina' | 'creatina' | 'preworkout' | 'vitaminas' | 'quemador';
export type ProductBadge = 'hot' | 'new' | 'sale' | null;

export interface Product {
  id: number;
  name: string;
  cat: ProductCategory;
  badge: ProductBadge;
  price: number;
  oldPrice: number | null;
  img: string;
  stars: number;
  reviews: number;
  desc: string;
  benefits: string[];
  videoTitle: string;
  videoDesc: string;
}

export interface GallerySlide {
  alt: string;
  img: string;
  label: string;
  sub: string;
}

export interface ContentCard {
  title: string;
  type: string;
  excerpt: string;
  image: string;
  metaTime: string;
  metaViews: string;
  hasVideo: boolean;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  proteina: 'Proteina',
  creatina: 'Creatina',
  preworkout: 'Pre-Workout',
  vitaminas: 'Vitaminas',
  quemador: 'Quemador'
};

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Whey Gold Standard',
    cat: 'proteina',
    badge: 'hot',
    price: 189000,
    oldPrice: 220000,
    img: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=300&fit=crop',
    stars: 5,
    reviews: 1243,
    desc: 'La proteina whey mas vendida del mundo. Con 24 g de proteina por porcion, aminoacidos esenciales y BCAA, es ideal para recuperacion muscular post entrenamiento.',
    benefits: [
      '24 g de proteina por porcion',
      'Aminoacidos esenciales (EAA)',
      'Alta biodisponibilidad',
      'Sin azucar anadida',
      'Certificado NSF Sport',
      'Sabores premium'
    ],
    videoTitle: 'Como usar Whey Gold Standard',
    videoDesc: 'Protocolo recomendado para maximizar resultados de fuerza y masa muscular.'
  },
  {
    id: 2,
    name: 'Creatina Monohidratada',
    cat: 'creatina',
    badge: 'new',
    price: 89000,
    oldPrice: null,
    img: 'https://images.unsplash.com/photo-1584863231364-2edc166de576?w=400&h=300&fit=crop',
    stars: 5,
    reviews: 876,
    desc: 'Creatina monohidratada micronizada de alta pureza para mejorar fuerza, rendimiento y recuperacion de forma segura.',
    benefits: [
      '100% creatina monohidratada',
      'Micronizacion ultra fina',
      'Aumenta fuerza y potencia',
      'Mejora la recuperacion',
      'Sin sabor',
      'Apta para uso diario'
    ],
    videoTitle: 'Creatina: carga vs mantenimiento',
    videoDesc: 'Cuando tomarla y como usarla para mejores resultados.'
  },
  {
    id: 3,
    name: 'Pre-Workout Dark Energy',
    cat: 'preworkout',
    badge: 'hot',
    price: 145000,
    oldPrice: 165000,
    img: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=400&h=300&fit=crop',
    stars: 4,
    reviews: 654,
    desc: 'Pre-entrenamiento de alta intensidad con cafeina, beta-alanina, L-citrulina y nootropicos para enfoque y energia.',
    benefits: [
      '300 mg cafeina por porcion',
      'Beta-alanina para resistencia',
      'L-citrulina para pump',
      'Nootropicos para enfoque',
      'Energia sostenida',
      'Varios sabores'
    ],
    videoTitle: 'Dark Energy review completo',
    videoDesc: 'Analisis de ingredientes y forma correcta de uso.'
  },
  {
    id: 4,
    name: 'Multivitaminico Athlete+',
    cat: 'vitaminas',
    badge: 'new',
    price: 75000,
    oldPrice: null,
    img: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=400&h=300&fit=crop',
    stars: 4,
    reviews: 432,
    desc: 'Complejo con vitaminas y minerales para atletas de alto rendimiento y bienestar general.',
    benefits: [
      '25 vitaminas y minerales',
      'Vitamina D3 + K2',
      'Zinc y magnesio',
      'Antioxidantes',
      'Sin alergenos comunes',
      '1 capsula al dia'
    ],
    videoTitle: 'Por que suplementar vitaminas',
    videoDesc: 'Fundamentos para deportistas con alta demanda fisica.'
  },
  {
    id: 5,
    name: 'Thermogenic Shred Pro',
    cat: 'quemador',
    badge: 'sale',
    price: 135000,
    oldPrice: 160000,
    img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=300&fit=crop',
    stars: 4,
    reviews: 321,
    desc: 'Quemador termogenico con extracto de te verde, L-carnitina y cafeina natural para apoyar definicion.',
    benefits: [
      'Acelera el metabolismo',
      'L-carnitina 1000 mg',
      'Extracto de te verde EGCG',
      'Control de apetito',
      'Preserva masa muscular',
      'Energia estable'
    ],
    videoTitle: 'Shred Pro guia de uso',
    videoDesc: 'Como usarlo sin comprometer masa muscular.'
  },
  {
    id: 6,
    name: 'Mass Gainer 3000',
    cat: 'proteina',
    badge: null,
    price: 165000,
    oldPrice: 185000,
    img: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&h=300&fit=crop',
    stars: 4,
    reviews: 548,
    desc: 'Ganador de peso con alto aporte calorico, carbohidratos complejos y proteina para etapas de volumen.',
    benefits: [
      '1250 calorias por porcion',
      '50 g de proteina',
      'Carbohidratos complejos',
      'Con creatina',
      'Vitaminas del grupo B',
      'Ideal para ectomorfos'
    ],
    videoTitle: 'Mass gainer: para quien sirve',
    videoDesc: 'Protocolos, dosis y errores frecuentes.'
  },
  {
    id: 7,
    name: 'BCAA Recovery 2:1:1',
    cat: 'proteina',
    badge: null,
    price: 95000,
    oldPrice: null,
    img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=300&fit=crop',
    stars: 5,
    reviews: 789,
    desc: 'Aminoacidos ramificados en ratio 2:1:1 para apoyar recuperacion y disminuir fatiga muscular.',
    benefits: [
      'Ratio 2:1:1',
      'Con electrolitos',
      'Efecto anti-catabolico',
      'Mejor hidratacion',
      'Sabor frutal',
      'Ideal intra y post'
    ],
    videoTitle: 'BCAA vs EAA',
    videoDesc: 'Cuando conviene cada uno segun tu objetivo.'
  },
  {
    id: 8,
    name: 'Glutamina Ultra Pure',
    cat: 'vitaminas',
    badge: 'new',
    price: 79000,
    oldPrice: null,
    img: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=400&h=300&fit=crop',
    stars: 4,
    reviews: 234,
    desc: 'L-glutamina micronizada para apoyar recuperacion, sistema inmune y mantenimiento de masa muscular.',
    benefits: [
      'L-glutamina 99.9% pureza',
      'Recuperacion acelerada',
      'Sistema inmune fuerte',
      'Soporte digestivo',
      'Sin sabor',
      'Alta solubilidad'
    ],
    videoTitle: 'Glutamina: uso recomendado',
    videoDesc: 'Como incluirla en tu stack de recuperacion.'
  }
];

export const GALLERY_SLIDES: GallerySlide[] = [
  {
    alt: 'Entrenamiento',
    img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=500&fit=crop',
    label: 'Zona de poder',
    sub: 'Entrena sin limites'
  },
  {
    alt: 'Suplementos',
    img: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=500&fit=crop',
    label: 'Proteinas elite',
    sub: 'Whey premium certificado'
  },
  {
    alt: 'Gym',
    img: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&h=500&fit=crop',
    label: 'Hardcore gym',
    sub: 'Resultados visibles'
  },
  {
    alt: 'Creatina',
    img: 'https://images.unsplash.com/photo-1584863231364-2edc166de576?w=400&h=500&fit=crop',
    label: 'Creatina pura',
    sub: 'Fuerza explosiva'
  },
  {
    alt: 'Atleta',
    img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=500&fit=crop',
    label: 'Atletas apex',
    sub: 'Comunidad de campeones'
  },
  {
    alt: 'Nutricion',
    img: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=400&h=500&fit=crop',
    label: 'Nutricion total',
    sub: 'Vitaminas y minerales'
  },
  {
    alt: 'Pre-workout',
    img: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=400&h=500&fit=crop',
    label: 'Pre-workout',
    sub: 'Energia explosiva'
  }
];

export const CONTENT_CARDS: ContentCard[] = [
  {
    type: 'Video tutorial',
    title: 'Como tomar proteina whey',
    excerpt: 'Momento ideal, dosis y consejos para mejorar la absorcion de proteina.',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=250&fit=crop',
    metaTime: '8 min',
    metaViews: '24.5K vistas',
    hasVideo: true
  },
  {
    type: 'Explicacion cientifica',
    title: 'Creatina: verdades y mitos',
    excerpt: 'Efectividad, seguridad y protocolos de uso para creatina monohidratada.',
    image: 'https://images.unsplash.com/photo-1584863231364-2edc166de576?w=400&h=250&fit=crop',
    metaTime: '12 min',
    metaViews: '38.2K vistas',
    hasVideo: true
  },
  {
    type: 'Guia de uso',
    title: 'Pre-workout: guia completa',
    excerpt: 'Ingredientes clave, timing y manejo de tolerancia a la cafeina.',
    image: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=400&h=250&fit=crop',
    metaTime: '10 min',
    metaViews: '19.8K vistas',
    hasVideo: true
  },
  {
    type: 'Articulo',
    title: 'EAA vs BCAA',
    excerpt: 'Comparativa practica para elegir segun tu objetivo deportivo.',
    image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=400&h=250&fit=crop',
    metaTime: '7 min lectura',
    metaViews: '15.1K lecturas',
    hasVideo: false
  },
  {
    type: 'Masterclass',
    title: 'Construye tu stack de suplementos',
    excerpt: 'Como combinar suplementos de forma efectiva para volumen o definicion.',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=250&fit=crop',
    metaTime: '20 min',
    metaViews: '52.3K vistas',
    hasVideo: true
  },
  {
    type: 'Guia nutricional',
    title: 'Nutricion para ganar masa muscular',
    excerpt: 'Base de macros y suplementacion para potenciar el anabolismo.',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=250&fit=crop',
    metaTime: '15 min lectura',
    metaViews: '41.7K lecturas',
    hasVideo: false
  }
];

export const PSE_BANKS = ['Bancolombia', 'Davivienda', 'Banco Bogota', 'Nequi', 'Daviplata', 'Otro'];
