-- Optional seed data aligned with current frontend catalog.
insert into products (name, category, description, price, old_price, image_url, badge, stock, active)
values
  (
    'Whey Gold Elite',
    'proteina',
    'Proteina whey premium con 24g por porcion para recuperacion muscular y crecimiento limpio.',
    189000,
    220000,
    'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=900&h=900&fit=crop',
    'hot',
    45,
    true
  ),
  (
    'Creatina Monohidratada',
    'creatina',
    'Creatina micronizada de alta pureza para aumentar fuerza, potencia y recuperacion.',
    89000,
    null,
    'https://images.unsplash.com/photo-1584863231364-2edc166de576?w=900&h=900&fit=crop',
    'new',
    80,
    true
  ),
  (
    'Dark Energy Pre-Workout',
    'preworkout',
    'Pre-entreno intenso con cafeina, beta alanina y citrulina para entrenamientos explosivos.',
    145000,
    165000,
    'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=900&h=900&fit=crop',
    'sale',
    31,
    true
  ),
  (
    'Multivitaminico Athlete+',
    'vitaminas',
    'Complejo de vitaminas y minerales para atletas con foco en rendimiento y recuperacion diaria.',
    75000,
    null,
    'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=900&h=900&fit=crop',
    null,
    102,
    true
  ),
  (
    'Thermogenic Shred Pro',
    'quemador',
    'Termogenico con L-carnitina y extractos naturales para apoyar perdida de grasa.',
    135000,
    160000,
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=900&h=900&fit=crop',
    'hot',
    28,
    true
  );

insert into videos (title, subtitle, video_url, cover_url, "order", active)
values
  (
    'Guia de Suplementacion Inteligente',
    'Como estructurar tu stack de suplementos por objetivo.',
    'https://www.youtube.com/watch?v=2Vv-BfVoq4g',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=700&fit=crop',
    1,
    true
  ),
  (
    'Proteina Post-Entreno: Timing Real',
    'Que dice la evidencia sobre cuando tomar whey.',
    'https://www.youtube.com/watch?v=fLexgOxsZu0',
    'https://images.unsplash.com/photo-1594737625785-c3900bb7f7f4?w=1200&h=700&fit=crop',
    2,
    true
  );
