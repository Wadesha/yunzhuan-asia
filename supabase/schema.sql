-- ============================================================================
-- peixun 云端 schema for Supabase
-- 在 Supabase Dashboard > SQL Editor 粘贴执行（需项目 owner 权限）
--
-- 设计要点（2026-07-21 定稿）：
--   手机号 = 用户名，不验证。可选 PIN = 实际密码。
--   注册冲突（手机号已存在）由 create_slot 返回 conflict 标志，前端提示。
--   账号体系纯走 slots + SECURITY DEFINER 存储过程，不依赖 Supabase Auth /
--   auth.users / 邮件或短信验证。占坑期读写内部校验 slot_secret。
-- ============================================================================

create extension if not exists pgcrypto;

-- 1) slots：云端账号（用户名=手机号）。slot_secret 是不可猜测的随机串，保护读写
create table if not exists public.slots (
  slot_id    uuid primary key default gen_random_uuid(),
  slot_secret uuid not null default gen_random_uuid(),
  phone      text,
  pin_hash   text,                      -- 可选：crypt() 哈希；空 = 无 PIN（仅靠手机号）
  created_at timestamptz not null default now(),
  unique (phone)
);

-- 2) kv_slot：进度/错题（按 slot_id 归属）
create table if not exists public.kv_slot (
  slot_id    uuid not null references public.slots(slot_id) on delete cascade,
  key        text not null,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (slot_id, key)
);

-- ---------- RLS ----------
alter table public.slots enable row level security;
alter table public.kv_slot enable row level security;
-- 不给 anon/authenticated 任何直接 policy；全部走下面的 SECURITY DEFINER 过程

-- ---------- 存储过程 ----------

-- 注册占坑：手机号已存在 → 返回 conflict（前端弹"该手机号已注册"）
create or replace function public.create_slot(p_phone text, p_pin text default null)
returns table(slot_id uuid, slot_secret uuid, conflict boolean)
language plpgsql security definer as $$
begin
  if exists (select 1 from public.slots s where s.phone = p_phone) then
    slot_id := null; slot_secret := null; conflict := true; return next; return;
  end if;
  insert into public.slots (phone, pin_hash)
    values (p_phone, case when p_pin is null or p_pin = '' then null
                          else crypt(p_pin, gen_salt('bf')) end)
    returning slots.slot_id, slots.slot_secret into slot_id, slot_secret;
  conflict := false; return next;
end;
$$;

-- 登录：手机号 + 可选 PIN，校验后返回凭证
create or replace function public.login_slot(p_phone text, p_pin text default null)
returns table(slot_id uuid, slot_secret uuid, bad_pin boolean, not_found boolean)
language plpgsql security definer as $$
declare v_pin text;
begin
  select s.slot_id, s.slot_secret, s.pin_hash
    into slot_id, slot_secret, v_pin
    from public.slots s where s.phone = p_phone;
  if not found then not_found := true; bad_pin := false; return next; return; end if;
  if v_pin is not null then
    if crypt(p_pin, v_pin) = v_pin then bad_pin := false;
    else bad_pin := true; slot_id := null; slot_secret := null; end if;
  else
    bad_pin := false;
  end if;
  not_found := false; return next;
end;
$$;

-- 占坑期写入（校验 slot_secret）
create or replace function public.kv_slot_set(p_slot_id uuid, p_slot_secret uuid, p_key text, p_value jsonb)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from public.slots s where s.slot_id = p_slot_id and s.slot_secret = p_slot_secret) then
    raise exception 'invalid slot';
  end if;
  insert into public.kv_slot (slot_id, key, value) values (p_slot_id, p_key, p_value)
    on conflict (slot_id, key) do update set value = excluded.value, updated_at = now();
end;
$$;

-- 占坑期读取（校验 slot_secret）
create or replace function public.kv_slot_get(p_slot_id uuid, p_slot_secret uuid)
returns setof public.kv_slot language plpgsql security definer as $$
begin
  if not exists (select 1 from public.slots s where s.slot_id = p_slot_id and s.slot_secret = p_slot_secret) then
    raise exception 'invalid slot';
  end if;
  return query select * from public.kv_slot k where k.slot_id = p_slot_id;
end;
$$;

-- 占坑期删除（校验 slot_secret）
create or replace function public.kv_slot_del(p_slot_id uuid, p_slot_secret uuid, p_key text)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from public.slots s where s.slot_id = p_slot_id and s.slot_secret = p_slot_secret) then
    raise exception 'invalid slot';
  end if;
  delete from public.kv_slot k where k.slot_id = p_slot_id and k.key = p_key;
end;
$$;

-- 授权 anon / authenticated 调用这些过程
grant execute on function public.create_slot(text, text) to anon, authenticated;
grant execute on function public.login_slot(text, text) to anon, authenticated;
grant execute on function public.kv_slot_set(uuid, uuid, text, jsonb) to anon, authenticated;
grant execute on function public.kv_slot_get(uuid, uuid) to anon, authenticated;
grant execute on function public.kv_slot_del(uuid, uuid, text) to anon, authenticated;
