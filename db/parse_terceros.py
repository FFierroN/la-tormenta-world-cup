#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
parse_terceros.py  ·  Genera los INSERT de terceros_asignacion (matriz FIFA).

Lee el HTML de Wikipedia ("2026 FIFA World Cup knockout stage") y extrae la
tabla "Combinations of matches in the round of 32" (495 filas). Por cada fila:
  - combinacion  = los 8 grupos (A-L) cuyos terceros clasifican (en negrita)
  - assignments  = a que tercero enfrenta cada ganador de grupo (3X)

Las 8 columnas de asignacion son FIJAS en este orden (encabezado de la tabla):
  1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L
y cada una corresponde a un slot de nuestro cuadro (CARGA-TEMPLATE-LLAVES.sql):
  1A->P79  1B->P85  1D->P81  1E->P74  1G->P82  1I->P77  1K->P87  1L->P80

Salida: db/CARGA-TERCEROS.sql  (INSERTs idempotentes).
"""
import re
import sys

HTML = r"C:\Users\vn5affh\Downloads\2026 FIFA World Cup knockout stage - Wikipedia.html"
OUT  = r"C:\Users\vn5affh\Projects\Code Puppy\MIPROYECTO\db\CARGA-TERCEROS.sql"

# Columna de asignacion (en orden del encabezado) -> slot de nuestro cuadro.
COL_SLOT = ["P79", "P85", "P81", "P74", "P82", "P77", "P87", "P80"]
COL_GANADOR = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"]

def main():
    with open(HTML, "r", encoding="utf-8") as f:
        html = f.read()

    # Aislar la tabla de combinaciones (desde su caption hasta el cierre </table>).
    inicio = html.find("Combinations of matches in the round of 32</caption>")
    if inicio == -1:
        # fallback: buscar el caption sin el toggle
        inicio = html.find("Combinations of matches in the round of 32")
    tabla = html[inicio:]
    fin = tabla.find("</table>")
    tabla = tabla[:fin]

    # Cada fila de datos empieza con <th scope="row">N
    filas = re.split(r'<th scope="row">', tabla)[1:]
    print(f"Filas candidatas: {len(filas)}")

    registros = []  # (combinacion, grupo_tercero, slot)
    vistas = 0
    for fila in filas:
        # numero de opcion (no lo usamos, pero valida que es fila real)
        mnum = re.match(r"\s*(\d+)", fila)
        if not mnum:
            continue
        # combinacion: las letras en negrita <b>X</b> (8 grupos, en orden A..L)
        combinacion = "".join(re.findall(r"<b>([A-L])</b>", fila))
        # asignaciones: celdas <td ...>3X</td> en orden de columna (8)
        assigns = re.findall(r"<td[^>]*>\s*3([A-L])\s*</td>", fila)
        if len(combinacion) != 8 or len(assigns) != 8:
            # fila no estandar (encabezado repetido, etc.): saltar
            continue
        vistas += 1
        for i, grupo3 in enumerate(assigns):
            registros.append((combinacion, grupo3, COL_SLOT[i]))

    print(f"Combinaciones parseadas: {vistas}  (esperado 495)")
    print(f"Registros (8 x comb):    {len(registros)}  (esperado 3960)")

    if vistas != 495:
        print("!!! ADVERTENCIA: no se parsearon 495 combinaciones. Revisar HTML.")

    # Escribir SQL idempotente.
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("-- =====================================================================\n")
        f.write("-- CARGA-TERCEROS.sql  ·  Matriz oficial FIFA de los 8 mejores terceros\n")
        f.write("-- Generado por db/parse_terceros.py desde el HTML de Wikipedia (Annex C).\n")
        f.write(f"-- {vistas} combinaciones x 8 = {len(registros)} filas.\n")
        f.write("-- Requisito: correr antes db/SETUP-LLAVES.sql (crea terceros_asignacion).\n")
        f.write("-- Idempotente: limpia y recarga.\n")
        f.write("-- =====================================================================\n\n")
        f.write("truncate table terceros_asignacion;\n\n")
        f.write("insert into terceros_asignacion (combinacion, grupo_tercero, slot) values\n")
        lineas = [f"  ('{c}','{g}','{s}')" for (c, g, s) in registros]
        f.write(",\n".join(lineas))
        f.write(";\n\n")
        f.write("-- Verificacion: deberia dar 3960 y 495.\n")
        f.write("select count(*) as filas, count(distinct combinacion) as combinaciones\n")
        f.write("from terceros_asignacion;\n\n")
        f.write("-- Tras cargar la matriz, intenta rellenar terceros si ya cerraron los grupos:\n")
        f.write("select propagar_llaves();\n")

    print(f"OK -> {OUT}")

if __name__ == "__main__":
    main()
