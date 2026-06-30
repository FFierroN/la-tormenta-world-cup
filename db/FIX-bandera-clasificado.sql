-- =====================================================================
-- FIX: BANDERA explicita para el equipo que clasifica (+2 modo+bandera)
-- =====================================================================
-- 2026-06-29 (rev 2). El jugador elige explicito con BANDERA clicable el
-- equipo que cree que clasifica (antes se deducia del marcador).
--
-- Reglas:
--   +2  si aciertas el MODO (alargue/penales) Y el EQUIPO (bandera).
--   +3  ADICIONAL si ademas clavas el MARCADOR exacto.
--   ->  max +5. La COHERENCIA bandera<->marcador la valida la APP.
--
-- ORDEN PARA NO ROMPER VISTAS DEPENDIENTES (ej. desglose_tormenta):
--   1. Crear la funcion NUEVA con firma distinta (8 args) -> convive con la vieja.
--   2. CREATE OR REPLACE las vistas para que usen la nueva (mismas columnas,
--      no se droppean -> dependientes intactas).
--   3. Actualizar trigger (referencia interna).
--   4. Reemplazar RPC pronosticos_partido (drop + create, agrega columna nueva).
--   5. Reemplazar guardar_pronostico (drop + create, nueva firma 8vo arg).
--   6. Solo al final: DROP de la funcion vieja (ya nadie la usa).
--
-- Idempotente. Requisito previo: FIX-definicion-empate.sql (+ FIX-definicion-ganador.sql).
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Columna nueva en pronosticos.
-- ---------------------------------------------------------------------
alter table pronosticos add column if not exists pred_clasificado text;

alter table pronosticos drop constraint if exists chk_pred_clasificado;
alter table pronosticos add constraint chk_pred_clasificado
  check (pred_clasificado is null or pred_clasificado in ('local','visita'));

-- ---------------------------------------------------------------------
-- 2) Funcion NUEVA: firma 8 args (text, text, int, int, int, int, int, int).
--    Coexiste con la vieja (7 args) por tener cantidad distinta de parametros.
-- ---------------------------------------------------------------------
create or replace function calcular_puntos_definicion(
  pred_def text, pred_clas text, pred_dl int, pred_dv int,
  pen_l int, pen_v int, alg_l int, alg_v int
) returns int as $$
declare modo_real text; rl int; rv int; clas_real text; pts int := 0;
begin
  if pred_def is null then return 0; end if;

  if pen_l is not null and pen_v is not null then
    modo_real := 'penales'; rl := pen_l; rv := pen_v;
  elsif alg_l is not null and alg_v is not null then
    modo_real := 'alargue'; rl := alg_l; rv := alg_v;
  else
    return 0;
  end if;

  clas_real := case
                 when rl > rv then 'local'
                 when rv > rl then 'visita'
               end;

  if pred_def = modo_real
     and pred_clas is not null
     and clas_real is not null
     and pred_clas = clas_real then
    pts := 2;
  end if;

  if pred_dl is not null and pred_dv is not null
     and pred_def = modo_real
     and pred_dl = rl and pred_dv = rv then
    pts := pts + 3;
  end if;

  return pts;
end;
$$ language plpgsql immutable;

-- ---------------------------------------------------------------------
-- 3) Vistas: CREATE OR REPLACE (NO drop) -> dependientes intactas.
--    Cambia solo el cuerpo; las columnas son las mismas que ya tenian.
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
          pr.pred_definicion, pr.pred_clasificado, pr.pred_def_local, pr.pred_def_visita,
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
          pr.pred_definicion, pr.pred_clasificado, pr.pred_def_local, pr.pred_def_visita,
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
-- 4) Trigger: ahora llama a la funcion NUEVA (8 args).
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
             pred_definicion, pred_clasificado, pred_def_local, pred_def_visita,
             new.penales_local, new.penales_visita, new.alargue_local, new.alargue_visita),
           updated_at = now()
     where partido_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 5) RPC pronosticos_partido: agrega columna pred_clasificado en el output.
-- ---------------------------------------------------------------------
drop function if exists pronosticos_partido(int,int);
create or replace function pronosticos_partido(p_partido_id int, p_jugador_id int)
returns table(jugador_id int, nombre text, pred_local int, pred_visita int, puntos int,
              pred_definicion text, pred_def_local int, pred_def_visita int,
              puntos_definicion int, pred_clasificado text)
language sql security definer set search_path = public, extensions as $$
  select pr.jugador_id,
         coalesce(j.alias, j.nombre) as nombre,
         pr.pred_local, pr.pred_visita,
         calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
           p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) as puntos,
         pr.pred_definicion, pr.pred_def_local, pr.pred_def_visita,
         calcular_puntos_definicion(pr.pred_definicion, pr.pred_clasificado,
           pr.pred_def_local, pr.pred_def_visita,
           p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita) as puntos_definicion,
         pr.pred_clasificado
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
-- 6) guardar_pronostico: nueva firma con p_clasificado (8vo argumento).
-- ---------------------------------------------------------------------
drop function if exists guardar_pronostico(int,int,int,int,text,int,int);
create or replace function guardar_pronostico(
  p_jugador_id int, p_partido_id int, p_local int, p_visita int,
  p_definicion text default null, p_def_local int default null, p_def_visita int default null,
  p_clasificado text default null)
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

  if es_grupos then
    p_definicion := null; p_def_local := null; p_def_visita := null;
    p_clasificado := null;
  end if;

  if p_definicion is not null then
    if p_definicion not in ('alargue','penales') then return 'invalido'; end if;
    if p_def_local is null or p_def_visita is null
       or p_def_local < 0 or p_def_visita < 0
       or p_def_local > 99 or p_def_visita > 99 then
      return 'invalido';
    end if;
  end if;

  if p_clasificado is not null and p_clasificado not in ('local','visita') then
    return 'invalido';
  end if;

  insert into pronosticos (jugador_id, partido_id, pred_local, pred_visita,
                           pred_definicion, pred_def_local, pred_def_visita,
                           pred_clasificado)
  values (p_jugador_id, p_partido_id, p_local, p_visita,
          p_definicion, p_def_local, p_def_visita, p_clasificado)
  on conflict (jugador_id, partido_id) do update
    set pred_local       = excluded.pred_local,
        pred_visita      = excluded.pred_visita,
        pred_definicion  = excluded.pred_definicion,
        pred_def_local   = excluded.pred_def_local,
        pred_def_visita  = excluded.pred_def_visita,
        pred_clasificado = excluded.pred_clasificado,
        updated_at       = now();
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------
-- 7) AHORA si: dropear la funcion VIEJA (7 args). Ya nadie la usa.
-- ---------------------------------------------------------------------
drop function if exists calcular_puntos_definicion(text,int,int,int,int,int,int);

-- ---------------------------------------------------------------------
-- 8) Permisos sobre las firmas NUEVAS.
-- ---------------------------------------------------------------------
grant execute on function calcular_puntos_definicion(text,text,int,int,int,int,int,int) to anon, authenticated;
grant execute on function guardar_pronostico(int,int,int,int,text,int,int,text)         to anon, authenticated;
grant execute on function pronosticos_partido(int,int)                                   to anon, authenticated;

-- Verificacion rapida:
-- select * from tabla_posiciones order by posicion;
-- select calcular_puntos_definicion('penales','local',4,3, 4,3, null,null);  -- esperado 5
-- select calcular_puntos_definicion('penales','local',4,3, 3,4, null,null);  -- esperado 0 (gana otro)
-- select calcular_puntos_definicion('penales',null,   4,3, 4,3, null,null);  -- esperado 3 (sin bandera, marcador exacto)
