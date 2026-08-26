-- Adds columns required by /api/user/verify.js identity verification flow
alter table public.users
  add column if not exists account_status text not null default 'active',
  add column if not exists identity_verified boolean not null default false,
  add column if not exists id_verification_status text not null default 'unverified',
  add column if not exists jamaican_id_number text null,
  add column if not exists verification_role text null,
  add column if not exists verification_front_url text null,
  add column if not exists verification_back_url text null,
  add column if not exists verification_agent_id_url text null;

create index if not exists users_account_status_idx on public.users using btree (account_status) TABLESPACE pg_default;
create index if not exists users_id_verification_status_idx on public.users using btree (id_verification_status) TABLESPACE pg_default;
