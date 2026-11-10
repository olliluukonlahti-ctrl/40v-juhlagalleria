-- Run once in the Supabase SQL Editor to enable the guest message wall.
create table if not exists public.party_messages (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(btrim(nickname)) between 1 and 24),
  message text not null check (char_length(btrim(message)) between 1 and 200),
  created_at timestamptz not null default now()
);

alter table public.party_messages enable row level security;
revoke all on public.party_messages from anon, authenticated;
grant select (id, nickname, message, created_at) on public.party_messages to anon, authenticated;

drop policy if exists "Anyone can view party messages" on public.party_messages;
create policy "Anyone can view party messages"
  on public.party_messages for select to anon, authenticated using (true);

create or replace function public.post_party_message(
  p_nickname text,
  p_message text
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
  if p_message is null or char_length(btrim(p_message)) not between 1 and 200 then
    raise exception 'Viestin tulee olla 1–200 merkkiä pitkä.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('party-message:' || lower(btrim(p_nickname)), 0));
  if exists (
    select 1
    from public.party_messages
    where lower(nickname) = lower(btrim(p_nickname))
      and created_at > now() - interval '20 seconds'
  ) then
    raise exception 'Odota hetki ennen seuraavan viestin lähettämistä.';
  end if;

  insert into public.party_messages (nickname, message)
  values (btrim(p_nickname), btrim(p_message))
  returning id into new_id;

  delete from public.party_messages
  where created_at < now() - interval '72 hours';

  delete from public.party_messages
  where id in (
    select id
    from public.party_messages
    order by created_at desc, id desc
    offset 500
  );

  return new_id;
end;
$$;

revoke all on function public.post_party_message(text, text) from public;
grant execute on function public.post_party_message(text, text) to anon, authenticated;
