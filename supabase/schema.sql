-- Broto — schema do banco de dados (Supabase / Postgres)
-- Rode este script no SQL Editor do seu projeto Supabase.

create extension if not exists "uuid-ossp";

-- PERFIS (opcional, complementa auth.users) ---------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

-- DIÁRIO ALIMENTAR ------------------------------------------------------------
create table if not exists meal_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_type text not null check (meal_type in ('cafe','lanche_manha','almoco','lanche_tarde','jantar','outro')),
  description text not null,
  calories integer,
  logged_at timestamptz not null default now()
);

create table if not exists water_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_ml integer not null,
  logged_at timestamptz not null default now()
);

-- EXERCÍCIOS -------------------------------------------------------------------
create table if not exists exercises (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_type text not null check (exercise_type in ('musculacao','caminhada','corrida','bicicleta','funcional','outro')),
  duration_min integer not null,
  calories integer,
  notes text,
  logged_at timestamptz not null default now()
);

-- SONO ----------------------------------------------------------------------------
create table if not exists sleep_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slept_at timestamptz not null,
  woke_at timestamptz not null,
  logged_date date not null,
  unique (user_id, logged_date)
);

-- PESO -------------------------------------------------------------------------
create table if not exists weight_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(5,1) not null,
  logged_date date not null,
  unique (user_id, logged_date)
);

-- HUMOR ------------------------------------------------------------------------
create table if not exists mood_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null check (mood in ('excelente','bom','normal','ruim','pessimo')),
  logged_date date not null,
  unique (user_id, logged_date)
);

-- HÁBITOS ---------------------------------------------------------------------
create table if not exists habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  icon text,
  created_at timestamptz not null default now()
);

create table if not exists habit_logs (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  unique (habit_id, logged_date)
);

-- CONFIGURAÇÕES DO USUÁRIO (metas de água/sono) --------------------------------
create table if not exists user_settings (
  id uuid primary key references auth.users(id) on delete cascade,
  water_goal_ml integer not null default 2800,
  sleep_goal_hours numeric(3,1) not null default 8
);

-- METAS -----------------------------------------------------------------------
create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text,
  target_date date,
  status text not null default 'ativa' check (status in ('ativa','concluida','pausada')),
  created_at timestamptz not null default now()
);

-- DESAFIOS ----------------------------------------------------------------------
create table if not exists challenges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  target_count integer not null default 21,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists challenge_checkins (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  note text,
  unique (challenge_id, checkin_date)
);

-- TAREFAS -----------------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'outro' check (category in ('casa','trabalho','faculdade','financeiro','saude','outro')),
  due_date date,
  priority text not null default 'media' check (priority in ('baixa','media','alta','urgente')),
  status text not null default 'pendente' check (status in ('pendente','em_andamento','concluida','cancelada')),
  created_at timestamptz not null default now()
);

-- ROW LEVEL SECURITY ------------------------------------------------------------
alter table profiles enable row level security;
alter table meal_logs enable row level security;
alter table water_logs enable row level security;
alter table exercises enable row level security;
alter table sleep_logs enable row level security;
alter table weight_logs enable row level security;
alter table mood_logs enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table user_settings enable row level security;
alter table goals enable row level security;
alter table challenges enable row level security;
alter table challenge_checkins enable row level security;
alter table tasks enable row level security;

-- Cada usuário só acessa os próprios dados.
create policy "profiles: usuário vê e edita o próprio" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "meal_logs: dono" on meal_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "water_logs: dono" on water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "exercises: dono" on exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sleep_logs: dono" on sleep_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "weight_logs: dono" on weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "mood_logs: dono" on mood_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "habits: dono" on habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "habit_logs: dono" on habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_settings: dono" on user_settings
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "goals: dono" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "challenges: dono" on challenges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "challenge_checkins: dono" on challenge_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks: dono" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
