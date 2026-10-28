-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행 (여러 번 실행해도 안전)

create table if not exists public.links (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null,
  url         text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.links enable row level security;

-- 본인 데이터만 읽고 쓸 수 있음
drop policy if exists "own links" on public.links;
create policy "own links" on public.links
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 실시간 동기화용
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'links'
  ) then
    alter publication supabase_realtime add table public.links;
  end if;
end $$;
