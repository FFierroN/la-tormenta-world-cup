-- =====================================================================
-- FIX: DEFINICION DEL EMPATE (alargue / penales) + APLANADO DE FASES
-- =====================================================================
-- Dos cambios de reglamento pedidos por los jugadores (2026-06-28):
--
-- A) NUEVA prediccion "Si hay empate, como se define?" en partidos de
--    ELIMINATORIA (fase final). Ademas del marcador de los 90', el jugador
--    elige Alargue O Penales (excluyentes) y pone el marcador de esa
--    instancia. Puntaje FIJO en toda la copa:
--      +2 si acierta el MODO (alargue/penales) ... y ademas
--      +3 si acierta el MARCADOR exacto de la definicion  -> max +5.
--    Solo suma si el partido REALMENTE se fue a definicion. Si no, +0.
--    Por ahora el marcador real es MANUAL (admin carga penales y/o alargue);
--    mas adelante se vera si se deriva de la API.
--
-- B) APLANADO de fases: el puntaje del marcador deja de escalar por fase.
--    TODA la copa usa la tarifa de Grupos: Exacto unico 6 / x2 5 / x3+ 4 /
--    Diferencia 3 / Acierto 2. (Antes octavos+ valian mas; los jugadores lo
--    encontraban desbalanceado.) NO afecta los 16avos ya jugados (ya usaban
--    esa tarifa); de octavos en adelante baja a la de grupos.
--
-- Idempotente y seguro: NO borra pronosticos ni jugadores. Solo agrega
-- columnas, reescribe funciones/vistas y recrea 2 RPCs (cambian su firma).
-- Requisito previo: haber corrido SNIPPET-nuevo-puntaje.sql (define la firma
-- de calcular_puntos_pronostico con n_exactos y la vista tabla_posiciones) y
-- FIX-tablas-live.sql (tabla_posiciones_live).
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Columnas nuevas.
-- ---------------------------------------------------------------------
-- partidos: marcador REAL del alargue (solo goles del tiempo extra). Los
-- penales ya existen (penales_local/visita/ganador_penales). Manual por admin.
alter table partidos add column if not exists alargue_local  int;
alter table partidos add column if not exists alargue_visita int;

-- pronosticos: la prediccion de definicion del jugador + sus puntos.
alter table pronosticos add column if not exists pred_definicion   text;  -- 'alargue'|'penales'|null
alter table pronosticos add column if not exists pred_def_local    int;
alter table pronosticos add column if not exists pred_def_visita   int;
alter table pronosticos add column if not exists puntos_definicion int not null default 0;

alter table pronosticos drop constraint if exists chk_pred_definicion;
alter table pronosticos add constraint chk_pred_definicion
  check (pred_definicion is null or pred_definicion in ('alargue','penales'));

-- ---------------------------------------------------------------------
-- 2) APLANADO de fases: tarifa unica (la de Grupos) para toda la copa.
--    Se mantiene la firma con n_exactos (la usan vista/trigger/RPC). p_fase
--    queda en la firma por compatibilidad aunque ya no ramifique el puntaje.
-- ---------------------------------------------------------------------
create or replace function calcular_puntos_pronostico(
  pred_local int, pred_visita int, res_local int, res_visita int, p_fase text, n_exactos int
) returns int as $$
declare
  pts_unico int := 6; pts_x2 int := 5; pts_x3 int := 4; pts_dif int := 3; pts_gan int := 2;
begin
  if pred_local is null or pred_visita is null
     or res_local is null or res_visita is null then
    return 0;
  end if;

  if pred_local = res_local and pred_visita = res_visita then
    if    coalesce(n_exactos,1) <= 1 then return pts_unico;
    elsif n_exactos = 2             then return pts_x2;
    else                                return pts_x3;
    end if;
  end if;

  if res_local <> res_visita
     and (res_local - res_visita) = (pred_local - pred_visita) then
    return pts_dif;
  end if;

  if (res_local > res_visita and pred_local > pred_visita)
     or (res_local < res_visita and pred_local < pred_visita)
     or (res_local = res_visita and pred_local = pred_visita) then
    return pts_gan;
  end if;

  return 0;
end;
$$ language plpgsql immutable;

