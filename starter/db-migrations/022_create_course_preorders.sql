create table if not exists public.course_preorders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  price_choice text,
  buy_now boolean not null default false,
  discounted_amount integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists course_preorders_email_idx on public.course_preorders (email);

alter table public.course_preorders enable row level security;

create policy "Allow anon inserts for course preorders"
  on public.course_preorders
  for insert
  to anon
  with check (true);

create policy "Allow authenticated inserts for course preorders"
  on public.course_preorders
  for insert
  to authenticated
  with check (true);
