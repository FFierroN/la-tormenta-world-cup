-- =====================================================================
-- SNIPPET: NUEVO SISTEMA DE PUNTAJES (partidos por tiers + especiales)
-- =====================================================================
-- Migra una base YA existente al nuevo sistema:
--  PARTIDOS: exacto unico/x2/x3+ segun cuantos clavaron el marcador (aplica
--    tambien a empates; en empate no hay 'Diferencia'). Sin bonus de goleada.
--  ESPECIALES: PAIS con dedup por equipo (ronda mas alta lograda):
--    Campeon 30 / Finalista 12 / 3er lugar 8 / Semifinalista 6.
--    DISTINCION: Goleador 15 / Asistidor 10 (NUEVO) / MVP 10 / Arquero 10 / Joven 10.
--
-- Seguro de correr: idempotente. NO borra pronosticos ni jugadores. Solo
-- elimina columnas de puntaje de especiales (se recalculan solas).
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

-- 1) Columnas nuevas en predicciones_especiales (asistidor + puntos consolidados).
alter table predicciones_especiales add column if not exists asistidor        text;
alter table predicciones_especiales add column if not exists puntos_pais       int not null default 0;
alter table predicciones_especiales add column if not exists puntos_asistidor  int not null default 0;

-- 2) Claves de resultado real nuevas (3er lugar y asistidor).
insert into configuracion (clave, valor) values
  ('real_tercer',''), ('real_asistidor','')
on conflict (clave) do nothing;

-- 3) Nueva funcion de puntaje de partido (firma con n_exactos). Es un overload:
--    convive con la vieja hasta que recreemos sus dependencias y la borremos.
create or replace function calcular_puntos_pronostico(
  pred_local int, pred_visita int, res_local int, res_visita int, p_fase text, n_exactos int
) returns int as $$
declare
  pts_unico int; pts_x2 int; pts_x3 int; pts_dif int; pts_gan int;
begin
  if pred_local is null or pred_visita is null
     or res_local is null or res_visita is null then
    return 0;
  end if;

  if    p_fase in ('Grupos','Dieciseisavos')      then pts_unico:=6;  pts_x2:=5;  pts_x3:=4;  pts_dif:=3; pts_gan:=2;
  elsif p_fase in ('Octavos','Cuartos')           then pts_unico:=9;  pts_x2:=7;  pts_x3:=6;  pts_dif:=4; pts_gan:=3;
  elsif p_fase in ('Semifinales','Tercer Puesto') then pts_unico:=12; pts_x2:=10; pts_x3:=8;  pts_dif:=6; pts_gan:=4;
  elsif p_fase = 'Final'                          then pts_unico:=15; pts_x2:=12; pts_x3:=10; pts_dif:=7; pts_gan:=5;
  else  return 0;
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

-- 4) Helper: cuantos clavaron el exacto de un partido (define el tier).
create or replace function contar_exactos(p_partido_id int)
returns int language sql stable security definer set search_path = public, extensions as $$
  select count(*)::int
  from pronosticos pr
  join partidos p on p.id = pr.partido_id
  where pr.partido_id = p_partido_id
    and p.goles_local is not null and p.goles_visita is not null
    and pr.pred_local = p.goles_local and pr.pred_visita = p.goles_visita;
$$;

-- 5) Recrear la VISTA antes de borrar columnas/funcion vieja (rompe la dependencia).
create or replace view tabla_posiciones as
with base as (
  select
    j.id   as jugador_id,
    j.nombre, j.alias,
    j.avatar_pos1, j.avatar_medio, j.avatar_pos8,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))),0)
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

-- 6) Recrear trigger y RPC que usaban la funcion vieja, ahora con la nueva firma.
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
           updated_at = now()
     where partido_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function pronosticos_partido(p_partido_id int, p_jugador_id int)
returns table(jugador_id int, nombre text, pred_local int, pred_visita int, puntos int)
language sql security definer set search_path = public, extensions as $$
  select pr.jugador_id,
         coalesce(j.alias, j.nombre) as nombre,
         pr.pred_local, pr.pred_visita,
         calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
           p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) as puntos
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

-- 7) Ahora si: borrar la version vieja (5 args) y las columnas de puntaje viejas.
drop function if exists calcular_puntos_pronostico(int,int,int,int,text);
alter table predicciones_especiales drop column if exists puntos_campeon;
alter table predicciones_especiales drop column if exists puntos_finalistas;
alter table predicciones_especiales drop column if exists puntos_semifinalistas;

