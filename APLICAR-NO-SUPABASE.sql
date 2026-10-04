-- =============================================================================
-- FitTrack - schema completo (as duas migracoes em um arquivo so)
-- Cole tudo no SQL Editor do Supabase e execute uma unica vez.
-- E idempotente: reexecutar nao duplica nada.
-- =============================================================================

-- =============================================================================
-- FitTrack — esquema inicial
-- Tabelas: profiles, exercises, routines, routine_exercises, workouts,
--          workout_sets, body_measurements
-- Todas as tabelas de usuario com Row Level Security: cada usuario acessa
-- apenas os proprios dados. A biblioteca de exercicios tem itens globais
-- (user_id IS NULL), que sao de leitura para todos os autenticados.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.goal_type as enum (
    'hipertrofia', 'forca', 'emagrecimento', 'condicionamento'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.muscle_group as enum (
    'peito', 'costas', 'pernas', 'ombros', 'biceps', 'triceps', 'abdomen', 'gluteos'
  );
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Utilitario: updated_at automatico
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  weight_kg   numeric(5, 2) check (weight_kg is null or (weight_kg > 20 and weight_kg < 400)),
  height_cm   numeric(5, 1) check (height_cm is null or (height_cm > 90 and height_cm < 260)),
  goal        public.goal_type,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o perfil assim que o usuario se cadastra, aproveitando o nome enviado
-- no metadata do signUp.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- exercises  (user_id IS NULL => exercicio global pre-carregado)
-- -----------------------------------------------------------------------------
create table if not exists public.exercises (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete cascade,
  name          text not null check (char_length(trim(name)) between 2 and 80),
  muscle_group  public.muscle_group not null,
  equipment     text not null default 'peso do corpo',
  instructions  text,
  created_at    timestamptz not null default now()
);

create unique index if not exists exercises_global_name_key
  on public.exercises (lower(name)) where user_id is null;
create unique index if not exists exercises_user_name_key
  on public.exercises (user_id, lower(name)) where user_id is not null;
create index if not exists exercises_muscle_group_idx on public.exercises (muscle_group);

-- -----------------------------------------------------------------------------
-- routines
-- -----------------------------------------------------------------------------
create table if not exists public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 60),
  notes       text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists routines_user_idx on public.routines (user_id, position);

drop trigger if exists routines_set_updated_at on public.routines;
create trigger routines_set_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- routine_exercises
-- -----------------------------------------------------------------------------
create table if not exists public.routine_exercises (
  id              uuid primary key default gen_random_uuid(),
  routine_id      uuid not null references public.routines (id) on delete cascade,
  exercise_id     uuid not null references public.exercises (id) on delete restrict,
  position        integer not null default 0,
  target_sets     integer not null default 3 check (target_sets between 1 and 20),
  target_reps_min integer not null default 8 check (target_reps_min between 1 and 100),
  target_reps_max integer not null default 12 check (target_reps_max between 1 and 100),
  rest_seconds    integer not null default 90 check (rest_seconds between 0 and 900),
  notes           text,
  created_at      timestamptz not null default now(),
  constraint routine_exercises_reps_range check (target_reps_max >= target_reps_min)
);

create index if not exists routine_exercises_routine_idx
  on public.routine_exercises (routine_id, position);

-- -----------------------------------------------------------------------------
-- workouts  (uma sessao de treino executada)
-- -----------------------------------------------------------------------------
create table if not exists public.workouts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  routine_id       uuid references public.routines (id) on delete set null,
  name             text not null default 'Treino',
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  notes            text,
  created_at       timestamptz not null default now()
);

create index if not exists workouts_user_started_idx
  on public.workouts (user_id, started_at desc);
create index if not exists workouts_user_finished_idx
  on public.workouts (user_id, finished_at desc) where finished_at is not null;

