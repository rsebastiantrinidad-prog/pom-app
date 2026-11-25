-- PoM · PER-97: lista de apps del móvil configurable.
--
-- `phone_apps` pasa de una lista de nombres a una lista de objetos
-- {"id", "name", "hidden"}. El id es estable (permite renombrar sabiendo qué
-- app era) y `hidden` oculta la app de la carga diaria sin tocar sus registros
-- en `phone_usage`. Las apps existentes usan su nombre actual como id.

UPDATE app_settings
SET phone_apps = (
  SELECT json_group_array(json_object('id', value, 'name', value, 'hidden', json('false')))
  FROM json_each(app_settings.phone_apps)
  WHERE json_each.type = 'text'
)
WHERE id = 1 AND json_type(phone_apps, '$[0]') = 'text';
