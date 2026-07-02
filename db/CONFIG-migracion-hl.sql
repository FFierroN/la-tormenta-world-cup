-- CONFIG-migracion-hl.sql
-- Andamiaje para la migracion a Highlightly (HL) como fuente primaria.
-- SOLO agrega filas de configuracion (idempotente). No toca datos ni el bot.
-- Se puede correr en cualquier momento, incluso con un partido en vivo.

insert into configuracion (clave, valor) values
  -- Minutos entre polls a HL segun la fase (cuota 100/dia). El worker saltea
  -- ciclos del cron de 1 min hasta cumplir este intervalo.
  --   16vos: 5   |  8vos/4tos: 3-4  |  semis/3er/final: 2
  ('hl_intervalo_min', '5'),

  -- Fallback de emergencia: si es 'true', ante 429 (cuota agotada) o caida de HL,
  -- el worker usa worldcup26 SOLO para marcador/estado ese ciclo (modo degradado).
  -- Arranca en 'true' durante la transicion; se puede apagar cuando HL este solido.
  ('fallback_worldcup26', 'true'),

  -- Ancla del ultimo poll a HL (timestamp ISO). La escribe el worker; NO editar
  -- a mano. Vacia = pollear en el proximo ciclo.
  ('hl_ultimo_poll', '')
on conflict (clave) do nothing;

-- Verificacion rapida:
--   select clave, valor from configuracion
--   where clave in ('hl_intervalo_min','fallback_worldcup26','hl_ultimo_poll');
