-- =========================================================
-- Mariel Store — Supabase schema
-- =========================================================

-- ---------- PRODUCTS ----------
create table if not exists public.products (
  id           text primary key,
  name         text not null,
  price        numeric(12,2) not null check (price >= 0),
  cat          text not null,
  img          text,
  tag          text,
  description  text,
  details      text,
  stock        integer not null default 0 check (stock >= 0),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_cat_idx on public.products (cat);
create index if not exists products_sort_idx on public.products (sort_order, created_at desc);

-- Auto-update updated_at on row update
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------- ADMINS ----------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Helper: is the current user an admin?
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.products enable row level security;
alter table public.admins   enable row level security;

-- Products: anyone may read; only admins may write
drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select using (true);

drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products
  for insert with check (public.is_admin());

drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products
  for delete using (public.is_admin());

-- Admins: a logged-in user can see their own admin row (used by the UI to show/hide the admin link).
drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins
  for select using (auth.uid() = user_id);

-- ---------- SEED PRODUCTS ----------
-- Safe to re-run; uses upsert.
insert into public.products (id, name, price, cat, img, tag, description, details, stock, sort_order) values
  ('iphone14', 'iPhone 14 Pro',                50000, 'Gadgets',     'images/products/Iphone14.jpg',    'Bestseller', '128GB, factory unlocked, 1-year warranty.',                          '6.1" Super Retina XDR display, A16 Bionic chip, 48MP main camera, Face ID, 5G.',  3,  10),
  ('iphone12', 'iPhone 12',                    28000, 'Gadgets',     'images/products/Iphone12.jpg',    NULL,         '256GB, factory unlocked, 1-year warranty.',                          '6.1" OLED display, A14 Bionic chip, dual 12MP cameras, 5G capable.',              7,  20),
  ('ipad',     'Apple iPad',                   22000, 'Gadgets',     'images/products/Ipad.jpg',        'New',        '128GB, 11th Gen (A16 Bionic) with Apple Pencil support.',            '10.9" Liquid Retina display, A16 Bionic chip, Apple Pencil (2nd gen) support.',   5,  30),
  ('clock',    'Wall Clock',                     200, 'Accessories', 'images/products/Clock.jpg',       NULL,         'Affordable, modern, durable for any room.',                          '30cm diameter, silent quartz movement, AA battery powered.',                      1,  40),
  ('snickers', 'Mixed Chocolates Box',           500, 'Foods',       'images/products/Snickers.jpg',    'Hot',        'A box of mixed chocolates, gift ready.',                             'A box with different kinds of chocolates inside. All-time favorite!',             13, 50),
  ('choco',    'Snickers, Dairy Milk Bars',      350, 'Foods',       'images/products/Chocolates.jpg',  NULL,         'Snickers and Dairy Milk Bars selling per box.',                      'Classic combination, irresistible taste.',                                        22, 60),
  ('chair1',   'Set of Lounge Chairs',          3000, 'Furnitures',  'images/products/chair1.jpg',      'New',        'Comfortable, stylish, perfect for any living room.',                 '3-seater, high-density foam cushions, durable fabric upholstery.',                1,  70)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  cat = excluded.cat,
  img = excluded.img,
  tag = excluded.tag,
  description = excluded.description,
  details = excluded.details,
  stock = excluded.stock,
  sort_order = excluded.sort_order;
