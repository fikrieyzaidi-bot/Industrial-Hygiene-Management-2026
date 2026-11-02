-- =====================================================================
-- Corporate IH Control Center: database setup for Supabase
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
-- =====================================================================

-- 1) Approved users and their roles
--    admin  = everything, plus manages users
--    editor = can add, edit and delete jobs
--    viewer = read-only
create table if not exists public.app_users (
  email      text primary key,
  name       text,
  role       text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now()
);

-- 2) IH jobs (each job is stored as one JSON document)
create table if not exists public.ih_jobs (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- 3) Shared settings (e.g. site map positions)
create table if not exists public.ih_settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Role of the logged-in user (null = not approved)
create or replace function public.ih_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.app_users
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- Stamp who changed a row and when
create or replace function public.ih_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.jwt() ->> 'email';
  return new;
end $$;

drop trigger if exists ih_jobs_stamp on public.ih_jobs;
create trigger ih_jobs_stamp before insert or update on public.ih_jobs
  for each row execute function public.ih_stamp();
drop trigger if exists ih_settings_stamp on public.ih_settings;
create trigger ih_settings_stamp before insert or update on public.ih_settings
  for each row execute function public.ih_stamp();

-- Row Level Security: the database itself refuses anyone not approved
alter table public.app_users  enable row level security;
alter table public.ih_jobs    enable row level security;
alter table public.ih_settings enable row level security;

drop policy if exists "see own row or admin sees all" on public.app_users;
create policy "see own row or admin sees all" on public.app_users for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') or public.ih_role() = 'admin');
drop policy if exists "admin manages users" on public.app_users;
create policy "admin manages users" on public.app_users for all to authenticated
  using (public.ih_role() = 'admin') with check (public.ih_role() = 'admin');

drop policy if exists "approved users read jobs" on public.ih_jobs;
create policy "approved users read jobs" on public.ih_jobs for select to authenticated
  using (public.ih_role() is not null);
drop policy if exists "editors write jobs" on public.ih_jobs;
create policy "editors write jobs" on public.ih_jobs for all to authenticated
  using (public.ih_role() in ('admin','editor')) with check (public.ih_role() in ('admin','editor'));

drop policy if exists "approved users read settings" on public.ih_settings;
create policy "approved users read settings" on public.ih_settings for select to authenticated
  using (public.ih_role() is not null);
drop policy if exists "editors write settings" on public.ih_settings;
create policy "editors write settings" on public.ih_settings for all to authenticated
  using (public.ih_role() in ('admin','editor')) with check (public.ih_role() in ('admin','editor'));

-- Live updates across phones and laptops
do $$ begin
  alter publication supabase_realtime add table public.ih_jobs, public.ih_settings;
exception when others then null; end $$;

-- 4) Make yourself the first admin.
--    Change the email to the one you created in Authentication -> Users
--    (with USERNAME_DOMAIN "ihcc.app", username Fikri01 = fikri01@ihcc.app).
insert into public.app_users (email, name, role)
values ('fikri01@ihcc.app', 'Fikri', 'admin')
on conflict (email) do update set role = 'admin';

-- =====================================================================
-- 5) CEM reports stored online (added in v3). Safe to run again.
-- =====================================================================
create table if not exists public.cem_reports (
  id         text primary key,
  job_id     text,
  report_no  text,
  client     text,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);
create index if not exists cem_reports_job on public.cem_reports(job_id);
drop trigger if exists cem_reports_stamp on public.cem_reports;
create trigger cem_reports_stamp before insert or update on public.cem_reports
  for each row execute function public.ih_stamp();
alter table public.cem_reports enable row level security;
drop policy if exists "approved users read reports" on public.cem_reports;
create policy "approved users read reports" on public.cem_reports for select to authenticated
  using (public.ih_role() is not null);
drop policy if exists "editors write reports" on public.cem_reports;
create policy "editors write reports" on public.cem_reports for insert to authenticated
  with check (public.ih_role() in ('admin','editor'));
drop policy if exists "editors update reports" on public.cem_reports;
create policy "editors update reports" on public.cem_reports for update to authenticated
  using (public.ih_role() in ('admin','editor')) with check (public.ih_role() in ('admin','editor'));
drop policy if exists "admins delete reports" on public.cem_reports;
create policy "admins delete reports" on public.cem_reports for delete to authenticated
  using (public.ih_role() = 'admin');

-- Private file storage for CoA files, appendices, equipment photos and logos
insert into storage.buckets (id, name, public) values ('cem-files', 'cem-files', false)
  on conflict (id) do update set public = false;
drop policy if exists "approved read cem files" on storage.objects;
create policy "approved read cem files" on storage.objects for select to authenticated
  using (bucket_id = 'cem-files' and public.ih_role() is not null);
drop policy if exists "editors add cem files" on storage.objects;
create policy "editors add cem files" on storage.objects for insert to authenticated
  with check (bucket_id = 'cem-files' and public.ih_role() in ('admin','editor'));
drop policy if exists "editors change cem files" on storage.objects;
create policy "editors change cem files" on storage.objects for update to authenticated
  using (bucket_id = 'cem-files' and public.ih_role() in ('admin','editor'));
drop policy if exists "editors remove cem files" on storage.objects;
create policy "editors remove cem files" on storage.objects for delete to authenticated
  using (bucket_id = 'cem-files' and public.ih_role() in ('admin','editor'));
