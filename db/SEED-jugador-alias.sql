-- =====================================================================
-- SEED-jugador-alias.sql
-- =====================================================================
-- Mapa curado: TEXTO REAL que escribio cada participante (visto con
-- 'select goleador, asistidor from predicciones_especiales') -> nombre HL.
-- Requiere SETUP-jugador-alias.sql corrido ANTES (usa normaliza_jugador).
--
-- Las llaves son los picks REALES (con typos y variantes): "Kane", "Harry Kane",
-- "Kyliam mbappé", "Messi", "Lionel messi", etc. normaliza_jugador ignora
-- acentos/mayusculas, pero NO typos ni palabras faltantes, por eso van explicitos.
--
-- El 'canonico' es como lo trae HL (ver la lista que dio Felipe). Cuando haya
-- goles reales, verificar contra partido_eventos y ajustar si HL escribe distinto.
--
-- A CONFIRMAR por Felipe (no estaban en la lista original):
--   * id 6 escribio "Ronaldo" (goleador) e "Iniesta" (asistidor). Mapeados a
--     Cristiano Ronaldo / Andrés Iniesta. Si NO juegan el Mundial no sumaran
--     nunca (0 pts) igual. Si prefieres que salgan 'Desconocido', borra esas 2.
--
-- Idempotente (upsert por alias_norm).
-- =====================================================================

insert into jugador_alias (alias_norm, canonico) values
  -- GOLEADORES (pick real -> HL)
  (normaliza_jugador('Harry Kane'),    'H. Kane'),
  (normaliza_jugador('Kane'),          'H. Kane'),
  (normaliza_jugador('Kyliam mbappé'), 'Kylian Mbappé'),
  (normaliza_jugador('Messi'),         'Lionel Messi'),
  (normaliza_jugador('Lionel messi'),  'Lionel Messi'),
  (normaliza_jugador('Ronaldo'),       'Cristiano Ronaldo'),   -- CONFIRMAR
  -- ASISTIDORES (pick real -> HL)
  (normaliza_jugador('Declan Rise'),     'D. Rise'),
  (normaliza_jugador('Bruno Fernandes'), 'Bruno Fernandez'),
  (normaliza_jugador('Vinicius'),        'Vinicius Junior'),
  (normaliza_jugador('Kimich'),          'Joshua Kimmich'),
  (normaliza_jugador('Iniesta'),         'Andrés Iniesta'),     -- CONFIRMAR
  (normaliza_jugador('Olisse'),          'Michael Olise'),
  (normaliza_jugador('Rafael leao'),     'Rafael Leao')
on conflict (alias_norm) do update set canonico = excluded.canonico;

-- =====================================================================
-- VERIFICACION (debe salir todo con nombre, ninguno 'Desconocido' salvo
-- picks que decidas dejar fuera):
--   select jugador_id, goleador, canonico_jugador(goleador) gol,
--          asistidor, canonico_jugador(asistidor) asi
--     from predicciones_especiales order by jugador_id;
-- =====================================================================
