-- =====================================================================
-- SETUP-LLAVES.sql  ·  Motor de LLAVES (cuadro de eliminacion) WC 2026
-- =====================================================================
-- Que hace (todo idempotente y reversible):
--   1. Agrega columnas a 'partidos' para guardar el TEMPLATE del cuadro:
--        slot          -> codigo oficial del partido (P73..P104)
--        origen_local  -> de donde sale el equipo local (placeholder)
--        origen_visita -> de donde sale el visitante (placeholder)
--        equipos_bloqueados -> si el admin fijo los equipos a mano, no
--                              dejar que el motor los pise.
--   2. Crea la tabla 'terceros_asignacion' (matriz oficial FIFA de los
--      8 mejores terceros). Queda VACIA hasta cargar el PDF de Felipe.
--   3. Vistas del motor "cerrar grupo -> detectar 1o/2o/3o":
--        - grupos_clasificados : 1o,2o,3o de cada grupo + si esta cerrado
--        - mejores_terceros    : ranking de los 12 terceros, top 8
--   4. Funcion propagar_llaves(): rellena los equipos de las llaves segun
--      los origen_*. Es segura: si no hay template cargado, no hace nada.
--
-- Lenguaje de los placeholders (columnas origen_*):
--   '1A'      -> ganador del grupo A
--   '2B'      -> segundo del grupo B
--   '3CDFGH'  -> un tercero (de alguno de esos grupos); lo decide la matriz
--   'GP73'    -> Ganador del partido con slot 'P73'
--   'PP101'   -> Perdedor del partido 'P101'  (para el 3er puesto)
--
-- Uso: Supabase -> SQL Editor -> pega TODO -> Run.
-- Reversible: las columnas son nuevas y nullable; borrar la tabla y las
-- vistas no afecta datos existentes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. COLUMNAS DE TEMPLATE EN 'partidos'
-- ---------------------------------------------------------------------
alter table partidos add column if not exists slot               text;
alter table partidos add column if not exists origen_local       text;
alter table partidos add column if not exists origen_visita      text;
alter table partidos add column if not exists equipos_bloqueados boolean not null default false;

-- Un slot, si existe, es unico (P73..P104). Los partidos de grupos no usan slot.
create unique index if not exists idx_partidos_slot on partidos(slot) where slot is not null;


-- ---------------------------------------------------------------------
-- 2. MATRIZ OFICIAL DE LOS 8 MEJORES TERCEROS (FIFA)
-- ---------------------------------------------------------------------
-- FIFA publica una tabla: segun QUE 8 grupos aportan tercero clasificado,
-- a que llave (slot) va el tercero de cada uno de esos grupos.
--   combinacion  -> los 8 grupos ordenados alfabeticamente, ej 'ABCDEFGH'
--   grupo_tercero-> de que grupo es el tercero (una letra, ej 'C')
--   slot         -> a que partido de Dieciseisavos va (ej 'P75')
-- Se carga UNA vez desde el PDF oficial (495 combinaciones x 8 filas).
create table if not exists terceros_asignacion (
  combinacion   text not null,   -- 8 letras ordenadas, ej 'ABCDEFGH'
  grupo_tercero text not null,   -- una letra A..L
  slot          text not null,   -- P73..P88 (Dieciseisavos)
  primary key (combinacion, grupo_tercero)
);
-- Sin RLS abierta: solo se carga desde el editor de Supabase (admin).
alter table terceros_asignacion enable row level security;


-- ---------------------------------------------------------------------
-- 3a. VISTA: clasificados por grupo (1o/2o/3o) + si el grupo esta cerrado
-- ---------------------------------------------------------------------
-- 'cerrado' = el grupo tiene 6 partidos y TODOS estan en estado 'final'.
-- Reusa la vista tabla_grupos (ya calcula pos por pts->dg->gf->nombre).
create or replace view grupos_clasificados as
with cierre as (
  select grupo,
         count(*)                                   as jugados_total,
         count(*) filter (where estado = 'final')   as jugados_final
  from partidos
  where grupo is not null
  group by grupo
)
select
  tg.grupo,
  max(case when tg.pos = 1 then tg.equipo end)  as primero,
  max(case when tg.pos = 1 then tg.pais   end)  as primero_pais,
  max(case when tg.pos = 2 then tg.equipo end)  as segundo,
  max(case when tg.pos = 2 then tg.pais   end)  as segundo_pais,
  max(case when tg.pos = 3 then tg.equipo end)  as tercero,
  max(case when tg.pos = 3 then tg.pais   end)  as tercero_pais,
  bool_and(c.jugados_total = 6 and c.jugados_final = 6) as cerrado
from tabla_grupos tg
join cierre c on c.grupo = tg.grupo
group by tg.grupo;


