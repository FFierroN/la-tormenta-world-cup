-- =====================================================================
-- FIX-llaves-terceros.sql  ·  Arregla el llenado de TERCEROS en llaves
-- =====================================================================
-- BUG:
--   La tabla 'terceros_asignacion' tiene RLS habilitada SIN ningun policy
--   ni grant select. La funcion propagar_llaves() NO era 'security definer',
--   asi que cuando el trigger se dispara al marcar un partido 'final' (rol
--   authenticated/anon desde la app), la consulta a terceros_asignacion
--   devolvia CERO filas -> los 8 dieciseisavos que dependen de un mejor
--   tercero (origen '3XYZ') quedaban "Por definir".
--   Los 1o/2o de grupo SI se llenaban porque salen de vistas que ya tienen
--   grant select (grupos_clasificados / mejores_terceros).
--
-- FIX:
--   1. Recrea propagar_llaves() como SECURITY DEFINER (corre como owner ->
--      bypassa la RLS de terceros_asignacion). Misma logica, solo cambia
--      el contexto de ejecucion. Consistente con el resto del proyecto.
--   2. Verifica que la matriz de terceros este cargada (por si nunca se
--      corrio CARGA-TERCEROS.sql). Si esta vacia, aborta con un aviso claro.
--   3. Re-ejecuta propagar_llaves() para rellenar AHORA los que faltan.
--
-- Idempotente y reversible. Uso: Supabase -> SQL Editor -> pega TODO -> Run.
-- Requisito: haber corrido antes SETUP-LLAVES, CARGA-TEMPLATE-LLAVES y
-- CARGA-TERCEROS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. SANIDAD: la matriz de terceros tiene que estar cargada
-- ---------------------------------------------------------------------
do $$
declare
  n_filas  int;
  n_combos int;
begin
  select count(*), count(distinct combinacion)
    into n_filas, n_combos
    from terceros_asignacion;

  if n_filas = 0 then
    raise exception
      'terceros_asignacion esta VACIA. Corre primero db/CARGA-TERCEROS.sql '
      '(deberia dejar 3960 filas / 495 combinaciones).';
  end if;

  raise notice 'Matriz de terceros OK: % filas, % combinaciones.', n_filas, n_combos;
end $$;


-- ---------------------------------------------------------------------
-- 1. RECREAR propagar_llaves() COMO SECURITY DEFINER
-- ---------------------------------------------------------------------
-- (misma logica que SETUP-LLAVES.sql; el unico cambio es la cabecera:
--  'security definer set search_path = public, extensions')
create or replace function propagar_llaves()
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r              record;
  v_eq           text;
  v_pa           text;
  n              int := 0;
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
$$;

-- Permiso de ejecucion para la app (re-afirma el grant; idempotente).
grant execute on function propagar_llaves() to anon, authenticated;


-- ---------------------------------------------------------------------
-- 2. CORRER AHORA: rellena los terceros que estaban "Por definir"
-- ---------------------------------------------------------------------
select propagar_llaves() as lados_rellenados_ahora;

-- ---------------------------------------------------------------------
-- 3. VERIFICACION: deberian quedar 0 dieciseisavos "Por definir"
--    (si todos los grupos ya cerraron)
-- ---------------------------------------------------------------------
select slot, fase,
       origen_local, equipo_local,
       origen_visita, equipo_visita
from partidos
where slot is not null
  and (equipo_local = 'Por definir' or equipo_visita = 'Por definir')
order by slot;
-- Si esta consulta vuelve VACIA -> todo lleno. 
-- Si aun aparecen filas: probablemente falta cerrar algun grupo (no todos
-- sus 6 partidos estan en estado 'final').
