-- PoM · migración inicial (PER-80) para Cloudflare D1 (SQLite).
-- Modelo de datos según "Spec PoM". App de un solo usuario, sin user_id ni login.
--
-- Convenciones:
--   * Instantes: TEXT en ISO 8601 UTC con milisegundos, como devuelve Date#toISOString()
--     (ej. "2026-11-24T17:00:00.000Z"). Se valida el formato exacto porque las
--     comparaciones se hacen como texto, y ese formato ordena bien.
--   * pom_day: TEXT "YYYY-MM-DD", calculado SIEMPRE por la app (src/lib/pom/day.ts).
--   * Nada se borra: un trigger bloquea DELETE en todas las tablas.

-- ---------------------------------------------------------------------------
-- pom_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE pom_sessions (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  sector            TEXT NOT NULL CHECK (sector IN ('estudio', 'personal', 'dbp')),
  sector_suggested  TEXT CHECK (sector_suggested IN ('estudio', 'personal', 'dbp')),
  objective         TEXT NOT NULL CHECK (length(trim(objective)) > 0),
  started_at        TEXT NOT NULL CHECK (length(started_at) = 24 AND strftime('%Y-%m-%dT%H:%M:%fZ', started_at) = started_at),
  ends_at           TEXT NOT NULL CHECK (length(ends_at) = 24 AND strftime('%Y-%m-%dT%H:%M:%fZ', ends_at) = ends_at),
  discarded_at      TEXT,
  rating            INTEGER CHECK (rating BETWEEN 1 AND 5),
  rating_note       TEXT,
  rated_at          TEXT,
  pom_day           TEXT NOT NULL CHECK (date(pom_day) IS pom_day),
  interrupted_at    TEXT,
  interruption_note TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  CHECK (ends_at > started_at),
  -- Descartar: solo en los primeros 2 minutos.
  CHECK (discarded_at IS NULL OR (
    discarded_at >= started_at
    AND julianday(discarded_at) <= julianday(started_at) + 2.0 / 1440
  )),
  -- Interrumpir: antes de ends_at y con observación obligatoria.
  CHECK (interrupted_at IS NULL OR (interrupted_at >= started_at AND interrupted_at < ends_at)),
  CHECK (interrupted_at IS NULL OR length(trim(coalesce(interruption_note, ''))) > 0),
  CHECK (discarded_at IS NULL OR interrupted_at IS NULL),
  -- Descartados e interrumpidos no se valoran con estrellas.
  CHECK (rating IS NULL OR (discarded_at IS NULL AND interrupted_at IS NULL)),
  CHECK ((rating IS NULL) = (rated_at IS NULL))
);

CREATE INDEX pom_sessions_pom_day_idx ON pom_sessions (pom_day);
CREATE INDEX pom_sessions_started_at_idx ON pom_sessions (started_at);

-- Un solo PoM en curso a la vez: el nuevo bloque no puede solaparse con el
-- intervalo efectivo [started_at, descarte|interrupción|ends_at) de otro.
CREATE TRIGGER pom_sessions_no_overlap
BEFORE INSERT ON pom_sessions
WHEN EXISTS (
  SELECT 1 FROM pom_sessions p
  WHERE p.started_at < NEW.ends_at
    AND coalesce(p.discarded_at, p.interrupted_at, p.ends_at) > NEW.started_at
)
BEGIN
  SELECT RAISE(ABORT, 'Ya hay un PoM en curso en ese horario');
END;

-- ---------------------------------------------------------------------------
-- sleep_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE sleep_sessions (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  started_at TEXT NOT NULL CHECK (length(started_at) = 24 AND strftime('%Y-%m-%dT%H:%M:%fZ', started_at) = started_at),
  ended_at   TEXT CHECK (ended_at IS NULL OR (length(ended_at) = 24 AND strftime('%Y-%m-%dT%H:%M:%fZ', ended_at) = ended_at)),
  pom_day    TEXT NOT NULL CHECK (date(pom_day) IS pom_day),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  CHECK (ended_at IS NULL OR ended_at > started_at)
);

