"""Inspector de la API worldcup26.ir.

Corre TODOS los endpoints conocidos y muestra:
  - cuantos elementos trae cada uno,
  - todos los campos (keys) del primer elemento con un ejemplo de valor,
  - el primer elemento completo en JSON.

Uso (en tu PC, con la app cerrada o en otra terminal):
    python robot/_inspeccion_api.py

Luego copia y pega TODA la salida en el chat. Es solo lectura: no escribe nada.
"""
import json
import urllib.request

BASE = "https://worldcup26.ir"
ENDPOINTS = ["games", "teams", "groups", "stadiums"]


def traer(ep: str):
    url = f"{BASE}/get/{ep}"
    with urllib.request.urlopen(url, timeout=25) as r:
        data = json.load(r)
    # algunos endpoints vienen como {"<algo>": [...]}, otros como [...]
    if isinstance(data, dict):
        # si tiene una sola llave que es lista, la desempacamos
        listas = {k: v for k, v in data.items() if isinstance(v, list)}
        if len(listas) == 1:
            return next(iter(listas.values())), data
        return data, data
    return data, data


def describir(ep: str):
    print("=" * 70)
    print(f"  /get/{ep}")
    print("=" * 70)
    try:
        items, crudo = traer(ep)
    except Exception as exc:  # noqa: BLE001
        print(f"  ERROR: {exc}\n")
        return

    if isinstance(items, list):
        print(f"  Total de elementos: {len(items)}")
        if not items:
            print("  (vacio)\n")
            return
        primero = items[0]
    else:
        print("  (no es una lista; es un objeto)")
        primero = items

    if isinstance(primero, dict):
        print(f"  Campos del primer elemento ({len(primero)}):")
        for k, v in primero.items():
            ejemplo = repr(v)
            if len(ejemplo) > 70:
                ejemplo = ejemplo[:67] + "..."
            print(f"    - {k}: {ejemplo}")
        print("\n  Primer elemento completo:")
        print(json.dumps(primero, indent=2, ensure_ascii=False))
    else:
        print(f"  Tipo inesperado: {type(primero).__name__} -> {primero!r}")
    print()


if __name__ == "__main__":
    print("Inspeccionando worldcup26.ir ...\n")
    for ep in ENDPOINTS:
        describir(ep)
    print("Listo. Copia toda esta salida y pegala en el chat.")
