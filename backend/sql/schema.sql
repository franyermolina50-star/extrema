-- PostgreSQL schema for Supabase (run once in SQL Editor).
create extension if not exists pgcrypto;

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  category varchar(32) not null check (category in ('proteina', 'creatina', 'preworkout', 'vitaminas', 'quemador')),
  custom_category_label varchar(120),
  description text not null,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= 0),
  image_url varchar(1200) not null,
  badge varchar(16) check (badge is null or badge in ('new', 'hot', 'sale')),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on products(category);
create index if not exists idx_products_active on products(active);
create index if not exists idx_products_custom_category_label on products(custom_category_label);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  title varchar(180) not null,
  subtitle text not null default '',
  video_url varchar(1200) not null,
  cover_url varchar(1200) not null,
  "order" integer not null default 1 check ("order" >= 1),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_videos_active on videos(active);
create index if not exists idx_videos_order on videos("order");

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  customer_name varchar(180) not null,
  customer_email varchar(255) not null,
  customer_phone varchar(50) not null,
  payment_method varchar(32) not null check (payment_method in ('transferencia', 'credito', 'pse')),
  status varchar(32) not null default 'pending' check (status in ('pending', 'paid', 'shipping', 'cancelled')),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_purchases_created on purchases(created_at desc);
create index if not exists idx_purchases_status on purchases(status);

create table if not exists purchase_items (
  id bigserial primary key,
  purchase_id uuid not null references purchases(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name varchar(200) not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0)
);

create index if not exists idx_purchase_items_purchase on purchase_items(purchase_id);

create table if not exists refresh_tokens (
  id uuid primary key,
  user_id uuid not null references admin_users(id) on delete cascade,
  token_hash varchar(64) not null unique,
  user_agent varchar(500),
  ip_address varchar(64),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_refresh_tokens_user_id on refresh_tokens(user_id);
create index if not exists idx_refresh_tokens_expires on refresh_tokens(expires_at);
create index if not exists idx_refresh_tokens_revoked on refresh_tokens(revoked_at);

create table if not exists store_sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  product_name varchar(200) not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  expected_total numeric(12,2) not null check (expected_total >= 0),
  paid_amount numeric(12,2) not null check (paid_amount >= 0),
  validated boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_store_sales_created on store_sales(created_at desc);
create index if not exists idx_store_sales_product on store_sales(product_id);
create index if not exists idx_store_sales_validated on store_sales(validated);

create table if not exists online_payment_validations (
  purchase_id uuid primary key references purchases(id) on delete cascade,
  paid_amount numeric(12,2) not null check (paid_amount >= 0),
  validated boolean not null default false,
  validated_at timestamptz not null default now()
);

create index if not exists idx_online_validations_validated_at on online_payment_validations(validated_at desc);
create index if not exists idx_online_validations_validated on online_payment_validations(validated);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_users_updated_at on admin_users;
create trigger trg_admin_users_updated_at
before update on admin_users
for each row
execute function set_updated_at();

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
before update on products
for each row
execute function set_updated_at();

drop trigger if exists trg_videos_updated_at on videos;
create trigger trg_videos_updated_at
before update on videos
for each row
execute function set_updated_at();
