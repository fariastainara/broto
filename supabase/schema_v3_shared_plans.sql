-- Broto v3 — Compartilhamento de plano alimentar
-- Rode no SQL Editor do Supabase.

-- Função para buscar user_id pelo email (busca em auth.users)
create or replace function get_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(lookup_email) limit 1;
$$;

-- Tabela de compartilhamento: quem compartilhou o plano com quem
create table if not exists shared_meal_plans (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_id, shared_with_id)
);

-- RLS
alter table shared_meal_plans enable row level security;

-- O dono pode gerenciar seus compartilhamentos
create policy "shared_meal_plans: owner manages"
  on shared_meal_plans
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Quem recebeu pode ver o compartilhamento
create policy "shared_meal_plans: recipient reads"
  on shared_meal_plans
  for select
  using (auth.uid() = shared_with_id);

-- Quem recebeu um plano compartilhado pode ler as opções do dono
create policy "meal_plan_options: shared read"
  on meal_plan_options
  for select
  using (
    exists (
      select 1 from shared_meal_plans
      where shared_meal_plans.owner_id = meal_plan_options.user_id
        and shared_meal_plans.shared_with_id = auth.uid()
    )
  );

-- Quem recebeu um plano compartilhado pode ver o nome do dono
create policy "profiles: shared plan owner readable"
  on profiles
  for select
  using (
    exists (
      select 1 from shared_meal_plans
      where shared_meal_plans.owner_id = profiles.id
        and shared_meal_plans.shared_with_id = auth.uid()
    )
  );

-- O dono do plano pode ver o perfil de quem recebeu o compartilhamento
create policy "profiles: shared plan recipient readable"
  on profiles
  for select
  using (
    exists (
      select 1 from shared_meal_plans
      where shared_meal_plans.shared_with_id = profiles.id
        and shared_meal_plans.owner_id = auth.uid()
    )
  );

-- Função para buscar email pelo user_id (para exibir nome quando perfil não acessível)
create or replace function get_email_by_user_id(lookup_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  select email from auth.users where id = lookup_id limit 1;
$$;
