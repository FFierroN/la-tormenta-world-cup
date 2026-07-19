-- =====================================================================
-- SNIPPET: Puntos especiales MANUALES (carga a mano por el admin)
-- La Tormenta World Cup - Supabase / Postgres
-- =====================================================================
-- QUE HACE:
--   Reemplaza el calculo AUTOMATICO de las predicciones especiales por una
--   carga MANUAL: el admin escribe, por cada jugador, el puntaje de cada una
--   de las 9 categorias especiales. Ese total se SUMA a la tabla general.
--
--   Las 9 categorias (con su valor sugerido):
--     PAIS:       Campeon 30 | Finalista 12 | Tercer lugar 8 | Semifinalista 6
--     DISTINCION: Goleador 15 | Asistidor 10 | Mejor jugador 10
--                 Mejor arquero 10 | Mejor jugador joven 10
--
--   Los pronosticos de los jugadores (tabla predicciones_especiales) siguen
--   guardados intactos; solo dejan de puntuarse solos. El admin decide el puntaje.
--
-- COMO USARLO:  pegar entero en Supabase -> SQL Editor -> Run.  Idempotente.
-- =====================================================================

-- 1) Tabla de puntos manuales (una fila por jugador, upsert).
create table if not exists puntos_especiales_manual (
  jugador_id     int primary key references jugadores(id) on delete cascade,
  campeon        int not null default 0,
  finalista      int not null default 0,
  tercer         int not null default 0,
  semi           int not null default 0,
  goleador       int not null default 0,
  asistidor      int not null default 0,
  mejor_jugador  int not null default 0,
  mejor_arquero  int not null default 0,
  mejor_joven    int not null default 0,
  actualizado_en timestamptz not null default now()
);

-- RLS cerrada: se accede SOLO via las funciones security-definer de abajo
-- (mismo patron que 'jugadores' / 'pronosticos'). El frontend no toca la tabla.
alter table puntos_especiales_manual enable row level security;

-- 2) Leer todos los puntos manuales (para el panel admin).
create or replace function listar_puntos_especiales()
returns setof puntos_especiales_manual
language sql security definer set search_path = public as $$
  select * from puntos_especiales_manual;
$$;

-- 3) Guardar (upsert) los 9 puntajes de un jugador.
create or replace function set_puntos_especiales(
  p_jugador_id    int,
  p_campeon       int,
  p_finalista     int,
  p_tercer        int,
  p_semi          int,
  p_goleador      int,
  p_asistidor     int,
  p_mejor_jugador int,
  p_mejor_arquero int,
  p_mejor_joven   int
) returns text
language plpgsql security definer set search_path = public as $$
begin
  insert into puntos_especiales_manual as m (
    jugador_id, campeon, finalista, tercer, semi,
    goleador, asistidor, mejor_jugador, mejor_arquero, mejor_joven, actualizado_en
  ) values (
    p_jugador_id,
    coalesce(p_campeon,0), coalesce(p_finalista,0), coalesce(p_tercer,0), coalesce(p_semi,0),
    coalesce(p_goleador,0), coalesce(p_asistidor,0), coalesce(p_mejor_jugador,0),
    coalesce(p_mejor_arquero,0), coalesce(p_mejor_joven,0), now()
  )
  on conflict (jugador_id) do update set
    campeon        = excluded.campeon,
    finalista      = excluded.finalista,
    tercer         = excluded.tercer,
    semi           = excluded.semi,
    goleador       = excluded.goleador,
    asistidor      = excluded.asistidor,
    mejor_jugador  = excluded.mejor_jugador,
    mejor_arquero  = excluded.mejor_arquero,
    mejor_joven    = excluded.mejor_joven,
    actualizado_en = now();
  return 'ok';
end;
$$;

-- 4) La tabla general suma ahora los puntos MANUALES (no el calculo automatico).
create or replace view tabla_posiciones as
with base as (
  select
    j.id   as jugador_id,
    j.nombre, j.alias,
    j.avatar_pos1, j.avatar_medio, j.avatar_pos8,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))),0)
      + coalesce(j.ajuste_puntos, 0)            -- ajuste manual del admin (suma/resta)
      + coalesce((
          select m.campeon + m.finalista + m.tercer + m.semi
               + m.goleador + m.asistidor + m.mejor_jugador
               + m.mejor_arquero + m.mejor_joven
          from puntos_especiales_manual m where m.jugador_id = j.id), 0) as puntos,
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

-- 5) Permisos.
grant execute on function listar_puntos_especiales()                          to anon, authenticated;
grant execute on function set_puntos_especiales(int,int,int,int,int,int,int,int,int,int) to anon, authenticated;
grant select on tabla_posiciones to anon, authenticated;

-- Verificacion rapida (debe correr sin error):
-- select * from listar_puntos_especiales();
-- select nombre, puntos, posicion from tabla_posiciones order by posicion;
