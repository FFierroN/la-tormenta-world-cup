-- =====================================================================
-- FIX-definicion-tier-compartido.sql
--   Reparte el bonus por MARCADOR EXACTO de la definicion (alargue/penales)
--   igual que en los partidos normales: mientras mas gente lo clave, menos
--   vale. Antes era FIJO +3. Ahora:
--
--     Modo + equipo que clasifica (sin marcador)  ................  +2  (FIJO)
--     + marcador exacto de la definicion, UNICO (solo 1 lo clavo)  +3  -> total +5
--     + marcador exacto de la definicion, x2   (2 lo clavaron)     +2  -> total +4
--     + marcador exacto de la definicion, x3+  (3 o mas)           +1  -> total +3
--
--   El +2 de modo+bandera NO se reparte (igual que la Diferencia/Acierto de
--   un partido normal tampoco escalan). Solo escala el bonus del EXACTO.
--
-- REQUISITO PREVIO: FIX-bandera-clasificado.sql y FIX-excluir-anulados.sql
--   (este script recrea las vistas y funciones que dejaron aquellos).
--
-- ORDEN PARA NO ROMPER VISTAS DEPENDIENTES (mismo patron del repo):
--   1. Helper contar_exactos_definicion(partido) -> cuantos clavaron el
--      marcador exacto de la definicion en ese partido (define el tier).
--   2. Funcion NUEVA calcular_puntos_definicion con 9 args (agrega
--      n_exactos_def) -> convive con la vieja de 8 args.
--   3. CREATE OR REPLACE de las vistas (tabla_posiciones,
--      tabla_posiciones_live) pasando el nuevo arg -> dependientes intactas.
--   4. Trigger + RPC pronosticos_partido -> usan la nueva firma.
--   5. Solo al final: DROP de la funcion vieja (8 args). Grants.
--
-- Idempotente. Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Helper: cuantos clavaron el MARCADOR EXACTO de la definicion.
--    "Mismo pronostico" = mismo modo real (penales/alargue) y mismo
--    marcador de esa instancia. Es el analogo de contar_exactos() para la
--    definicion del empate.
-- ---------------------------------------------------------------------
create or replace function contar_exactos_definicion(p_partido_id int)
returns int language sql stable security definer set search_path = public, extensions as $$
  with real as (
    select
      case
        when penales_local is not null and penales_visita is not null then 'penales'
        when alargue_local is not null and alargue_visita is not null then 'alargue'
      end as modo_real,
      case
        when penales_local is not null and penales_visita is not null then penales_local
        when alargue_local is not null and alargue_visita is not null then alargue_local
      end as rl,
      case
        when penales_local is not null and penales_visita is not null then penales_visita
        when alargue_local is not null and alargue_visita is not null then alargue_visita
      end as rv
    from partidos where id = p_partido_id
  )
  select count(*)::int
  from pronosticos pr, real r
  where pr.partido_id = p_partido_id
    and r.modo_real is not null
    and pr.pred_definicion = r.modo_real
    and pr.pred_def_local  = r.rl
    and pr.pred_def_visita = r.rv;
$$;

-- ---------------------------------------------------------------------
-- 2) Funcion NUEVA: 9 args (agrega n_exactos_def). El bonus del EXACTO
--    ahora escala por cuantos lo clavaron. El +2 modo+bandera queda fijo.
-- ---------------------------------------------------------------------
create or replace function calcular_puntos_definicion(
  pred_def text, pred_clas text, pred_dl int, pred_dv int,
  pen_l int, pen_v int, alg_l int, alg_v int, n_exactos_def int
) returns int as $$
declare modo_real text; rl int; rv int; clas_real text; pts int := 0; bonus int;
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

  -- +2 FIJO: acierta el modo real Y el equipo que clasifica (bandera).
  if pred_def = modo_real
     and pred_clas is not null
     and clas_real is not null
     and pred_clas = clas_real then
    pts := 2;
  end if;

  -- Bonus por MARCADOR EXACTO de la definicion, repartido segun cuantos lo
  -- clavaron: unico +3, x2 +2, x3+ +1.
  if pred_dl is not null and pred_dv is not null
     and pred_def = modo_real
     and pred_dl = rl and pred_dv = rv then
    if    coalesce(n_exactos_def, 1) <= 1 then bonus := 3;
    elsif n_exactos_def = 2               then bonus := 2;
    else                                       bonus := 1;
    end if;
    pts := pts + bonus;
  end if;

  return pts;
end;
$$ language plpgsql immutable;

