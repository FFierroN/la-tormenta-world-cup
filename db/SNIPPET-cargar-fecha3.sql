-- =====================================================================
-- SNIPPET: CARGAR PARTIDOS DE LA FECHA 3 (3ra jornada de grupos)
-- =====================================================================
-- Usar SOLO si en la app no aparecen los partidos del 24 al 27 de junio
-- (ni en "Proximos" ni en las pestanas de Grupo). Inserta los 18 partidos
-- de la tercera fecha de la fase de grupos.
--
-- IDEMPOTENTE: no duplica. Solo inserta el partido si NO existe ya uno con
-- el mismo equipo_local + equipo_visita + fecha.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- Verificacion al final.
-- =====================================================================

insert into partidos (fase, grupo, fecha, equipo_local, equipo_visita, pais_local, pais_visita, estadio, ciudad)
select v.fase, v.grupo, v.fecha::timestamptz, v.equipo_local, v.equipo_visita, v.pais_local, v.pais_visita, v.estadio, v.ciudad
from (values
  ('Grupos', 'B', '2026-06-24 15:00:00-04', 'Suiza', 'Canadá', 'CH', 'CA', 'BC Place', 'Vancouver'),
  ('Grupos', 'B', '2026-06-24 15:00:00-04', 'Bosnia y Herzegovina', 'Catar', 'BA', 'QA', 'Lumen Field', 'Seattle'),
  ('Grupos', 'C', '2026-06-24 18:00:00-04', 'Escocia', 'Brasil', 'GB-SCT', 'BR', 'Hard Rock Stadium', 'Miami'),
  ('Grupos', 'C', '2026-06-24 18:00:00-04', 'Marruecos', 'Haití', 'MA', 'HT', 'Mercedes-Benz Stadium', 'Atlanta'),
  ('Grupos', 'A', '2026-06-24 21:00:00-04', 'Chequia', 'México', 'CZ', 'MX', 'Estadio Azteca', 'Ciudad de México'),
  ('Grupos', 'A', '2026-06-24 21:00:00-04', 'Sudáfrica', 'República de Corea', 'ZA', 'KR', 'Estadio BBVA', 'Monterrey'),
  ('Grupos', 'E', '2026-06-25 16:00:00-04', 'Curazao', 'Costa de Marfil', 'CW', 'CI', 'Lincoln Financial Field', 'Filadelfia'),
  ('Grupos', 'E', '2026-06-25 16:00:00-04', 'Ecuador', 'Alemania', 'EC', 'DE', 'MetLife Stadium', 'Nueva York (East Rutherford)'),
  ('Grupos', 'F', '2026-06-25 19:00:00-04', 'Japón', 'Suecia', 'JP', 'SE', 'AT&T Stadium', 'Dallas (Arlington)'),
  ('Grupos', 'F', '2026-06-25 19:00:00-04', 'Túnez', 'Países Bajos', 'TN', 'NL', 'Arrowhead Stadium', 'Kansas City'),
  ('Grupos', 'D', '2026-06-25 22:00:00-04', 'Turquía', 'Estados Unidos', 'TR', 'US', 'SoFi Stadium', 'Los Ángeles (Inglewood)'),
  ('Grupos', 'D', '2026-06-25 22:00:00-04', 'Paraguay', 'Australia', 'PY', 'AU', 'Levi''s Stadium', 'San Francisco (Santa Clara)'),
  ('Grupos', 'I', '2026-06-26 15:00:00-04', 'Noruega', 'Francia', 'NO', 'FR', 'Gillette Stadium', 'Boston (Foxborough)'),
  ('Grupos', 'I', '2026-06-26 15:00:00-04', 'Senegal', 'Irak', 'SN', 'IQ', 'BMO Field', 'Toronto'),
  ('Grupos', 'H', '2026-06-26 20:00:00-04', 'Cabo Verde', 'Arabia Saudí', 'CV', 'SA', 'NRG Stadium', 'Houston'),
  ('Grupos', 'H', '2026-06-26 20:00:00-04', 'Uruguay', 'España', 'UY', 'ES', 'Estadio Akron', 'Guadalajara'),
  ('Grupos', 'G', '2026-06-26 23:00:00-04', 'Egipto', 'RI de Irán', 'EG', 'IR', 'Lumen Field', 'Seattle'),
  ('Grupos', 'G', '2026-06-26 23:00:00-04', 'Nueva Zelanda', 'Bélgica', 'NZ', 'BE', 'BC Place', 'Vancouver'),
  ('Grupos', 'L', '2026-06-27 17:00:00-04', 'Panamá', 'Inglaterra', 'PA', 'GB-ENG', 'MetLife Stadium', 'Nueva York (East Rutherford)'),
  ('Grupos', 'L', '2026-06-27 17:00:00-04', 'Croacia', 'Ghana', 'HR', 'GH', 'Lincoln Financial Field', 'Filadelfia'),
  ('Grupos', 'K', '2026-06-27 19:30:00-04', 'Colombia', 'Portugal', 'CO', 'PT', 'Hard Rock Stadium', 'Miami'),
  ('Grupos', 'K', '2026-06-27 19:30:00-04', 'RD Congo', 'Uzbekistán', 'CD', 'UZ', 'Mercedes-Benz Stadium', 'Atlanta'),
  ('Grupos', 'J', '2026-06-27 22:00:00-04', 'Argelia', 'Austria', 'DZ', 'AT', 'Arrowhead Stadium', 'Kansas City'),
  ('Grupos', 'J', '2026-06-27 22:00:00-04', 'Jordania', 'Argentina', 'JO', 'AR', 'AT&T Stadium', 'Dallas (Arlington)')
) as v(fase, grupo, fecha, equipo_local, equipo_visita, pais_local, pais_visita, estadio, ciudad)
where not exists (
  select 1 from partidos p
  where p.equipo_local = v.equipo_local
    and p.equipo_visita = v.equipo_visita
    and p.fecha = v.fecha::timestamptz
);

-- Verificacion: deberian aparecer los partidos del 24 al 27 de junio (programados).
select id, grupo, fecha, equipo_local, equipo_visita, estado
from partidos
where fecha >= '2026-06-24 00:00:00-04' and fecha < '2026-06-28 00:00:00-04'
order by fecha;
