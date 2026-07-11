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
-- El 'canonico' es como lo trae HL (formato MEZCLADO: abreviado "H. Kane",
-- "F. Balogun", "G. Reyna", "J. Quinones" -sin tilde-; o completo "Erling
-- Haaland", "Casemiro"). CONFIRMADOS contra partido_eventos: "H. Kane".
--
-- OJO RIESGO: HL a veces escribe al MISMO jugador de 2 formas ("E. Haaland" y
-- "Erling Haaland" aparecen ambas). Si eso pasa con un pick, sus goles se parten
-- y puede fallar el liderato. Vigilar y, si ocurre, agregar ambos alias aca.
--
-- PENDIENTE de confirmar (la lista de HL llegaba solo hasta la "K"): el formato
-- de Messi y Mbappe, y el de las asistencias. Ajustar canonico cuando se vea.
--
-- BROMA (id6): escribio "Ronaldo"/"Iniesta" a proposito (no juegan el Mundial).
-- Se mapean a si mismos: NO calzan con el formato HL, asi que dan 0 pts. OK.
--
-- Idempotente (upsert por alias_norm).
-- =====================================================================

insert into jugador_alias (alias_norm, canonico) values
  -- GOLEADORES (pick real -> HL). Confirmados contra partido_eventos:
  (normaliza_jugador('Harry Kane'),    'H. Kane'),        -- HL: "H. Kane" CONFIRMADO
  (normaliza_jugador('Kane'),          'H. Kane'),        -- HL: "H. Kane" CONFIRMADO
  (normaliza_jugador('Kyliam mbappé'), 'Kylian Mbappé'),  -- POR CONFIRMAR formato HL
  (normaliza_jugador('Messi'),         'Lionel Messi'),   -- POR CONFIRMAR formato HL
  (normaliza_jugador('Lionel messi'),  'Lionel Messi'),   -- POR CONFIRMAR formato HL
  (normaliza_jugador('Ronaldo'),       'Ronaldo'),        -- BROMA id6: identidad, no calza con "C. Ronaldo" -> 0 pts
  -- ASISTIDORES (pick real -> HL). POR CONFIRMAR contra partido_eventos.asistencia:
  (normaliza_jugador('Declan Rise'),     'D. Rise'),
  (normaliza_jugador('Bruno Fernandes'), 'Bruno Fernandez'),
  (normaliza_jugador('Vinicius'),        'Vinicius Junior'),
  (normaliza_jugador('Kimich'),          'Joshua Kimmich'),
  (normaliza_jugador('Iniesta'),         'Iniesta'),      -- BROMA id6: identidad -> 0 pts
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
