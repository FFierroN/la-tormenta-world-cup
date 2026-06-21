-- FIX-foto-primero.sql
-- Crea la llave de configuracion para el toggle "Foto del primer lugar"
-- (espejo de 'foto_ultimo_habilitada'). El panel de Admin hace UPDATE sobre
-- esta fila, asi que tiene que existir. Idempotente.
--
-- Como correrlo: pegar en el SQL Editor de Supabase y ejecutar.
-- Ademas: deja la imagen del fondo en app/public/primero.png

insert into configuracion (clave, valor)
values ('foto_primero_habilitada', 'false')
on conflict (clave) do nothing;
