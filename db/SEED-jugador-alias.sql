-- =====================================================================
-- SEED-jugador-alias.sql
-- =====================================================================
-- Mapa curado: TODAS las grafias con que aparece un jugador (el pick del
-- participante Y las variantes con que HL lo escribe en partido_eventos) ->
-- un unico 'canonico'. Requiere SETUP-jugador-alias.sql corrido ANTES.
--
-- POR QUE VARIAS FILAS POR JUGADOR: HL escribe al MISMO futbolista de 2 formas
-- (confirmado en la lista real): abreviada "L. Messi" / "K. Mbappe" (feed gratis
-- en vivo) y completa "Lionel Messi" / "Kylian Mbappé" (Highlightly). Si no las
-- unificamos, sus goles se parten y nadie llega a lider -> 0 pts. Mapeando TODAS
-- las variantes al mismo canonico, resuelve_jugador() las fusiona al contar.
--
-- El 'canonico' se elige = la grafia a la que UNIFICAMOS los eventos
-- (ver FIX-unificar-goleo.sql), para que la tabla de goleo del front tambien
-- calce. Confirmados contra la lista real de partido_eventos:
--   GOLEADORES: "H. Kane" (una sola), "L. Messi"+"Lionel Messi",
--               "K. Mbappe"+"Kylian Mbappé".
--   Ronaldo/Iniesta (id6 broma): identidad, no calzan con "C. Ronaldo" -> 0 pts.
--
-- ASISTIDORES: aun sin ver el 'select distinct asistencia' -> canonicos best-guess
--   (Highlightly suele traer nombre completo). Se agregan variantes por si acaso.
--   AJUSTAR cuando Felipe pase la lista de asistencias reales.
--
-- Idempotente (upsert por alias_norm).
-- =====================================================================

insert into jugador_alias (alias_norm, canonico) values
  -- GOLEADORES ------------------------------------------------------------
  -- Kane (HL: una sola grafia "H. Kane")
  (normaliza_jugador('Harry Kane'),     'H. Kane'),
  (normaliza_jugador('Kane'),           'H. Kane'),
  (normaliza_jugador('H. Kane'),        'H. Kane'),
  -- Messi (HL: DOBLE grafia -> unificar a "Lionel Messi")
  (normaliza_jugador('Messi'),          'Lionel Messi'),
  (normaliza_jugador('Lionel messi'),   'Lionel Messi'),
  (normaliza_jugador('Lionel Messi'),   'Lionel Messi'),
  (normaliza_jugador('L. Messi'),       'Lionel Messi'),
  -- Mbappe (HL: DOBLE grafia -> unificar a "Kylian Mbappé")
  (normaliza_jugador('Kyliam mbappé'),  'Kylian Mbappé'),
  (normaliza_jugador('Kylian Mbappé'),  'Kylian Mbappé'),
  (normaliza_jugador('Mbappe'),         'Kylian Mbappé'),
  (normaliza_jugador('K. Mbappe'),      'Kylian Mbappé'),
  (normaliza_jugador('K. Mbappé'),      'Kylian Mbappé'),
  -- Ronaldo (BROMA id6): identidad, NO mapear "C. Ronaldo" -> 0 pts
  (normaliza_jugador('Ronaldo'),        'Ronaldo'),
  -- ASISTIDORES (best-guess, CONFIRMAR con select distinct asistencia) -------
  (normaliza_jugador('Declan Rise'),     'Declan Rice'),
  (normaliza_jugador('Declan Rice'),     'Declan Rice'),
  (normaliza_jugador('D. Rice'),         'Declan Rice'),
  (normaliza_jugador('Bruno Fernandes'), 'Bruno Fernandes'),
  (normaliza_jugador('Bruno Fernandez'), 'Bruno Fernandes'),
  (normaliza_jugador('B. Fernandes'),    'Bruno Fernandes'),
  (normaliza_jugador('Vinicius'),        'Vinicius Junior'),
  (normaliza_jugador('Vinicius Junior'), 'Vinicius Junior'),
  (normaliza_jugador('Vinicius Jr'),     'Vinicius Junior'),
  (normaliza_jugador('Kimich'),          'Joshua Kimmich'),
  (normaliza_jugador('Joshua Kimmich'),  'Joshua Kimmich'),
  (normaliza_jugador('J. Kimmich'),      'Joshua Kimmich'),
  (normaliza_jugador('Olisse'),          'Michael Olise'),
  (normaliza_jugador('Michael Olise'),   'Michael Olise'),
  (normaliza_jugador('M. Olise'),        'Michael Olise'),
  (normaliza_jugador('Rafael leao'),     'Rafael Leao'),
  (normaliza_jugador('R. Leao'),         'Rafael Leao'),
  -- Iniesta (BROMA id6): identidad -> 0 pts
  (normaliza_jugador('Iniesta'),         'Iniesta')
on conflict (alias_norm) do update set canonico = excluded.canonico;

-- =====================================================================
-- VERIFICACION:
--   select jugador_id, goleador, canonico_jugador(goleador) gol,
--          asistidor, canonico_jugador(asistidor) asi
--     from predicciones_especiales order by jugador_id;
--   -- Y como quedan los picks para MATCHING (deben calzar con los eventos):
--   select distinct resuelve_jugador(goleador) from predicciones_especiales;
-- =====================================================================
