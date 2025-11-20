create table public.page_views (
  id serial not null,
  page_url text not null,
  view_count integer not null default 1,
  last_viewed timestamp without time zone not null default CURRENT_TIMESTAMP,
  constraint page_views_pkey primary key (id)
) TABLESPACE pg_default;


create table public.quotes (
  id uuid not null default gen_random_uuid (),
  client_name text not null,
  client_email text not null,
  items jsonb not null,
  notes text null,
  subtotal numeric not null,
  tax numeric not null,
  total numeric not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id text null,
  constraint quotes_pkey primary key (id)
) TABLESPACE pg_default;

create table public.email_templates (
  id serial not null,
  user_id text not null,
  template_content text not null,
  is_pinned boolean null default false,
  date_created timestamp without time zone null default now(),
  public_link text null,
  recipient text null,
  subject text null,
  template_name text null,
  shared_with text null,
  constraint email_templates_pkey primary key (id)
) TABLESPACE pg_default;