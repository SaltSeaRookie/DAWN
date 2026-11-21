-- ===== 晨曦大陸 Dawnlands：Supabase 資料庫設定 =====
-- 在 Supabase 的 SQL Editor 貼上全部內容並按 Run（可以重複執行，不會刪掉已經存在的資料）。

-- 帳號資料（一個 Supabase 使用者對應一個遊戲帳號）
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  account text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_account_lower on public.profiles (lower(account));

-- 角色存檔（整份存檔放在 data 欄位）
create table if not exists public.characters (
  id bigint generated always as identity primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists characters_name_lower on public.characters (lower(name));
create index if not exists characters_owner on public.characters (owner);

-- 每個帳號最多 4 個角色
create or replace function public.limit_characters() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.characters where owner = new.owner) >= 4 then
    raise exception 'character limit reached';
  end if;
  return new;
end $$;
drop trigger if exists characters_limit on public.characters;
create trigger characters_limit before insert on public.characters for each row execute function public.limit_characters();

-- 列級安全（RLS）：每個人只能讀寫自己的帳號與角色
alter table public.profiles enable row level security;
alter table public.characters enable row level security;
drop policy if exists "profiles: own row" on public.profiles;
create policy "profiles: own row" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "characters: own rows" on public.characters;
create policy "characters: own rows" on public.characters for all to authenticated using (auth.uid() = owner) with check (auth.uid() = owner);

-- 查詢帳號是否存在、角色名稱是否被用過（只回傳是或否，不會洩漏其他資料）
create or replace function public.account_exists(acc text) returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where lower(account) = lower(acc));
$$;
create or replace function public.name_taken(n text) returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.characters where lower(name) = lower(n));
$$;
grant execute on function public.account_exists(text) to anon, authenticated;
grant execute on function public.name_taken(text) to authenticated;
