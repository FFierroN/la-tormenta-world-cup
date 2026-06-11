-- =====================================================================
-- SNIPPET: FOTO DE FONDO DEL ULTIMO LUGAR (toggle on/off en Admin)
-- =====================================================================
-- Que hace: crea SOLO la llave de configuracion 'foto_ultimo_habilitada'
-- en la tabla 'configuracion'. No toca datos ni vistas. Es instantaneo,
-- idempotente y reversible.
--
-- Para que sirve: el panel de Admin tiene un interruptor que prende/apaga
-- la imagen de fondo del cuadro del ULTIMO lugar (pestana Tabla -> vista
-- con avatares). Esta llave es lo que ese interruptor lee/escribe.
--
-- La imagen en si vive en el frontend: app/public/ultimo.png
-- (si el archivo no existe, el cuadro se ve normal: el toggle no rompe nada).
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- Idempotente: si la corres de nuevo, no duplica ni pisa el valor actual.
-- =====================================================================

insert into configuracion (clave, valor)
values ('foto_ultimo_habilitada', 'false')
on conflict (clave) do nothing;

-- Verificacion: debe aparecer la llave (valor 'false' la primera vez).
select clave, valor, updated_at
from configuracion
where clave = 'foto_ultimo_habilitada';
