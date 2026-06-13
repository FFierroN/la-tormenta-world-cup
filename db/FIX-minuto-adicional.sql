-- =====================================================================
-- FIX: minuto de descuento (anadido) en los eventos.
-- =====================================================================
-- Los goles en tiempo de descuento (ej. "45+5'", "90+8'") se perdian en el
-- detalle porque 'minuto' es int y la vieja regex los descartaba. Ahora
-- guardamos el minuto base en 'minuto' y el anadido en 'minuto_adicional'.
-- Asi el detalle muestra "45+5'" y no hay colisiones entre dos goles del
-- mismo jugador en el mismo descuento (ej. 90+2 y 90+5).
--
-- Idempotente, no borra nada.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

alter table partido_eventos add column if not exists minuto_adicional int;

-- Refresca el cache de PostgREST para que el front y los bots la vean YA.
notify pgrst, 'reload schema';

-- Verificacion: deberia listar la columna nueva.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'partido_eventos'
  and column_name = 'minuto_adicional';