-- ---------------------------------------------------------------------
-- 3) Puntaje de la DEFINICION del empate. Recibe los valores del partido
--    (penales y alargue) para poder usarse inline en las vistas (DRY).
--    Modo real: penales cargados -> 'penales'; si no, alargue cargado ->
--    'alargue'; si no hay ninguno -> el partido no se definio (=> 0).
-- ---------------------------------------------------------------------
create or replace function calcular_puntos_definicion(
  pred_def text, pred_dl int, pred_dv int,
  pen_l int, pen_v int, alg_l int, alg_v int
) returns int as $$
declare modo_real text; rl int; rv int; pts int := 0;
begin
  if pred_def is null then return 0; end if;

  if pen_l is not null and pen_v is not null then
    modo_real := 'penales'; rl := pen_l; rv := pen_v;
  elsif alg_l is not null and alg_v is not null then
    modo_real := 'alargue'; rl := alg_l; rv := alg_v;
  else
    return 0; -- el partido no se fue a definicion
  end if;

  if pred_def = modo_real then
    pts := 2;                                   -- +2 acertar el modo
    if pred_dl = rl and pred_dv = rv then
      pts := pts + 3;                           -- +3 marcador exacto de la definicion
    end if;
  end if;
  return pts;
end;
$$ language plpgsql immutable;

-- ---------------------------------------------------------------------
-- 4) guardar_pronostico: nueva firma con la prediccion de definicion.
--    La definicion SOLO aplica a eliminatoria; en grupos se anula.
-- ---------------------------------------------------------------------
drop function if exists guardar_pronostico(int,int,int,int);
create or replace function guardar_pronostico(
  p_jugador_id int, p_partido_id int, p_local int, p_visita int,
  p_definicion text default null, p_def_local int default null, p_def_visita int default null)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare est text; fch timestamptz; es_grupos boolean;
begin
  if p_local is null or p_visita is null
     or p_local < 0 or p_visita < 0 or p_local > 99 or p_visita > 99 then
    return 'invalido';
  end if;
  select estado, fecha, (grupo is not null) into est, fch, es_grupos
    from partidos where id = p_partido_id;
  if not found then return 'invalido'; end if;
  if est <> 'programado' or fch <= now() then
    return 'cerrado';
  end if;

  -- En grupos no hay definicion de empate: se descarta.
  if es_grupos then
    p_definicion := null; p_def_local := null; p_def_visita := null;
  end if;

  if p_definicion is not null then
    if p_definicion not in ('alargue','penales') then return 'invalido'; end if;
    if p_def_local is null or p_def_visita is null
       or p_def_local < 0 or p_def_visita < 0
       or p_def_local > 99 or p_def_visita > 99 then
      return 'invalido';
    end if;
  end if;

  insert into pronosticos (jugador_id, partido_id, pred_local, pred_visita,
                           pred_definicion, pred_def_local, pred_def_visita)
  values (p_jugador_id, p_partido_id, p_local, p_visita,
          p_definicion, p_def_local, p_def_visita)
  on conflict (jugador_id, partido_id) do update
    set pred_local       = excluded.pred_local,
        pred_visita      = excluded.pred_visita,
        pred_definicion  = excluded.pred_definicion,
        pred_def_local   = excluded.pred_def_local,
        pred_def_visita  = excluded.pred_def_visita,
        updated_at       = now();
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------
-- 5) Trigger: al marcar 'final', recalcula puntos del marcador Y de la
--    definicion del empate.
-- ---------------------------------------------------------------------
create or replace function tg_actualizar_puntos() returns trigger as $$
declare n int;
begin
  if new.estado = 'final'
     and new.goles_local is not null and new.goles_visita is not null then
    select count(*) into n from pronosticos
      where partido_id = new.id
        and pred_local = new.goles_local and pred_visita = new.goles_visita;
    update pronosticos
       set puntos = calcular_puntos_pronostico(
             pred_local, pred_visita, new.goles_local, new.goles_visita, new.fase, n),
           puntos_definicion = calcular_puntos_definicion(
             pred_definicion, pred_def_local, pred_def_visita,
             new.penales_local, new.penales_visita, new.alargue_local, new.alargue_visita),
           updated_at = now()
     where partido_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 6) tabla_posiciones (OFICIAL): suma los puntos de definicion de los
--    partidos FINALES. Resto identico a SNIPPET-nuevo-puntaje.sql.
-- ---------------------------------------------------------------------
create or replace view tabla_posiciones as
with base as (
  select
    j.id   as jugador_id,
    j.nombre, j.alias,
    j.avatar_pos1, j.avatar_medio, j.avatar_pos8,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))),0)
      + coalesce(sum(calcular_puntos_definicion(
          pr.pred_definicion, pr.pred_def_local, pr.pred_def_visita,
          p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita)),0)
      + coalesce(j.ajuste_puntos, 0)
      + coalesce((
          select pe.puntos_pais + pe.puntos_goleador + pe.puntos_asistidor
               + pe.puntos_mejor_jugador + pe.puntos_mejor_arquero + pe.puntos_mejor_joven
          from predicciones_especiales pe where pe.jugador_id = j.id), 0) as puntos,
    count(*) filter (where p.estado='final'
        and pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita) as exactos,
    count(*) filter (where p.estado='final'
        and not (pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita)
        and sign(pr.pred_local-pr.pred_visita)=sign(p.goles_local-p.goles_visita)) as aciertos,
    count(*) filter (where p.estado='final'
        and not (pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita)
        and sign(pr.pred_local-pr.pred_visita)<>sign(p.goles_local-p.goles_visita)) as fallas
  from jugadores j
  left join pronosticos pr on pr.jugador_id = j.id
  left join partidos p on p.id = pr.partido_id
                      and p.estado='final' and p.goles_local is not null
  where j.activo
  group by j.id
)
select *, row_number() over (
    order by puntos desc, exactos desc, aciertos desc, fallas asc, jugador_id asc
  ) as posicion
