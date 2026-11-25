-- PER-93: poder ocultar la pista de foco sugerido sin borrar las pistas guardadas.
ALTER TABLE app_settings ADD COLUMN show_focus_hints INTEGER NOT NULL DEFAULT 1 CHECK (show_focus_hints IN (0, 1));

-- El trigger de updated_at tiene que incluir la columna nueva.
DROP TRIGGER app_settings_touch;
CREATE TRIGGER app_settings_touch
AFTER UPDATE OF day_start_hour, pom_minutes, rest_minutes, schedule, phone_apps, show_focus_hints ON app_settings
BEGIN
  UPDATE app_settings SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