-- ---------------------------------------------------------------------
-- 3) Vistas: CREATE OR REPLACE (NO drop) -> dependientes intactas.
--    tabla_posiciones conserva el filtro de anulados (FIX-excluir-anulados);
--    ambas pasan contar_exactos_definicion(p.id) como 9no argumento.
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
          p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita,
          contar_exactos_definicion(p.id))),0)
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
                      and not p.puntaje_anulado
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
          p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita,
          contar_exactos_definicion(p.id))),0)
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
-- 4) Trigger: calcula el tier de la definicion (n_def) y lo pasa.
-- ---------------------------------------------------------------------
create or replace function tg_actualizar_puntos() returns trigger as $$
declare n int; n_def int;
begin
  if new.estado = 'final'
     and new.goles_local is not null and new.goles_visita is not null then
    select count(*) into n from pronosticos
      where partido_id = new.id
        and pred_local = new.goles_local and pred_visita = new.goles_visita;
    n_def := contar_exactos_definicion(new.id);
    update pronosticos
       set puntos = calcular_puntos_pronostico(
             pred_local, pred_visita, new.goles_local, new.goles_visita, new.fase, n),
           puntos_definicion = calcular_puntos_definicion(
             pred_definicion, pred_clasificado, pred_def_local, pred_def_visita,
             new.penales_local, new.penales_visita, new.alargue_local, new.alargue_visita,
             n_def),
           updated_at = now()
     where partido_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 5) RPC pronosticos_partido: pasa el tier de la definicion en el output.
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
           p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita,
           contar_exactos_definicion(p.id)) as puntos_definicion,
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
-- 6) AHORA si: dropear la funcion VIEJA (8 args). Ya nadie la usa.
-- ---------------------------------------------------------------------
drop function if exists calcular_puntos_definicion(text,text,int,int,int,int,int,int);

-- ---------------------------------------------------------------------
-- 6.b) REFRESCAR la columna guardada pronosticos.puntos_definicion (y de
--   paso pronosticos.puntos) para TODOS los partidos ya finalizados.
--   Motivo: el trigger solo reescribe estas columnas cuando el partido pasa
--   a 'final'. Los partidos que ya terminaron (ej. Belgica-Senegal, def. por
--   alargue con 2 aciertos) tienen el valor VIEJO (+5) congelado. Nada visible
--   lo lee -vistas y RPC recalculan con la funcion nueva- pero lo dejamos
--   coherente en fisico. Efecto: Belgica-Senegal pasa de +5 a +4 tambien aqui.
-- ---------------------------------------------------------------------
update pronosticos pr
   set puntos = calcular_puntos_pronostico(
         pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
         contar_exactos(p.id)),
       puntos_definicion = calcular_puntos_definicion(
         pr.pred_definicion, pr.pred_clasificado, pr.pred_def_local, pr.pred_def_visita,
         p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita,
         contar_exactos_definicion(p.id)),
       updated_at = now()
  from partidos p
 where p.id = pr.partido_id
   and p.estado = 'final'
   and p.goles_local is not null and p.goles_visita is not null;

-- ---------------------------------------------------------------------
-- 7) Permisos sobre las firmas NUEVAS.
-- ---------------------------------------------------------------------
grant execute on function contar_exactos_definicion(int)                                        to anon, authenticated;
grant execute on function calcular_puntos_definicion(text,text,int,int,int,int,int,int,int)      to anon, authenticated;
grant execute on function pronosticos_partido(int,int)                                           to anon, authenticated;

commit;

-- Refresca el cache de PostgREST para que el front vea las funciones nuevas YA.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- VERIFICACION (corre despues):
--   -- unico (n=1): +2 bandera + 3 exacto = 5
--   select calcular_puntos_definicion('penales','local',4,3, 4,3, null,null, 1);  -- 5
--   -- x2 (n=2): +2 bandera + 2 exacto = 4
--   select calcular_puntos_definicion('penales','local',4,3, 4,3, null,null, 2);  -- 4
--   -- x3+ (n=3): +2 bandera + 1 exacto = 3
--   select calcular_puntos_definicion('penales','local',4,3, 4,3, null,null, 3);  -- 3
--   -- solo modo+bandera (sin marcador exacto): 2
--   select calcular_puntos_definicion('penales','local',9,9, 4,3, null,null, 1);  -- 2
--   -- clasifica el otro equipo: 0
--   select calcular_puntos_definicion('penales','local',4,3, 3,4, null,null, 1);  -- 0
--   select * from tabla_posiciones order by posicion;
--   -- Belgica-Senegal (def. por alargue, 2 aciertos): los que clavaron el
--   -- marcador exacto deben mostrar puntos_definicion = 4 (antes 5):
--   select jugador_id, pred_definicion, pred_clasificado, pred_def_local,
--          pred_def_visita, puntos_definicion
--   from pronosticos where partido_id = 81 order by puntos_definicion desc;
-- ---------------------------------------------------------------------
