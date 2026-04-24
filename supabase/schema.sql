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

-- =========================================================
-- ORDERS & ORDER ITEMS
-- =========================================================

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  status          text not null default 'pending'
                  check (status in ('pending','packed','shipped','delivered','cancelled')),
  subtotal        numeric(12,2) not null check (subtotal >= 0),
  shipping_fee   numeric(12,2) not null default 0 check (shipping_fee >= 0),
  total           numeric(12,2) not null check (total >= 0),
  payment_method  text not null check (payment_method in ('cod','online','installment')),
  full_name       text not null,
  phone           text not null,
  email           text,
  address_line    text not null,
  city            text not null,
  province        text not null,
  region          text not null,
  postal_code     text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  text,
  name        text not null,
  img         text,
  unit_price  numeric(12,2) not null check (unit_price >= 0),
  qty         integer not null check (qty > 0),
  line_total  numeric(12,2) generated always as (unit_price * qty) stored
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------- Stock decrement + validation (runs on insert) ----------
create or replace function public.process_order_item() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  current_stock integer;
begin
  if new.product_id is not null then
    select stock into current_stock
      from public.products where id = new.product_id for update;
    if current_stock is not null and current_stock < new.qty then
      raise exception 'Insufficient stock for product %', new.product_id;
    end if;
    if current_stock is not null then
      update public.products
         set stock = greatest(0, current_stock - new.qty)
       where id = new.product_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_process on public.order_items;
create trigger order_items_process
  before insert on public.order_items
  for each row execute function public.process_order_item();

-- ---------- RLS ----------
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
       where o.id = order_id
         and (o.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists order_items_insert_own on public.order_items;
create policy order_items_insert_own on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
       where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- ---------- Atomic order creation (RPC) ----------
create or replace function public.create_order(p_payload jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user_id  uuid := auth.uid();
  v_order_id uuid;
  v_item     jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, total, payment_method,
    full_name, phone, email, address_line, city, province, region, postal_code, notes
  ) values (
    v_user_id, 'pending',
    (p_payload->>'subtotal')::numeric,
    (p_payload->>'shipping_fee')::numeric,
    (p_payload->>'total')::numeric,
    p_payload->>'payment_method',
    p_payload->>'full_name',
    p_payload->>'phone',
    nullif(p_payload->>'email',''),
    p_payload->>'address_line',
    p_payload->>'city',
    p_payload->>'province',
    p_payload->>'region',
    nullif(p_payload->>'postal_code',''),
    nullif(p_payload->>'notes','')
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    insert into public.order_items (order_id, product_id, name, img, unit_price, qty)
    values (
      v_order_id,
      nullif(v_item->>'product_id',''),
      v_item->>'name',
      nullif(v_item->>'img',''),
      (v_item->>'unit_price')::numeric,
      (v_item->>'qty')::int
    );
  end loop;

  return v_order_id;
end;
$$;

grant execute on function public.create_order(jsonb) to authenticated;