-- -----------------------------------------------------------------------------
-- workout_sets  (cada serie executada)
-- user_id e desnormalizado de proposito: simplifica a RLS e deixa as consultas
-- de recorde/volume rapidas sem join.
-- -----------------------------------------------------------------------------
create table if not exists public.workout_sets (
  id            uuid primary key default gen_random_uuid(),
  workout_id    uuid not null references public.workouts (id) on delete cascade,
  exercise_id   uuid not null references public.exercises (id) on delete restrict,
  user_id       uuid not null references auth.users (id) on delete cascade,
  set_number    integer not null check (set_number between 1 and 50),
  weight_kg     numeric(6, 2) not null default 0 check (weight_kg >= 0 and weight_kg <= 1000),
  reps          integer not null default 0 check (reps >= 0 and reps <= 500),
  done          boolean not null default true,
  performed_at  timestamptz not null default now(),
  unique (workout_id, exercise_id, set_number)
);

create index if not exists workout_sets_user_exercise_idx
  on public.workout_sets (user_id, exercise_id, performed_at desc);
create index if not exists workout_sets_workout_idx
  on public.workout_sets (workout_id);

-- -----------------------------------------------------------------------------
-- body_measurements
-- -----------------------------------------------------------------------------
create table if not exists public.body_measurements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  measured_on  date not null default current_date,
  weight_kg    numeric(5, 2) check (weight_kg is null or (weight_kg > 20 and weight_kg < 400)),
  chest_cm     numeric(5, 1) check (chest_cm is null or (chest_cm > 30 and chest_cm < 250)),
  waist_cm     numeric(5, 1) check (waist_cm is null or (waist_cm > 30 and waist_cm < 250)),
  arm_cm       numeric(5, 1) check (arm_cm is null or (arm_cm > 10 and arm_cm < 120)),
  thigh_cm     numeric(5, 1) check (thigh_cm is null or (thigh_cm > 20 and thigh_cm < 150)),
  notes        text,
  created_at   timestamptz not null default now(),
  unique (user_id, measured_on)
);

create index if not exists body_measurements_user_date_idx
  on public.body_measurements (user_id, measured_on desc);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles           enable row level security;
alter table public.exercises          enable row level security;
alter table public.routines           enable row level security;
alter table public.routine_exercises  enable row level security;
alter table public.workouts           enable row level security;
alter table public.workout_sets       enable row level security;
alter table public.body_measurements  enable row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using (id = auth.uid());

-- exercises ------------------------------------------------------------------
-- Leitura: biblioteca global + exercicios personalizados do proprio usuario.
drop policy if exists "exercises_select_global_or_own" on public.exercises;
create policy "exercises_select_global_or_own" on public.exercises
  for select to authenticated using (user_id is null or user_id = auth.uid());

-- Escrita: somente exercicios personalizados do proprio usuario.
drop policy if exists "exercises_insert_own" on public.exercises;
create policy "exercises_insert_own" on public.exercises
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "exercises_update_own" on public.exercises;
create policy "exercises_update_own" on public.exercises
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "exercises_delete_own" on public.exercises;
create policy "exercises_delete_own" on public.exercises
  for delete to authenticated using (user_id = auth.uid());

-- routines -------------------------------------------------------------------
drop policy if exists "routines_all_own" on public.routines;
create policy "routines_all_own" on public.routines
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- routine_exercises ----------------------------------------------------------
drop policy if exists "routine_exercises_all_own" on public.routine_exercises;
create policy "routine_exercises_all_own" on public.routine_exercises
  for all to authenticated
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.user_id = auth.uid()
    )
  );

-- workouts -------------------------------------------------------------------
drop policy if exists "workouts_all_own" on public.workouts;
create policy "workouts_all_own" on public.workouts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- workout_sets ---------------------------------------------------------------
drop policy if exists "workout_sets_all_own" on public.workout_sets;
create policy "workout_sets_all_own" on public.workout_sets
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workouts w
      where w.id = workout_sets.workout_id and w.user_id = auth.uid()
    )
  );

-- body_measurements ----------------------------------------------------------
drop policy if exists "body_measurements_all_own" on public.body_measurements;
create policy "body_measurements_all_own" on public.body_measurements
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =============================================================================
-- Views e funcoes de leitura
-- security_invoker = true faz a view respeitar a RLS de quem consulta.
-- =============================================================================

