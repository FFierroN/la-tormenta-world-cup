-- =====================================================================
-- SEED-jugador-alias.sql
-- =====================================================================
-- Mapa curado: lo que escribieron los participantes (goleador/asistidor) ->
-- nombre EXACTO como lo trae la API (tal cual queda en partido_eventos). Los
-- acentos/mayusculas NO importan (normaliza_jugador los ignora), pero la
-- ESTRUCTURA si: "H. Kane" != "Harry Kane". Requiere SETUP-jugador-alias.sql.
--
-- FORMATO CONFIRMADO revisando el worker (MIPROYECTO/worker-vivo/src):
--   * GOLEADORES: feed worldcup26 (index.js parsearScorers) -> "Inicial. Apellido"
--     Ej del propio parser: "J. Quiñones", "F. Balogun", "G. Reyna".
--     => canonico de goleador va ABREVIADO: "H. Kane", "K. Mbappé", "L. Messi".
--   * ASISTIDORES: Highlightly (enriquecer.js, ev.assist) -> normalmente nombre
--     COMPLETO. => canonico de asistidor va COMPLETO. (CONFIRMAR con los datos
--     reales, ver query al final; si HL los abrevia, se ajusta aca.)
--
-- Idempotente (upsert por alias_norm).
--
-- ASUNCIONES a confirmar con Felipe:
--   * "D. Rise" -> se asume Declan Rice (typo Rise/Rice).
--   * "No existe" (Daniel Abreu) -> NO se mapea: cae solo en 'Desconocido'.
-- =====================================================================

insert into jugador_alias (alias_norm, canonico) values
  -- GOLEADORES (formato feed: "Inicial. Apellido")
  (normaliza_jugador('H. Kane'),        'H. Kane'),
  (normaliza_jugador('Kylian Mbappé'),  'K. Mbappé'),
  (normaliza_jugador('Lionel Messi'),   'L. Messi'),
  -- ASISTIDORES (Highlightly, nombre completo)
  (normaliza_jugador('D. Rise'),        'Declan Rice'),      -- ASUNCION: Rise->Rice
  (normaliza_jugador('Vinicius Junior'),'Vinícius Júnior'),
  (normaliza_jugador('Bruno Fernandez'),'Bruno Fernandes'),
  (normaliza_jugador('Joshua Kimmich'), 'Joshua Kimmich'),
  (normaliza_jugador('Michael Olise'),  'Michael Olise'),
  (normaliza_jugador('Rafael Leao'),    'Rafael Leão')
on conflict (alias_norm) do update set canonico = excluded.canonico;

-- =====================================================================
-- VERIFICACION (correr con datos reales para AJUSTAR los canonicos):
--   -- Como trae la API los goleadores realmente:
--   select distinct jugador from partido_eventos
--     where tipo='gol' and coalesce(detalle,'')<>'autogol' order by jugador;
--   -- Como trae la API los asistidores realmente:
--   select distinct asistencia from partido_eventos
--     where tipo='gol' and asistencia is not null order by asistencia;
--   -- Como quedan resueltos los picks (deberian NO decir 'Desconocido' salvo
--   -- el de Daniel Abreu):
--   select jugador_id, canonico_jugador(goleador) gol,
--          canonico_jugador(asistidor) asi from predicciones_especiales;
-- =====================================================================
