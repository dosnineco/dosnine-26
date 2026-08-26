-- Tracks how many extra (paid) listings a non-agent user has purchased beyond the 2 free listings
alter table public.users
  add column if not exists extra_listings_paid integer not null default 0;