-- ---------------------------------------------------------------------
-- 3b. VISTA: ranking de los 12 terceros (mejores 8 clasifican)
-- ---------------------------------------------------------------------
-- Orden FIFA de terceros: pts desc, dg desc, gf desc (luego, oficialmente,
-- fair-play y sorteo; aqui rompemos por nombre para que sea determinista).
-- 'clasificado' marca los 8 primeros. 'rank_global' es 1..12.
create or replace view mejores_terceros as
with terceros as (
  select tg.grupo, tg.equipo, tg.pais, tg.pts, tg.dg, tg.gf
  from tabla_grupos tg
  where tg.pos = 3
)
select
  grupo, equipo, pais, pts, dg, gf,
  row_number() over (order by pts desc, dg desc, gf desc, equipo) as rank_global,
  (row_number() over (order by pts desc, dg desc, gf desc, equipo)) <= 8 as clasificado
from terceros;


-- ---------------------------------------------------------------------
-- 4. MOTOR: resolver un placeholder a un equipo concreto
-- ---------------------------------------------------------------------
-- Helpers: ganador / perdedor de un partido por slot (solo si esta 'final').
-- Devuelven (equipo, pais) o NULL si aun no se puede decidir.
create or replace function llave_ganador(p_slot text)
returns table(equipo text, pais text) as $$
  select case
           when p.goles_local > p.goles_visita then p.equipo_local
           when p.goles_local < p.goles_visita then p.equipo_visita
           when p.ganador_penales = 'local'    then p.equipo_local
           when p.ganador_penales = 'visita'   then p.equipo_visita
           else null end,
         case
           when p.goles_local > p.goles_visita then p.pais_local
           when p.goles_local < p.goles_visita then p.pais_visita
           when p.ganador_penales = 'local'    then p.pais_local
           when p.ganador_penales = 'visita'   then p.pais_visita
           else null end
  from partidos p
  where p.slot = p_slot and p.estado = 'final' and p.goles_local is not null;
$$ language sql stable;

create or replace function llave_perdedor(p_slot text)
returns table(equipo text, pais text) as $$
  select case
           when p.goles_local < p.goles_visita then p.equipo_local
           when p.goles_local > p.goles_visita then p.equipo_visita
           when p.ganador_penales = 'local'    then p.equipo_visita
           when p.ganador_penales = 'visita'   then p.equipo_local
           else null end,
         case
           when p.goles_local < p.goles_visita then p.pais_local
           when p.goles_local > p.goles_visita then p.pais_visita
           when p.ganador_penales = 'local'    then p.pais_visita
           when p.ganador_penales = 'visita'   then p.pais_local
           else null end
  from partidos p
  where p.slot = p_slot and p.estado = 'final' and p.goles_local is not null;
$$ language sql stable;


-- resolver_origen(spec) -> (equipo, pais) o NULL si aun no se sabe.
-- Entiende: '1X','2X' (grupo cerrado), 'GPnn','PPnn' (partido final),
-- '3XYZ...' (tercero via matriz, requiere TODOS los grupos cerrados).
create or replace function resolver_origen(p_spec text)
returns table(equipo text, pais text) as $$
declare
  tipo          char;
  letra         text;
  v_equipo      text;
  v_pais        text;
  v_combinacion text;
  v_grupo3      text;
  v_slot        text;
begin
  if p_spec is null or length(p_spec) = 0 then
    return;
  end if;

  tipo := substr(p_spec, 1, 1);

  -- Ganador / Perdedor de un partido (GP.. / PP..)
  if p_spec like 'GP%' then
    select g.equipo, g.pais into v_equipo, v_pais
      from llave_ganador(substr(p_spec, 2)) g;  -- 'P73'
    if v_equipo is not null then equipo := v_equipo; pais := v_pais; return next; end if;
    return;
  elsif p_spec like 'PP%' then
    select l.equipo, l.pais into v_equipo, v_pais
      from llave_perdedor(substr(p_spec, 2)) l;
    if v_equipo is not null then equipo := v_equipo; pais := v_pais; return next; end if;
    return;
  end if;

  -- 1X / 2X : ganador o segundo de un grupo (solo si el grupo esta cerrado)
  if tipo in ('1','2') then
    letra := substr(p_spec, 2, 1);
    if tipo = '1' then
      select gc.primero, gc.primero_pais into v_equipo, v_pais
        from grupos_clasificados gc where gc.grupo = letra and gc.cerrado;
    else
      select gc.segundo, gc.segundo_pais into v_equipo, v_pais
        from grupos_clasificados gc where gc.grupo = letra and gc.cerrado;
    end if;
    if v_equipo is not null then equipo := v_equipo; pais := v_pais; return next; end if;
    return;
  end if;

  -- 3XYZ... : tercero asignado por la matriz oficial.
  -- Requiere que TODOS los grupos esten cerrados (asi se conocen los 8 terceros)
  -- y que la matriz 'terceros_asignacion' este cargada.
  if tipo = '3' then
    -- Si falta cerrar algun grupo, aun no se puede.
    if exists (select 1 from grupos_clasificados where not cerrado) then
      return;
    end if;
    -- Combinacion real de los 8 grupos cuyos terceros clasificaron.
    select string_agg(grupo, '' order by grupo) into v_combinacion
      from mejores_terceros where clasificado;
    -- Este slot (el del partido que llama) lo resolvemos por la matriz:
    --   buscamos en la matriz que grupo-tercero va a ESTE slot, para esta combinacion.
    -- (el spec '3XYZ' solo nos dice los grupos candidatos; la matriz manda)
    -- Nota: la resolucion fina por slot la hace propagar_llaves(), que pasa el slot.
    return;  -- la rama de terceros se resuelve en propagar_llaves (necesita el slot)
  end if;

  return;