-- Solo una sesión de sueño abierta a la vez.
CREATE UNIQUE INDEX sleep_sessions_one_open_idx ON sleep_sessions ((ended_at IS NULL)) WHERE ended_at IS NULL;
CREATE INDEX sleep_sessions_pom_day_idx ON sleep_sessions (pom_day);

-- ---------------------------------------------------------------------------
-- phone_usage
-- ---------------------------------------------------------------------------
CREATE TABLE phone_usage (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  pom_day    TEXT NOT NULL CHECK (date(pom_day) IS pom_day),
  app        TEXT NOT NULL CHECK (length(trim(app)) > 0),
  minutes    INTEGER NOT NULL CHECK (minutes BETWEEN 0 AND 1440),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  UNIQUE (pom_day, app)
);

CREATE TRIGGER phone_usage_touch
AFTER UPDATE OF minutes ON phone_usage
BEGIN
  UPDATE phone_usage SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

-- ---------------------------------------------------------------------------
-- app_settings (fila única, id = 1). Debe coincidir con src/lib/pom/defaults.ts
-- ---------------------------------------------------------------------------
CREATE TABLE app_settings (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  day_start_hour INTEGER NOT NULL DEFAULT 9 CHECK (day_start_hour BETWEEN 0 AND 23),
  pom_minutes    INTEGER NOT NULL DEFAULT 40 CHECK (pom_minutes > 0),
  rest_minutes   INTEGER NOT NULL DEFAULT 10 CHECK (rest_minutes >= 0),
  schedule       TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(schedule)),
  phone_apps     TEXT NOT NULL DEFAULT '["TikTok","X","Chrome","Instagram"]' CHECK (json_valid(phone_apps)),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TRIGGER app_settings_touch
AFTER UPDATE OF day_start_hour, pom_minutes, rest_minutes, schedule, phone_apps ON app_settings
BEGIN
  UPDATE app_settings SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

INSERT INTO app_settings (id, schedule) VALUES (1, json('[
  {"start": "00:00", "end": "02:00", "label": "Estudio / lectura", "sector": "estudio", "pom_count": 2},
  {"start": "02:00", "end": "09:00", "label": "Dormir", "sector": null, "pom_count": null},
  {"start": "09:00", "end": "10:00", "label": "Arranque del día", "sector": null, "pom_count": null},
  {"start": "10:00", "end": "15:00", "label": "Tareas personales", "sector": "personal", "pom_count": 4},
  {"start": "15:00", "end": "22:00", "label": "Driven By People", "sector": "dbp", "pom_count": 8,
   "focus_hints": {"1": "Seguimiento y checklist", "2": "Creación y ajuste", "3": "Creación y ajuste",
                   "4": "Creación y ajuste", "5": "Creación y ajuste", "6": "Creación y ajuste",
                   "7": "Definición", "8": "Cierre"}},
  {"start": "22:00", "end": "24:00", "label": "Libre", "sector": null, "pom_count": null}
]'));

-- ---------------------------------------------------------------------------
-- Nada se borra.
-- ---------------------------------------------------------------------------
CREATE TRIGGER pom_sessions_no_delete BEFORE DELETE ON pom_sessions
BEGIN SELECT RAISE(ABORT, 'Nada se borra: marcar como descartado'); END;

CREATE TRIGGER sleep_sessions_no_delete BEFORE DELETE ON sleep_sessions
BEGIN SELECT RAISE(ABORT, 'Nada se borra'); END;

CREATE TRIGGER phone_usage_no_delete BEFORE DELETE ON phone_usage
BEGIN SELECT RAISE(ABORT, 'Nada se borra'); END;

CREATE TRIGGER app_settings_no_delete BEFORE DELETE ON app_settings
BEGIN SELECT RAISE(ABORT, 'Nada se borra'); END;
