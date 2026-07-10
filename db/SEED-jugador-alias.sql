-- =====================================================================
-- SEED-jugador-alias.sql
-- =====================================================================
-- Mapa curado: pick del participante -> nombre EXACTO como lo trae la API HL
-- (tal cual queda en partido_eventos). Requiere SETUP-jugador-alias.sql.
--
-- IMPORTANTE: la lista la entrego Felipe y ES como HL escribe cada nombre
-- (formato MEZCLADO: algunos abreviados "H. Kane" / "D. Rise", otros completos
-- "Kylian Mbappé" / "Vinicius Junior"). Por eso el canonico = el texto tal cual,
-- SIN abreviar ni expandir. Los acentos/mayusculas igual se ignoran al comparar
-- (normaliza_jugador), pero respetamos la estructura que usa HL.
--
-- En este pool no hubo variantes de escritura entre participantes (cada uno lo
-- escribio como HL lo tiene), asi que el mapa es casi identidad; su unico efecto
-- real es dejar 'No existe' (Daniel Abreu) fuera -> cae en 'Desconocido'.
--
-- Idempotente (upsert por alias_norm).
-- =====================================================================

insert into jugador_alias (alias_norm, canonico) values
  -- GOLEADORES
  (normaliza_jugador('H. Kane'),        'H. Kane'),
  (normaliza_jugador('Kylian Mbappé'),  'Kylian Mbappé'),
  (normaliza_jugador('Lionel Messi'),   'Lionel Messi'),
  -- ASISTIDORES
  (normaliza_jugador('D. Rise'),        'D. Rise'),
  (normaliza_jugador('Vinicius Junior'),'Vinicius Junior'),
  (normaliza_jugador('Bruno Fernandez'),'Bruno Fernandez'),
  (normaliza_jugador('Joshua Kimmich'), 'Joshua Kimmich'),
  (normaliza_jugador('Michael Olise'),  'Michael Olise'),
  (normaliza_jugador('Rafael Leao'),    'Rafael Leao')
on conflict (alias_norm) do update set canonico = excluded.canonico;

-- =====================================================================
-- VERIFICACION (con datos reales, por si HL escribe algo distinto a lo listado):
--   select distinct jugador from partido_eventos
--     where tipo='gol' and coalesce(detalle,'')<>'autogol' order by jugador;
--   select distinct asistencia from partido_eventos
--     where tipo='gol' and asistencia is not null order by asistencia;
--   select jugador_id, canonico_jugador(goleador) gol,
--          canonico_jugador(asistidor) asi from predicciones_especiales;
--   -- Todos con nombre; solo Daniel Abreu -> 'Desconocido'.
-- =====================================================================
