-- =====================================================================
-- SEED-jugador-alias.sql
-- =====================================================================
-- Mapa curado: lo que escribieron los participantes (goleador/asistidor) ->
-- nombre oficial Highlightly (HL). Requiere haber corrido antes
-- SETUP-jugador-alias.sql (tabla + funciones).
--
-- El 'canonico' DEBE calzar (tras normalizar: minusculas, sin acentos) con el
-- nombre que la API HL escribe en partido_eventos.jugador / .asistencia. Los
-- acentos NO importan (se ignoran), pero la ESTRUCTURA si: "Harry Kane" != "Kane".
-- Si al cargarse goles reales algun goleador no calza, se ajusta aca el canonico.
--
-- Usamos normaliza_jugador() en la clave para no equivocarnos al escribirla.
-- Idempotente (upsert por alias_norm).
--
-- OJO / ASUNCIONES (confirmar con Felipe):
--   * "D. Rise" -> se asume Declan Rice (error de tipeo Rise/Rice). Corregir si
--     era otro jugador.
--   * "No existe" (Daniel Abreu) -> NO se mapea: cae solo en 'Desconocido'.
-- =====================================================================

insert into jugador_alias (alias_norm, canonico) values
  -- GOLEADORES
  (normaliza_jugador('H. Kane'),        'Harry Kane'),
  (normaliza_jugador('Kylian Mbappé'),  'Kylian Mbappé'),
  (normaliza_jugador('Lionel Messi'),   'Lionel Messi'),
  -- ASISTIDORES
  (normaliza_jugador('D. Rise'),        'Declan Rice'),      -- ASUNCION: Rise->Rice
  (normaliza_jugador('Vinicius Junior'),'Vinícius Júnior'),
  (normaliza_jugador('Bruno Fernandez'),'Bruno Fernandes'),
  (normaliza_jugador('Joshua Kimmich'), 'Joshua Kimmich'),
  (normaliza_jugador('Michael Olise'),  'Michael Olise'),
  (normaliza_jugador('Rafael Leao'),    'Rafael Leão')
on conflict (alias_norm) do update set canonico = excluded.canonico;

-- Verificacion:
--   select * from jugador_alias order by canonico;
--   select jugador_id, canonico_jugador(goleador) gol, canonico_jugador(asistidor) asi
--     from predicciones_especiales order by jugador_id;
