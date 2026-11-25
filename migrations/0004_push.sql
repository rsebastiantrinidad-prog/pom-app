-- PoM · notificaciones push al terminar un bloque (PER-106).
-- Nada se borra: una suscripción vencida se marca con disabled_at.

-- Cuándo se avisó por push que el bloque terminó (evita avisar dos veces).
ALTER TABLE pom_sessions ADD COLUMN notified_at TEXT;

CREATE TABLE push_subscriptions (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  endpoint    TEXT NOT NULL UNIQUE CHECK (endpoint LIKE 'https://%'),
  p256dh      TEXT,
  auth        TEXT,
  user_agent  TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  disabled_at TEXT
);

CREATE TRIGGER push_subscriptions_no_delete BEFORE DELETE ON push_subscriptions
BEGIN SELECT RAISE(ABORT, 'Nada se borra: marcar disabled_at'); END;
