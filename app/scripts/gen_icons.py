"""Genera los iconos de la PWA y el favicon a partir del logo maestro.

Uso:  python scripts/gen_icons.py <ruta_logo>
Deja todo en app/public/. Reproducible: si cambia el logo, se vuelve a correr.
"""
import sys
from pathlib import Path

from PIL import Image

ORIGEN = Path(sys.argv[1]) if len(sys.argv) > 1 else None
PUBLIC = Path(__file__).resolve().parent.parent / "public"


def recorte_cuadrado(img: Image.Image) -> Image.Image:
    """Recorta al centro para dejar la imagen cuadrada (los iconos lo exigen)."""
    w, h = img.size
    lado = min(w, h)
    izq = (w - lado) // 2
    arr = (h - lado) // 2
    return img.crop((izq, arr, izq + lado, arr + lado))


def main() -> None:
    if not ORIGEN or not ORIGEN.exists():
        raise SystemExit(f"No encuentro el logo: {ORIGEN}")

    PUBLIC.mkdir(parents=True, exist_ok=True)
    base = Image.open(ORIGEN).convert("RGB")

    # Color del fondo (esquina sup-izq) -> para tema de la PWA.
    print("Color de fondo del logo (RGB):", base.getpixel((4, 4)))

    # Logo completo (con texto) para la pantalla de Login.
    base.save(PUBLIC / "logo.png")

    cuadrado = recorte_cuadrado(base)
    objetivos = {
        "pwa-192x192.png": 192,
        "pwa-512x512.png": 512,
        "apple-touch-icon.png": 180,
        "favicon.png": 48,
    }
    for nombre, lado in objetivos.items():
        cuadrado.resize((lado, lado), Image.LANCZOS).save(PUBLIC / nombre)
        print("OK", nombre, f"{lado}x{lado}")

    # favicon.ico multi-tamano
    cuadrado.resize((64, 64), Image.LANCZOS).save(
        PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print("OK favicon.ico")


if __name__ == "__main__":
    main()
