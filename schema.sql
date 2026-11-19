create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on posts (created_at desc);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  filename text not null,
  url text not null,
  content_type text not null,
  size bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists attachments_post_id_idx on attachments (post_id);

create table if not exists watchlist (
  user_id uuid not null references users(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, code)
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists todos_user_id_idx on todos (user_id, created_at);

create table if not exists memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memos_user_id_idx on memos (user_id, updated_at desc);

create table if not exists ddays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  target_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists ddays_user_id_idx on ddays (user_id, target_date);