-- 8) guardar_especiales: nueva firma con p_asistidor.
drop function if exists guardar_especiales(int,text,text,text,text,text,text,text,text,text,text,text);
create or replace function guardar_especiales(
  p_jugador_id int,
  p_campeon text, p_finalista_1 text, p_finalista_2 text,
  p_semi_1 text, p_semi_2 text, p_semi_3 text, p_semi_4 text,
  p_goleador text, p_asistidor text, p_mejor_jugador text, p_mejor_arquero text, p_mejor_joven text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare habil text;
begin
  select valor into habil from configuracion
    where clave = 'edicion_predicciones_habilitada';
  if coalesce(habil, 'false') <> 'true' then return 'cerrado'; end if;
  insert into predicciones_especiales (
    jugador_id, campeon, finalista_1, finalista_2,
    semifinalista_1, semifinalista_2, semifinalista_3, semifinalista_4,
    goleador, asistidor, mejor_jugador, mejor_arquero, mejor_joven)
  values (p_jugador_id, p_campeon, p_finalista_1, p_finalista_2,
    p_semi_1, p_semi_2, p_semi_3, p_semi_4,
    p_goleador, p_asistidor, p_mejor_jugador, p_mejor_arquero, p_mejor_joven)
  on conflict (jugador_id) do update set
    campeon = excluded.campeon,
    finalista_1 = excluded.finalista_1, finalista_2 = excluded.finalista_2,
    semifinalista_1 = excluded.semifinalista_1, semifinalista_2 = excluded.semifinalista_2,
    semifinalista_3 = excluded.semifinalista_3, semifinalista_4 = excluded.semifinalista_4,
    goleador = excluded.goleador, asistidor = excluded.asistidor,
    mejor_jugador = excluded.mejor_jugador,
    mejor_arquero = excluded.mejor_arquero, mejor_joven = excluded.mejor_joven;
  return 'ok';
end;
$$;

-- 9) recalcular_especiales: PAIS con dedup (ronda mas alta) + distinciones nuevas.
create or replace function recalcular_especiales()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  r_camp text; r_ter text; r_gol text; r_asi text; r_mj text; r_ma text; r_mjov text;
  v_fin text[]; v_semi text[];
begin
  select lower(trim(valor)) into r_camp from configuracion where clave='real_campeon';
  select lower(trim(valor)) into r_ter  from configuracion where clave='real_tercer';
  select lower(trim(valor)) into r_gol  from configuracion where clave='real_goleador';
  select lower(trim(valor)) into r_asi  from configuracion where clave='real_asistidor';
  select lower(trim(valor)) into r_mj   from configuracion where clave='real_mejor_jugador';
  select lower(trim(valor)) into r_ma   from configuracion where clave='real_mejor_arquero';
  select lower(trim(valor)) into r_mjov from configuracion where clave='real_mejor_joven';
  select array_remove(array[
    lower(trim((select valor from configuracion where clave='real_finalista_1'))),
    lower(trim((select valor from configuracion where clave='real_finalista_2')))], '')
    into v_fin;
  select array_remove(array[
    lower(trim((select valor from configuracion where clave='real_semi_1'))),
    lower(trim((select valor from configuracion where clave='real_semi_2'))),
    lower(trim((select valor from configuracion where clave='real_semi_3'))),
    lower(trim((select valor from configuracion where clave='real_semi_4')))], '')
    into v_semi;

  update predicciones_especiales pe set
    puntos_goleador      = case when r_gol  <> '' and lower(trim(coalesce(pe.goleador,'')))=r_gol      then 15 else 0 end,
    puntos_asistidor     = case when r_asi  <> '' and lower(trim(coalesce(pe.asistidor,'')))=r_asi     then 10 else 0 end,
    puntos_mejor_jugador = case when r_mj   <> '' and lower(trim(coalesce(pe.mejor_jugador,'')))=r_mj   then 10 else 0 end,
    puntos_mejor_arquero = case when r_ma   <> '' and lower(trim(coalesce(pe.mejor_arquero,'')))=r_ma   then 10 else 0 end,
    puntos_mejor_joven   = case when r_mjov <> '' and lower(trim(coalesce(pe.mejor_joven,'')))=r_mjov   then 10 else 0 end;

  update predicciones_especiales pe set
    puntos_pais = coalesce((
      select sum(valor_equipo) from (
        select t.equipo,
          max(case
            when r_camp <> '' and t.equipo = r_camp  then 30
            when t.equipo = any(v_fin)               then 12
            when r_ter  <> '' and t.equipo = r_ter   then 8
            when t.equipo = any(v_semi)              then 6
            else 0 end) as valor_equipo
        from (
          select lower(trim(x)) as equipo from unnest(array[
            pe.campeon, pe.finalista_1, pe.finalista_2,
            pe.semifinalista_1, pe.semifinalista_2, pe.semifinalista_3, pe.semifinalista_4
          ]) as x
          where x is not null and trim(x) <> ''
        ) t
        group by t.equipo
      ) s
    ), 0);
end;
$$;

-- 10) Permisos.
grant execute on function contar_exactos(int) to anon, authenticated;
grant execute on function guardar_especiales(int,text,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;

-- Verificacion rapida (debe correr sin error y devolver la tabla):
-- select * from tabla_posiciones order by posicion;
