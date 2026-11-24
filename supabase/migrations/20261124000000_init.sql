-- PoM · migración inicial (PER-80)
-- Modelo de datos según "Spec PoM". App de un solo usuario, sin user_id ni login.
-- Todas las fechas son timestamptz. `pom_day` lo calcula la app (src/lib/pom/day.ts),
-- que es el único lugar que decide a qué día PoM pertenece un instante.
-- Nada se borra: no se concede DELETE a los roles de la API.

-- ---------------------------------------------------------------------------
-- pom_sessions
-- ---------------------------------------------------------------------------
create table public.pom_sessions (
  id                uuid primary key default gen_random_uuid(),
  sector            text not null check (sector in ('estudio', 'personal', 'dbp')),
  sector_suggested  text check (sector_suggested in ('estudio', 'personal', 'dbp')),
  objective         text not null check (length(btrim(objective)) > 0),
  started_at        timestamptz not null,
  ends_at           timestamptz not null,
  discarded_at      timestamptz,
  rating            smallint check (rating between 1 and 5),
  rating_note       text,
  rated_at          timestamptz,
  pom_day           date not null,
  interrupted_at    timestamptz,
  interruption_note text,
  created_at        timestamptz not null default now(),

  constraint pom_ends_after_start check (ends_at > started_at),
  -- Descartar: solo en los primeros 2 minutos.
  constraint pom_discard_window check (
    discarded_at is null
    or (discarded_at >= started_at and discarded_at <= started_at + interval '2 minutes')
  ),
  -- Interrumpir: antes de ends_at y con observación obligatoria.
  constraint pom_interrupt_window check (
    interrupted_at is null
    or (interrupted_at >= started_at and interrupted_at < ends_at)
  ),
  constraint pom_interruption_note_required check (
    interrupted_at is null or length(btrim(coalesce(interruption_note, ''))) > 0
  ),
  constraint pom_discard_xor_interrupt check (discarded_at is null or interrupted_at is null),
  -- Descartados e interrumpidos no se valoran con estrellas.
  constraint pom_rating_only_completed check (
    rating is null or (discarded_at is null and interrupted_at is null)
  ),
  constraint pom_rated_at_with_rating check ((rating is null) = (rated_at is null)),
  -- Un solo PoM en curso a la vez: los intervalos efectivos no pueden solaparse.
  constraint pom_no_overlap exclude using gist (
    tstzrange(started_at, coalesce(discarded_at, interrupted_at, ends_at), '[)') with &&
  )
);

create index pom_sessions_pom_day_idx on public.pom_sessions (pom_day);
create index pom_sessions_started_at_idx on public.pom_sessions (started_at desc);

-- ---------------------------------------------------------------------------
-- sleep_sessions
-- ---------------------------------------------------------------------------
create table public.sleep_sessions (
  id         uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  ended_at   timestamptz,
  pom_day    date not null,
  created_at timestamptz not null default now(),

  constraint sleep_ends_after_start check (ended_at is null or ended_at > started_at)
);

-- Solo una sesión de sueño abierta a la vez.
create unique index sleep_sessions_one_open_idx on public.sleep_sessions ((true)) where ended_at is null;
create index sleep_sessions_pom_day_idx on public.sleep_sessions (pom_day);

-- ---------------------------------------------------------------------------
-- phone_usage
-- ---------------------------------------------------------------------------
create table public.phone_usage (
  id         uuid primary key default gen_random_uuid(),
  pom_day    date not null,
  app        text not null check (length(btrim(app)) > 0),
  minutes    integer not null check (minutes >= 0 and minutes <= 1440),
  updated_at timestamptz not null default now(),

  constraint phone_usage_day_app_unique unique (pom_day, app)
);

-- ---------------------------------------------------------------------------
-- app_settings (fila única, id = 1)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id             smallint primary key default 1 check (id = 1),
  day_start_hour smallint not null default 9 check (day_start_hour between 0 and 23),
  pom_minutes    smallint not null default 40 check (pom_minutes > 0),
  rest_minutes   smallint not null default 10 check (rest_minutes >= 0),
  schedule       jsonb not null default '[]'::jsonb,
  phone_apps     jsonb not null default '["TikTok", "X", "Chrome", "Instagram"]'::jsonb,
  updated_at     timestamptz not null default now()
);

-- Debe coincidir con src/lib/pom/defaults.ts
insert into public.app_settings (id, schedule) values (1, '[
  {"start": "00:00", "end": "02:00", "label": "Estudio / lectura", "sector": "estudio", "pom_count": 2},
  {"start": "02:00", "end": "09:00", "label": "Dormir", "sector": null, "pom_count": null},
  {"start": "09:00", "end": "10:00", "label": "Arranque del día", "sector": null, "pom_count": null},
  {"start": "10:00", "end": "15:00", "label": "Tareas personales", "sector": "personal", "pom_count": 4},
  {"start": "15:00", "end": "22:00", "label": "Driven By People", "sector": "dbp", "pom_count": 8,
   "focus_hints": {"1": "Seguimiento y checklist", "2": "Creación y ajuste", "3": "Creación y ajuste",
                   "4": "Creación y ajuste", "5": "Creación y ajuste", "6": "Creación y ajuste",
                   "7": "Definición", "8": "Cierre"}},
  {"start": "22:00", "end": "24:00", "label": "Libre", "sector": null, "pom_count": null}
]'::jsonb);

-- updated_at automático
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger phone_usage_touch before update on public.phone_usage
  for each row execute function public.touch_updated_at();
create trigger app_settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Acceso: sin login en el MVP. RLS activado con políticas abiertas para
-- leer / insertar / actualizar, y sin DELETE (nada se borra).
-- ---------------------------------------------------------------------------
alter table public.pom_sessions   enable row level security;
alter table public.sleep_sessions enable row level security;
alter table public.phone_usage    enable row level security;
alter table public.app_settings   enable row level security;

revoke delete, truncate on public.pom_sessions, public.sleep_sessions, public.phone_usage, public.app_settings
  from anon, authenticated;
revoke insert on public.app_settings from anon, authenticated;

create policy pom_select on public.pom_sessions for select to anon, authenticated using (true);
create policy pom_insert on public.pom_sessions for insert to anon, authenticated with check (true);
create policy pom_update on public.pom_sessions for update to anon, authenticated using (true) with check (true);

create policy sleep_select on public.sleep_sessions for select to anon, authenticated using (true);
create policy sleep_insert on public.sleep_sessions for insert to anon, authenticated with check (true);
create policy sleep_update on public.sleep_sessions for update to anon, authenticated using (true) with check (true);

create policy phone_select on public.phone_usage for select to anon, authenticated using (true);
create policy phone_insert on public.phone_usage for insert to anon, authenticated with check (true);
create policy phone_update on public.phone_usage for update to anon, authenticated using (true) with check (true);

create policy settings_select on public.app_settings for select to anon, authenticated using (true);
create policy settings_update on public.app_settings for update to anon, authenticated using (true) with check (true);
