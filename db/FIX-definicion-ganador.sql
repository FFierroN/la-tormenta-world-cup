-- =====================================================================
-- FIX: la DEFINICION del empate exige acertar el EQUIPO que clasifica
-- =====================================================================
-- Ajuste de reglamento (2026-06-28, pedido de Felipe). Antes se daban +2 por
-- solo acertar el MODO (alargue/penales) aunque clasificara el equipo
-- equivocado: injusto. Ahora:
--   +2  SOLO si aciertas el MODO (alargue/penales) Y el EQUIPO que clasifica
--       (el lado con mas goles/penales en tu marcador de la definicion).
--   +3  ADICIONAL si ademas clavas el MARCADOR exacto de la definicion.
--   ->  max +5. Predecir empate en la definicion (lados iguales) no define
--       nada y no suma.
--
-- Solo reemplaza la funcion calcular_puntos_definicion (misma firma), asi que
-- vistas (tabla_posiciones / _live), trigger y RPC la toman al instante sin
-- recrearse. Idempotente. Requisito previo: FIX-definicion-empate.sql.
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- Al terminar, para recalcular partidos YA finalizados con definicion, basta
-- con re-guardar su resultado en el admin (dispara el trigger); las tablas se
-- leen en vivo, asi que el ranking se actualiza solo.
-- =====================================================================

create or replace function calcular_puntos_definicion(
  pred_def text, pred_dl int, pred_dv int,
  pen_l int, pen_v int, alg_l int, alg_v int
) returns int as $$
declare modo_real text; rl int; rv int; pts int := 0;
        gana_pred int; gana_real int;
begin
  if pred_def is null or pred_dl is null or pred_dv is null then return 0; end if;

  if pen_l is not null and pen_v is not null then
    modo_real := 'penales'; rl := pen_l; rv := pen_v;
  elsif alg_l is not null and alg_v is not null then
    modo_real := 'alargue'; rl := alg_l; rv := alg_v;
  else
    return 0; -- el partido no se fue a definicion
  end if;

  gana_pred := sign(pred_dl - pred_dv); -- equipo que el jugador cree que clasifica
  gana_real := sign(rl - rv);           -- equipo que realmente clasifico

  -- +2 SOLO si acierta el MODO (alargue/penales) Y el EQUIPO que clasifica.
  -- (gana_real = 0 => no define; gana_pred = 0 => predijo empate => no suma.)
  if pred_def = modo_real and gana_real <> 0 and gana_pred = gana_real then
    pts := 2;
    if pred_dl = rl and pred_dv = rv then
      pts := pts + 3;                           -- +3 marcador exacto de la definicion
    end if;
  end if;
  return pts;
end;
$$ language plpgsql immutable;

-- Verificacion rapida:
-- select * from tabla_posiciones order by posicion;