from base;

-- ---------------------------------------------------------------------
-- 7) tabla_posiciones_live (PROVISIONAL): igual pero incluye partidos en
--    curso. Los puntos de definicion solo apareceran cuando el admin cargue
--    penales/alargue (mientras tanto 0). Resto identico a FIX-tablas-live.sql.
-- ---------------------------------------------------------------------
create or replace view tabla_posiciones_live as
with base as (
  select
    j.id   as jugador_id,
    j.nombre, j.alias,
    j.avatar_pos1, j.avatar_medio, j.avatar_pos8,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))),0)
      + coalesce(sum(calcular_puntos_definicion(
          pr.pred_definicion, pr.pred_def_local, pr.pred_def_visita,
          p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita)),0)
      + coalesce(j.ajuste_puntos, 0)
      + coalesce((
          select pe.puntos_pais + pe.puntos_goleador + pe.puntos_asistidor
               + pe.puntos_mejor_jugador + pe.puntos_mejor_arquero + pe.puntos_mejor_joven
          from predicciones_especiales pe where pe.jugador_id = j.id), 0) as puntos,
    count(*) filter (where
        pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita) as exactos,
    count(*) filter (where
        not (pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita)
        and sign(pr.pred_local-pr.pred_visita)=sign(p.goles_local-p.goles_visita)) as aciertos,
    count(*) filter (where
        not (pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita)
        and sign(pr.pred_local-pr.pred_visita)<>sign(p.goles_local-p.goles_visita)) as fallas
  from jugadores j
  left join pronosticos pr on pr.jugador_id = j.id
  left join partidos p on p.id = pr.partido_id
                      and p.estado in ('en_vivo','entretiempo','alargue','penales','final')
                      and p.goles_local is not null
                      and not p.puntaje_anulado
  where j.activo
  group by j.id
)
select *, row_number() over (
    order by puntos desc, exactos desc, aciertos desc, fallas asc, jugador_id asc
  ) as posicion
from base;

-- ---------------------------------------------------------------------
-- 8) pronosticos_partido: ahora devuelve tambien la prediccion de definicion
--    y sus puntos (para mostrarla en el detalle). Cambia la firma -> drop.
-- ---------------------------------------------------------------------
drop function if exists pronosticos_partido(int,int);
create or replace function pronosticos_partido(p_partido_id int, p_jugador_id int)
returns table(jugador_id int, nombre text, pred_local int, pred_visita int, puntos int,
              pred_definicion text, pred_def_local int, pred_def_visita int, puntos_definicion int)
language sql security definer set search_path = public, extensions as $$
  select pr.jugador_id,
         coalesce(j.alias, j.nombre) as nombre,
         pr.pred_local, pr.pred_visita,
         calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
           p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) as puntos,
         pr.pred_definicion, pr.pred_def_local, pr.pred_def_visita,
         calcular_puntos_definicion(pr.pred_definicion, pr.pred_def_local, pr.pred_def_visita,
           p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita) as puntos_definicion
  from pronosticos pr
  join jugadores j on j.id = pr.jugador_id
  join partidos  p on p.id = pr.partido_id
  where pr.partido_id = p_partido_id
    and (
      exists (select 1 from partidos p2 where p2.id = p_partido_id
              and (p2.estado <> 'programado' or p2.fecha <= now()))
      or pr.jugador_id = p_jugador_id
    )
  order by puntos desc nulls last, nombre;
$$;

-- ---------------------------------------------------------------------
-- 9) Permisos.
-- ---------------------------------------------------------------------
grant execute on function calcular_puntos_definicion(text,int,int,int,int,int,int) to anon, authenticated;
grant execute on function guardar_pronostico(int,int,int,int,text,int,int)         to anon, authenticated;
grant execute on function pronosticos_partido(int,int)                              to anon, authenticated;

-- Verificacion rapida (deben correr sin error):
-- select * from tabla_posiciones order by posicion;
-- select * from pronosticos_partido(1, 1);