-- Recorde pessoal por exercicio: a serie de maior carga e a primeira data em
-- que ela foi atingida.
create or replace view public.personal_records
with (security_invoker = true) as
select distinct on (ws.user_id, ws.exercise_id)
  ws.user_id,
  ws.exercise_id,
  ws.weight_kg,
  ws.reps,
  ws.performed_at
from public.workout_sets ws
where ws.done and ws.weight_kg > 0
order by ws.user_id, ws.exercise_id, ws.weight_kg desc, ws.reps desc, ws.performed_at asc;

-- Series do ultimo treino concluido de cada exercicio (referencia de carga na
-- tela de treino ativo).
create or replace function public.last_sets_for_exercises(p_exercise_ids uuid[])
returns table (
  exercise_id  uuid,
  set_number   integer,
  weight_kg    numeric,
  reps         integer,
  performed_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with ultimo as (
    select ws.exercise_id as ex_id, max(w.started_at) as last_start
    from public.workout_sets ws
    join public.workouts w on w.id = ws.workout_id
    where ws.user_id = auth.uid()
      and ws.exercise_id = any (p_exercise_ids)
      and ws.done
      and w.finished_at is not null
    group by ws.exercise_id
  )
  select ws.exercise_id, ws.set_number, ws.weight_kg, ws.reps, ws.performed_at
  from public.workout_sets ws
  join public.workouts w on w.id = ws.workout_id
  join ultimo u on u.ex_id = ws.exercise_id and w.started_at = u.last_start
  where ws.user_id = auth.uid() and ws.done
  order by ws.exercise_id, ws.set_number;
$$;

-- Volume e frequencia semanais dos ultimos N domingos-a-sabado.
create or replace function public.weekly_stats(p_weeks integer default 12)
returns table (
  week_start      date,
  volume_kg       numeric,
  sets_count      bigint,
  reps_count      bigint,
  workouts_count  bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with semanas as (
    select generate_series(
      date_trunc('week', current_date)::date - ((greatest(p_weeks, 1) - 1) * 7),
      date_trunc('week', current_date)::date,
      interval '7 days'
    )::date as week_start
  ),
  series as (
    select
      date_trunc('week', ws.performed_at)::date as week_start,
      sum(ws.weight_kg * ws.reps) as volume_kg,
      count(*) as sets_count,
      sum(ws.reps) as reps_count
    from public.workout_sets ws
    where ws.user_id = auth.uid() and ws.done
    group by 1
  ),
  sessoes as (
    select
      date_trunc('week', w.started_at)::date as week_start,
      count(*) as workouts_count
    from public.workouts w
    where w.user_id = auth.uid() and w.finished_at is not null
    group by 1
  )
  select
    s.week_start,
    coalesce(se.volume_kg, 0) as volume_kg,
    coalesce(se.sets_count, 0) as sets_count,
    coalesce(se.reps_count, 0) as reps_count,
    coalesce(so.workouts_count, 0) as workouts_count
  from semanas s
  left join series se on se.week_start = s.week_start
  left join sessoes so on so.week_start = s.week_start
  order by s.week_start;
$$;

-- Evolucao de carga de um exercicio: melhor serie de cada treino.
create or replace function public.exercise_progress(p_exercise_id uuid)
returns table (
  performed_on  date,
  best_weight   numeric,
  best_reps     integer,
  volume_kg     numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with por_treino as (
    select
      ws.workout_id,
      max(ws.performed_at)::date as performed_on,
      max(ws.weight_kg) as best_weight,
      sum(ws.weight_kg * ws.reps) as volume_kg
    from public.workout_sets ws
    where ws.user_id = auth.uid() and ws.exercise_id = p_exercise_id and ws.done
    group by ws.workout_id
  )
  select
    pt.performed_on,
    pt.best_weight,
    (
      select max(ws2.reps)
      from public.workout_sets ws2
      where ws2.workout_id = pt.workout_id
        and ws2.exercise_id = p_exercise_id
        and ws2.weight_kg = pt.best_weight
        and ws2.done
    ) as best_reps,
    pt.volume_kg
  from por_treino pt
  order by pt.performed_on;
$$;

grant execute on function public.last_sets_for_exercises(uuid[]) to authenticated;
grant execute on function public.weekly_stats(integer) to authenticated;
grant execute on function public.exercise_progress(uuid) to authenticated;


-- =============================================================================
-- FitTrack — biblioteca de exercícios pré-carregada (78 exercícios globais)
-- user_id IS NULL => visível para todos os usuários autenticados, somente leitura.
-- A migração é idempotente: reexecutar não duplica nem sobrescreve nada.
-- =============================================================================

with novos (name, muscle_group, equipment, instructions) as (
  values
  -- ------------------------------------------------------------------- PEITO
  ('Supino reto com barra', 'peito', 'barra', 'Deite no banco com os pés firmes no chão. Desça a barra até a linha do mamilo controlando o movimento e empurre até estender os braços sem travar os cotovelos.'),
  ('Supino inclinado com barra', 'peito', 'barra', 'Banco a 30-45°. Desça a barra até a parte alta do peito e empurre para cima. Ênfase na porção superior do peitoral.'),
  ('Supino declinado com barra', 'peito', 'barra', 'Banco declinado a 15-30°. Desça a barra até a parte baixa do peito. Ênfase na porção inferior do peitoral.'),
  ('Supino reto com halteres', 'peito', 'halteres', 'Halteres na altura do peito, palmas para frente. Empurre unindo os halteres no topo sem batê-los. Maior amplitude que a barra.'),
  ('Supino inclinado com halteres', 'peito', 'halteres', 'Banco a 30-45°. Desça os halteres ao lado do peito e empurre para cima e para dentro.'),
  ('Crucifixo com halteres', 'peito', 'halteres', 'Deitado, braços abertos com leve flexão fixa nos cotovelos. Abra até sentir alongar o peito e feche como se abraçasse.'),
  ('Crossover na polia', 'peito', 'polia', 'Em pé, um pé à frente, polias altas. Traga as mãos para frente e para baixo cruzando levemente. Mantenha o tronco firme.'),
  ('Voador na máquina (peck deck)', 'peito', 'máquina', 'Costas apoiadas, antebraços nas almofadas. Una os braços à frente e volte devagar controlando a abertura.'),
  ('Flexão de braço', 'peito', 'peso do corpo', 'Mãos na largura dos ombros, corpo alinhado. Desça até o peito quase tocar o chão mantendo o abdômen contraído.'),
  ('Mergulho em paralelas', 'peito', 'peso do corpo', 'Tronco inclinado à frente nas paralelas. Desça até sentir alongar o peito e suba estendendo os braços.'),

  -- ------------------------------------------------------------------ COSTAS
  ('Barra fixa pronada', 'costas', 'barra fixa', 'Pegada pronada mais larga que os ombros. Puxe levando o peito à barra e desça controlado até estender os braços.'),
  ('Barra fixa supinada', 'costas', 'barra fixa', 'Pegada supinada na largura dos ombros. Puxe o corpo para cima; recruta mais bíceps que a versão pronada.'),
  ('Puxada frontal na polia alta', 'costas', 'polia', 'Sentado, pegada aberta pronada. Puxe a barra até a parte alta do peito projetando o peito à frente, sem jogar o tronco para trás.'),
  ('Puxada supinada na polia alta', 'costas', 'polia', 'Pegada supinada na largura dos ombros. Puxe a barra até o peito mantendo os cotovelos próximos ao corpo.'),
  ('Remada curvada com barra', 'costas', 'barra', 'Tronco inclinado a 45°, coluna neutra. Puxe a barra em direção ao umbigo e desça controlando. Não arredonde as costas.'),
  ('Remada unilateral com halter', 'costas', 'halteres', 'Apoie uma mão e um joelho no banco. Puxe o halter em direção ao quadril mantendo o tronco estável.'),
  ('Remada baixa na polia', 'costas', 'polia', 'Sentado com pés apoiados, coluna neutra. Puxe o triângulo até o abdômen juntando as escápulas.'),
  ('Remada cavalinho', 'costas', 'barra', 'Tronco inclinado sobre a barra em T. Puxe em direção ao abdômen e desça controlado.'),
  ('Pulldown com braços estendidos', 'costas', 'polia', 'Em pé, braços estendidos na barra alta. Empurre a barra até as coxas sem flexionar os cotovelos. Isola o dorsal.'),
  ('Remada na máquina articulada', 'costas', 'máquina', 'Peito apoiado no suporte. Puxe os pegadores em direção ao tronco juntando as escápulas.'),
  ('Levantamento terra', 'costas', 'barra', 'Pés na largura do quadril, barra junto às canelas. Suba estendendo quadril e joelhos juntos, coluna neutra do início ao fim.'),
  ('Encolhimento de ombros com barra', 'costas', 'barra', 'Em pé segurando a barra à frente. Eleve os ombros em direção às orelhas e desça devagar. Sem rotacionar os ombros.'),

  -- ----------------------------------------------------------------- PERNAS
  ('Agachamento livre com barra', 'pernas', 'barra', 'Barra nos trapézios, pés na largura dos ombros. Desça até a coxa ficar paralela ao chão mantendo os joelhos alinhados aos pés.'),
  ('Agachamento frontal', 'pernas', 'barra', 'Barra apoiada nos deltoides anteriores, cotovelos altos. Desça mantendo o tronco o mais vertical possível.'),
  ('Leg press 45 graus', 'pernas', 'máquina', 'Pés na plataforma na largura dos ombros. Desça até cerca de 90° de flexão do joelho sem descolar o quadril do apoio.'),
  ('Agachamento no hack machine', 'pernas', 'máquina', 'Costas apoiadas no equipamento. Desça controlando até os joelhos formarem 90° e empurre com os pés.'),
  ('Cadeira extensora', 'pernas', 'máquina', 'Sentado com o rolo acima dos tornozelos. Estenda os joelhos até quase travar e volte devagar.'),
  ('Mesa flexora', 'pernas', 'máquina', 'Deitado de bruços, rolo acima dos tornozelos. Flexione os joelhos levando os pés ao glúteo e desça controlado.'),
  ('Cadeira flexora', 'pernas', 'máquina', 'Sentado, rolo na parte de trás das pernas. Flexione os joelhos puxando o rolo para baixo e para trás.'),
  ('Afundo com halteres', 'pernas', 'halteres', 'Um passo à frente, desça até o joelho de trás quase tocar o chão. Mantenha o tronco ereto e volte à posição inicial.'),
  ('Passada com halteres', 'pernas', 'halteres', 'Caminhe alternando passadas longas, descendo o joelho de trás em direção ao chão a cada passo.'),
  ('Stiff com barra', 'pernas', 'barra', 'Joelhos levemente flexionados. Desça a barra junto às pernas empurrando o quadril para trás até sentir alongar o posterior.'),
  ('Agachamento búlgaro', 'pernas', 'halteres', 'Pé de trás apoiado no banco. Desça flexionando a perna da frente até 90° mantendo o tronco estável.'),
  ('Agachamento sumô com halter', 'pernas', 'halteres', 'Pés bem afastados e pontas para fora, halter entre as pernas. Desça mantendo os joelhos alinhados com os pés.'),
  ('Panturrilha em pé no smith', 'pernas', 'smith', 'Pontas dos pés em um step, barra nos ombros. Suba na ponta dos pés ao máximo e desça alongando a panturrilha.'),
  ('Panturrilha sentado', 'pernas', 'máquina', 'Sentado com as pontas dos pés na plataforma. Eleve os calcanhares ao máximo e desça devagar buscando amplitude total.'),

  -- ----------------------------------------------------------------- OMBROS
  ('Desenvolvimento militar com barra', 'ombros', 'barra', 'Em pé, barra na altura das clavículas. Empurre acima da cabeça sem arquear a lombar e desça controlado.'),
  ('Desenvolvimento com halteres', 'ombros', 'halteres', 'Sentado com apoio nas costas. Empurre os halteres acima da cabeça e desça até a altura das orelhas.'),
  ('Desenvolvimento Arnold', 'ombros', 'halteres', 'Comece com as palmas voltadas para você e rotacione os punhos enquanto empurra acima da cabeça.'),
  ('Elevação lateral com halteres', 'ombros', 'halteres', 'Em pé, braços ao lado do corpo com leve flexão. Eleve até a altura dos ombros liderando com os cotovelos.'),
  ('Elevação frontal com halteres', 'ombros', 'halteres', 'Eleve os halteres à frente até a altura dos ombros, alternando ou juntos. Evite balançar o tronco.'),
  ('Elevação lateral na polia', 'ombros', 'polia', 'Polia baixa cruzada à frente do corpo. Eleve o braço lateralmente até a altura do ombro com tensão constante.'),
  ('Crucifixo inverso na máquina', 'ombros', 'máquina', 'Peito apoiado, braços à frente. Abra os braços para trás contraindo o deltoide posterior.'),
  ('Remada alta com barra', 'ombros', 'barra', 'Pegada pronada média. Puxe a barra até a altura do peito com os cotovelos acima dos punhos.'),
  ('Face pull na polia', 'ombros', 'polia', 'Polia na altura do rosto com corda. Puxe em direção à testa abrindo os cotovelos para fora.'),

  -- ----------------------------------------------------------------- BÍCEPS
  ('Rosca direta com barra', 'biceps', 'barra', 'Em pé, pegada supinada na largura dos ombros. Flexione os cotovelos sem mover os ombros e desça controlando.'),
  ('Rosca alternada com halteres', 'biceps', 'halteres', 'Em pé ou sentado. Flexione um braço por vez girando o punho para fora no topo do movimento.'),
  ('Rosca martelo', 'biceps', 'halteres', 'Pegada neutra (palmas voltadas para dentro). Flexione os cotovelos mantendo os punhos firmes.'),
  ('Rosca no banco Scott', 'biceps', 'barra', 'Braços apoiados no banco inclinado. Flexione os cotovelos em amplitude total sem descolar os braços do apoio.'),
  ('Rosca concentrada', 'biceps', 'halteres', 'Sentado, cotovelo apoiado na coxa interna. Flexione o braço lentamente até a contração máxima.'),
  ('Rosca na polia baixa', 'biceps', 'polia', 'Em pé de frente para a polia baixa. Flexione os cotovelos mantendo tensão constante na subida e na descida.'),
  ('Rosca inversa com barra', 'biceps', 'barra', 'Pegada pronada. Flexione os cotovelos trabalhando braquial e antebraço. Use carga menor que na rosca direta.'),
  ('Rosca inclinada com halteres', 'biceps', 'halteres', 'Banco a 45°, braços pendendo atrás do corpo. Flexione os cotovelos a partir do alongamento máximo do bíceps.'),

  -- ---------------------------------------------------------------- TRÍCEPS
  ('Tríceps na polia com barra reta', 'triceps', 'polia', 'Em pé de frente para a polia alta. Estenda os cotovelos mantendo-os junto ao corpo e volte controlado.'),
  ('Tríceps na polia com corda', 'triceps', 'polia', 'Estenda os cotovelos abrindo as pontas da corda no final do movimento para máxima contração.'),
  ('Tríceps testa com barra EZ', 'triceps', 'barra', 'Deitado no banco, barra acima da testa. Flexione só os cotovelos descendo a barra e estenda sem mover os ombros.'),
  ('Tríceps francês com halter', 'triceps', 'halteres', 'Sentado, halter acima da cabeça com as duas mãos. Desça atrás da cabeça e estenda os cotovelos.'),
  ('Tríceps coice com halter', 'triceps', 'halteres', 'Tronco inclinado, braço colado ao corpo. Estenda o cotovelo até o braço ficar reto e volte devagar.'),
  ('Mergulho no banco', 'triceps', 'peso do corpo', 'Mãos na borda do banco atrás do corpo. Desça flexionando os cotovelos a 90° e empurre para cima.'),
  ('Supino com pegada fechada', 'triceps', 'barra', 'Pegada na largura dos ombros. Desça a barra ao peito com os cotovelos próximos ao tronco e empurre.'),
  ('Tríceps na máquina', 'triceps', 'máquina', 'Sentado no equipamento. Estenda os cotovelos contra a resistência e retorne controlando a carga.'),

  -- ---------------------------------------------------------------- ABDÔMEN
  ('Abdominal crunch no solo', 'abdomen', 'peso do corpo', 'Deitado, joelhos flexionados. Eleve o tronco contraindo o abdômen sem puxar a cabeça com as mãos.'),
  ('Elevação de pernas no solo', 'abdomen', 'peso do corpo', 'Deitado, pernas estendidas. Eleve as pernas até 90° e desça sem tocar o chão, mantendo a lombar apoiada.'),
  ('Prancha isométrica', 'abdomen', 'peso do corpo', 'Apoie antebraços e pontas dos pés. Mantenha corpo alinhado e abdômen contraído pelo tempo determinado.'),
  ('Prancha lateral', 'abdomen', 'peso do corpo', 'Apoiado em um antebraço e na lateral do pé. Eleve o quadril e mantenha a linha do corpo.'),
  ('Abdominal na polia alta', 'abdomen', 'polia', 'Ajoelhado de costas para a polia, corda junto à cabeça. Flexione o tronco contraindo o abdômen.'),
  ('Elevação de pernas na barra fixa', 'abdomen', 'barra fixa', 'Pendurado na barra. Eleve as pernas estendidas ou os joelhos até a altura do quadril sem balançar.'),
  ('Abdominal bicicleta', 'abdomen', 'peso do corpo', 'Deitado, alterne levando o cotovelo ao joelho oposto em movimento contínuo e controlado.'),
  ('Rotação russa com anilha', 'abdomen', 'anilha', 'Sentado com o tronco inclinado para trás. Gire o tronco levando a anilha de um lado ao outro.'),
  ('Roda abdominal', 'abdomen', 'roda abdominal', 'Ajoelhado, role a roda à frente mantendo a lombar neutra e volte contraindo o abdômen.'),

  -- --------------------------------------------------------------- GLÚTEOS
  ('Elevação pélvica com barra', 'gluteos', 'barra', 'Costas apoiadas no banco, barra sobre o quadril. Eleve o quadril até alinhar tronco e coxas contraindo os glúteos no topo.'),
  ('Ponte de glúteo no solo', 'gluteos', 'peso do corpo', 'Deitado com os joelhos flexionados. Eleve o quadril contraindo os glúteos e desça sem relaxar totalmente.'),
  ('Coice de glúteo na máquina', 'gluteos', 'máquina', 'Apoiado no equipamento. Estenda o quadril para trás contraindo o glúteo e retorne controlado.'),
  ('Coice de glúteo na polia', 'gluteos', 'polia', 'Tornozeleira na polia baixa. Estenda o quadril para trás mantendo o tronco firme e o joelho estável.'),
  ('Cadeira abdutora', 'gluteos', 'máquina', 'Sentado com as almofadas na parte externa das coxas. Abra as pernas contra a resistência e volte devagar.'),
  ('Agachamento sumô com barra', 'gluteos', 'barra', 'Pés bem afastados e pontas para fora. Desça mantendo o tronco ereto; ênfase em glúteos e adutores.'),
  ('Levantamento terra romeno com halteres', 'gluteos', 'halteres', 'Empurre o quadril para trás descendo os halteres junto às pernas. Suba contraindo os glúteos.'),
  ('Afundo reverso com barra', 'gluteos', 'barra', 'Dê um passo para trás e desça até o joelho quase tocar o chão. Suba empurrando com a perna da frente.'),
  ('Step-up no banco', 'gluteos', 'halteres', 'Suba no banco com uma perna por vez empurrando com o glúteo, sem impulso da perna de trás.')
)
insert into public.exercises (user_id, name, muscle_group, equipment, instructions)
select null, n.name, n.muscle_group::public.muscle_group, n.equipment, n.instructions
from novos n
where not exists (
  select 1 from public.exercises e
  where e.user_id is null and lower(e.name) = lower(n.name)
);
