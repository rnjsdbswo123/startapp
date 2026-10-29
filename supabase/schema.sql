-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행 (여러 번 실행해도 안전)

-- 즐겨찾기
create table if not exists public.links (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_name  text not null default '기타',
  title       text not null,
  url         text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.links add column if not exists group_name text not null default '기타';
alter table public.links enable row level security;
drop policy if exists "own links" on public.links;
create policy "own links" on public.links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 할 일
create table if not exists public.todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text        text not null,
  done        boolean not null default false,
  list        text not null default 'today',   -- 'today' | 'week'
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.todos add column if not exists due date;
alter table public.todos enable row level security;
drop policy if exists "own todos" on public.todos;
create policy "own todos" on public.todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 메모 (나와의 채팅)
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now()
);
alter table public.notes enable row level security;
drop policy if exists "own notes" on public.notes;
create policy "own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 실시간 동기화
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'links') then
    alter publication supabase_realtime add table public.links;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'todos') then
    alter publication supabase_realtime add table public.todos;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notes') then
    alter publication supabase_realtime add table public.notes;
  end if;
end $$;
