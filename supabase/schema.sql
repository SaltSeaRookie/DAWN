-- ===== 晨曦大陸 Dawnlands：Supabase 資料庫設定 =====
-- 在 Supabase 的 SQL Editor 貼上全部內容並按 Run（可以重複執行，不會刪掉已經存在的資料）。
--
-- 登入方式：每個瀏覽器先用 Supabase 的「匿名登入」取得身分，
-- 再由下面的 register_account / login_account 函式檢查遊戲帳號與密碼（密碼以 bcrypt 雜湊保存），
-- 登入成功時把帳號與角色轉移到這個瀏覽器的身分上。完全不需要信箱。

create extension if not exists pgcrypto with schema extensions;

-- 帳號資料（一個 Supabase 使用者對應一個遊戲帳號）
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  account text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_account_lower on public.profiles (lower(account));
alter table public.profiles add column if not exists pw_hash text;

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

-- ===== 遊戲帳號的註冊與登入 =====
-- 註冊：為目前的（匿名）身分建立遊戲帳號
create or replace function public.register_account(acc text, pw text) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then return 'no_session'; end if;
  if acc !~ '^[A-Za-z0-9_]{3,16}$' then return 'bad_account'; end if;
  if length(pw) < 4 or length(pw) > 64 then return 'bad_password'; end if;
  if exists (select 1 from public.profiles where lower(account) = lower(acc)) then return 'exists'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then return 'session_in_use'; end if;
  insert into public.profiles (id, account, pw_hash) values (auth.uid(), acc, crypt(pw, gen_salt('bf')));
  return 'ok';
end $$;

-- 登入：檢查密碼，並把帳號與角色轉移到目前的身分（換電腦或換瀏覽器也能登入）
create or replace function public.login_account(acc text, pw text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare p public.profiles%rowtype;
begin
  if auth.uid() is null then return 'no_session'; end if;
  select * into p from public.profiles where lower(account) = lower(acc);
  if not found then return 'noaccount'; end if;
  if p.pw_hash is null or p.pw_hash <> crypt(pw, p.pw_hash) then return 'bad_password'; end if;
  if p.id <> auth.uid() then
    if exists (select 1 from public.profiles where id = auth.uid()) then return 'session_in_use'; end if;
    update public.characters set owner = auth.uid() where owner = p.id;
    update public.profiles set id = auth.uid() where id = p.id;
  end if;
  return 'ok';
end $$;

-- 修改密碼（已登入時）
create or replace function public.change_password(old_pw text, new_pw text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found then return 'noaccount'; end if;
  if p.pw_hash <> crypt(old_pw, p.pw_hash) then return 'bad_password'; end if;
  if length(new_pw) < 4 or length(new_pw) > 64 then return 'bad_new_password'; end if;
  update public.profiles set pw_hash = crypt(new_pw, gen_salt('bf')) where id = p.id;
  return 'ok';
end $$;

revoke all on function public.register_account(text, text) from public, anon;
revoke all on function public.login_account(text, text) from public, anon;
revoke all on function public.change_password(text, text) from public, anon;
grant execute on function public.register_account(text, text) to authenticated;
grant execute on function public.login_account(text, text) to authenticated;
grant execute on function public.change_password(text, text) to authenticated;

-- 帳號資料表的權限：瀏覽器只能讀取帳號名稱與設定，只能修改設定；密碼雜湊完全讀不到
revoke all on public.profiles from anon, authenticated;
grant select (id, account, meta, created_at), update (meta), delete on public.profiles to authenticated;

-- （選用）清理沒有使用的匿名身分：在 SQL Editor 單獨執行下面這行即可
-- delete from auth.users u where u.is_anonymous and not exists (select 1 from public.profiles p where p.id = u.id) and u.created_at < now() - interval '1 day';
