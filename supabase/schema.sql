-- Run in the Supabase SQL Editor for the project configured in config.js.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(btrim(nickname)) between 1 and 24),
  photo_path text not null,
  created_at timestamptz not null default now()
);

-- Remove earlier, superseded profile APIs and unused fields.
drop function if exists public.create_guest_profile(text, text, text, text);
drop function if exists public.update_guest_profile(uuid, text, text, text, text);
drop function if exists public.add_guest_photo(uuid, text);
drop function if exists public.add_guest_photo(uuid, text, text);
alter table public.profiles drop column if exists description;
alter table public.profiles drop column if exists edit_token_hash;

create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  nickname text not null default '',
  photo_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profile_photos alter column profile_id drop not null;
alter table public.profile_photos add column if not exists nickname text not null default '';
update public.profile_photos as photo
set nickname = profile.nickname
from public.profiles as profile
where photo.profile_id = profile.id
  and photo.nickname = '';

alter table public.profiles enable row level security;
alter table public.profile_photos enable row level security;
revoke all on public.profiles from anon, authenticated;
revoke all on public.profile_photos from anon, authenticated;
grant select (id, nickname, photo_path, created_at) on public.profiles to anon, authenticated;
grant select (id, profile_id, nickname, photo_path, created_at) on public.profile_photos to anon, authenticated;

drop policy if exists "Anyone can view party profiles" on public.profiles;
create policy "Anyone can view party profiles"
  on public.profiles for select to anon, authenticated using (true);
drop policy if exists "Anyone can view party photos" on public.profile_photos;
create policy "Anyone can view party photos"
  on public.profile_photos for select to anon, authenticated using (true);

insert into public.profile_photos (profile_id, nickname, photo_path, created_at)
select profile.id, profile.nickname, profile.photo_path, profile.created_at
from public.profiles as profile
on conflict (photo_path) do update set nickname = excluded.nickname;

create or replace function public.create_guest_profile(
  p_nickname text,
  p_photo_path text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_id uuid;
begin
  if p_nickname is null or char_length(btrim(p_nickname)) not between 1 and 24 then
    raise exception 'Nimimerkin tulee olla 1–24 merkkiä pitkä.';
  end if;
  if p_photo_path is null or p_photo_path !~ '^[0-9a-f-]{36}\.(jpg|png|webp)$' then
    raise exception 'Kuvan polku ei kelpaa.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(lower(btrim(p_nickname)), 0));
  if exists (select 1 from public.profiles as profile where lower(profile.nickname) = lower(btrim(p_nickname))) then
    raise exception 'Nimimerkki on jo käytössä. Valitse toinen.';
  end if;

  insert into public.profiles (nickname, photo_path)
  values (btrim(p_nickname), p_photo_path)
  returning id into new_id;

  insert into public.profile_photos (profile_id, nickname, photo_path)
  values (new_id, btrim(p_nickname), p_photo_path);
  return new_id;
end;
$$;

create or replace function public.add_guest_photo(
  p_photo_path text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_photo_id uuid;
begin
  if p_photo_path is null or p_photo_path !~ '^[0-9a-f-]{36}\.jpg$' then
    raise exception 'Kuvan polku ei kelpaa.';
  end if;

  insert into public.profile_photos (profile_id, nickname, photo_path)
  values (null, '', p_photo_path)
  returning id into new_photo_id;
  return new_photo_id;
end;
$$;

revoke all on function public.create_guest_profile(text, text) from public;
revoke all on function public.add_guest_photo(text) from public;
grant execute on function public.create_guest_profile(text, text) to anon, authenticated;
grant execute on function public.add_guest_photo(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('party-photos', 'party-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload party photos" on storage.objects;
create policy "Anyone can upload party photos"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'party-photos' and name ~ '^[0-9a-f-]{36}\.jpg$');
