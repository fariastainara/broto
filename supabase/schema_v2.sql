-- Broto v2 — Migração: novas tabelas
-- Rode cada bloco no SQL Editor do Supabase.

-- PERFIS: novos campos já aplicados via ALTER TABLE anteriormente

-- EXERCÍCIOS -------------------------------------------------------------------
create table if not exists exercises (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_type text not null check (exercise_type in ('musculacao','caminhada','corrida','bicicleta','funcional','outro')),
  duration_min integer,
  calories integer,
  notes text,
  logged_at timestamptz not null default now()
);

-- SONO -------------------------------------------------------------------------
create table if not exists sleep_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slept_at timestamptz not null,
  woke_at timestamptz not null,
  notes text,
  logged_date date not null default current_date
);

-- PESO -------------------------------------------------------------------------
create table if not exists weight_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(5,1) not null,
  logged_date date not null default current_date
);

-- HUMOR ------------------------------------------------------------------------
create table if not exists mood_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null check (mood in ('excelente','bom','normal','ruim','pessimo')),
  notes text,
  logged_date date not null default current_date,
  unique (user_id, logged_date)
);

-- HÁBITOS ----------------------------------------------------------------------
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
  logged_date date not null default current_date,
  unique (habit_id, logged_date)
);

-- CURSOS / ESTUDOS -------------------------------------------------------------
create table if not exists courses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  platform text,
  instructor text,
  total_hours numeric(6,1),
  category text,
  status text not null default 'em_andamento' check (status in ('nao_iniciado','em_andamento','concluido','pausado')),
  created_at timestamptz not null default now()
);

create table if not exists course_modules (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0
);

create table if not exists course_lessons (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references course_modules(id) on delete cascade,
  title text not null,
  duration_min integer,
  completed boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

-- TAREFAS: adicionar campos extras ---------------------------------------------
alter table tasks add column if not exists category text default 'outro';
alter table tasks add column if not exists notes text;

-- METAS: adicionar campos extras ------------------------------------------------
alter table goals add column if not exists icon text;
alter table goals add column if not exists color text;
alter table goals add column if not exists progress integer default 0;

-- CONFIGURAÇÕES DO USUÁRIO ------------------------------------------------------
create table if not exists user_settings (
  id uuid primary key references auth.users(id) on delete cascade,
  water_goal_ml integer not null default 2800,
  sleep_goal_hours numeric(3,1) not null default 8,
  theme text not null default 'light' check (theme in ('light','dark')),
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- RLS ---------------------------------------------------------------------------
alter table exercises enable row level security;
alter table sleep_logs enable row level security;
alter table weight_logs enable row level security;
alter table mood_logs enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table courses enable row level security;
alter table course_modules enable row level security;
alter table course_lessons enable row level security;
alter table study_sessions enable row level security;
alter table user_settings enable row level security;

-- Policies (cada usuario acessa somente seus dados)
create policy "exercises: dono" on exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sleep_logs: dono" on sleep_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weight_logs: dono" on weight_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mood_logs: dono" on mood_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits: dono" on habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habit_logs: dono" on habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "courses: dono" on courses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "course_modules: dono" on course_modules for all using (
  exists (select 1 from courses c where c.id = course_modules.course_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from courses c where c.id = course_modules.course_id and c.user_id = auth.uid())
);
create policy "course_lessons: dono" on course_lessons for all using (
  exists (select 1 from course_modules m join courses c on c.id = m.course_id where m.id = course_lessons.module_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from course_modules m join courses c on c.id = m.course_id where m.id = course_lessons.module_id and c.user_id = auth.uid())
);
create policy "study_sessions: dono" on study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings: dono" on user_settings for all using (auth.uid() = id) with check (auth.uid() = id);