end;
$$ language plpgsql stable;


-- ---------------------------------------------------------------------
-- 4b. MOTOR: propagar_llaves() — rellena los equipos del cuadro
-- ---------------------------------------------------------------------
-- Recorre los partidos de eliminatoria (con slot) que NO esten bloqueados
-- por el admin, y rellena equipo_local/visita cuando ya se pueden resolver.
-- Devuelve cuantos lados (slots*2) rellenó en esta corrida.
-- Es idempotente: si ya estan resueltos, no hace nada.
create or replace function propagar_llaves()
returns int as $$
declare
  r            record;
  v_eq         text;
  v_pa         text;
  n            int := 0;
  todos_cerrados boolean;
  v_combinacion  text;
begin
  select not exists (select 1 from grupos_clasificados where not cerrado)
    into todos_cerrados;
  if todos_cerrados then
    select string_agg(grupo, '' order by grupo) into v_combinacion
      from mejores_terceros where clasificado;
  end if;

  for r in
    select id, slot, origen_local, origen_visita, equipo_local, equipo_visita
    from partidos
    where slot is not null and not equipos_bloqueados
  loop
    -- ----- lado LOCAL -----
    if r.equipo_local = 'Por definir' and r.origen_local is not null then
      if left(r.origen_local,1) = '3' and todos_cerrados and v_combinacion is not null then
        -- tercero por matriz: buscar que grupo-tercero va a este slot
        select t.grupo_tercero into v_eq
          from terceros_asignacion t
          where t.combinacion = v_combinacion and t.slot = r.slot;
        if v_eq is not null then
          select gc.tercero, gc.tercero_pais into v_eq, v_pa
            from grupos_clasificados gc where gc.grupo = v_eq;
        else
          v_eq := null; v_pa := null;
        end if;
      else
        select o.equipo, o.pais into v_eq, v_pa from resolver_origen(r.origen_local) o;
      end if;
      if v_eq is not null then
        update partidos set equipo_local = v_eq, pais_local = coalesce(v_pa,'XX')
          where id = r.id;
        n := n + 1;
      end if;
    end if;

    -- ----- lado VISITA -----
    if r.equipo_visita = 'Por definir' and r.origen_visita is not null then
      if left(r.origen_visita,1) = '3' and todos_cerrados and v_combinacion is not null then
        select t.grupo_tercero into v_eq
          from terceros_asignacion t
          where t.combinacion = v_combinacion and t.slot = r.slot;
        if v_eq is not null then
          select gc.tercero, gc.tercero_pais into v_eq, v_pa
            from grupos_clasificados gc where gc.grupo = v_eq;
        else
          v_eq := null; v_pa := null;
        end if;
      else
        select o.equipo, o.pais into v_eq, v_pa from resolver_origen(r.origen_visita) o;
      end if;
      if v_eq is not null then
        update partidos set equipo_visita = v_eq, pais_visita = coalesce(v_pa,'XX')
          where id = r.id;
        n := n + 1;
      end if;
    end if;
  end loop;

  return n;
end;
$$ language plpgsql;


-- ---------------------------------------------------------------------
-- 4c. DISPARO AUTOMATICO: cada vez que un partido se marca 'final'
-- ---------------------------------------------------------------------
-- Asi el llenado es 100% automatico: termina un partido -> se intenta
-- propagar (cierre de grupo -> mete 1o/2o; termina una llave -> avanza
-- el ganador a la siguiente). El admin igual puede correr propagar_llaves()
-- a mano o editar equipos (poniendo equipos_bloqueados=true para fijarlos).
create or replace function tg_propagar_llaves() returns trigger as $$
begin
  if new.estado = 'final' and (old.estado is distinct from 'final') then
    perform propagar_llaves();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_propagar_llaves on partidos;
create trigger trg_propagar_llaves
  after update of estado on partidos
  for each row execute function tg_propagar_llaves();


-- ---------------------------------------------------------------------
-- 5. PERMISOS (lectura para la app)
-- ---------------------------------------------------------------------
grant select on grupos_clasificados, mejores_terceros to anon, authenticated;
grant execute on function propagar_llaves()            to anon, authenticated;

-- =====================================================================
-- VERIFICACION rapida (descomenta para probar):
--   select * from grupos_clasificados order by grupo;
--   select * from mejores_terceros order by rank_global;
--   select propagar_llaves();   -- devuelve cuantos lados se rellenaron
-- =====================================================================
