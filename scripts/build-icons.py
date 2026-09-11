"""Erzeugt die App-Icons aus der Wortmarke.

Die Wortmarke ist 260x65 (4:1) und waere als Icon unlesbar - in einem 192er-Icon
blieben davon rund 38 px Hoehe. Stattdessen wird das Monogramm "je" samt Krone
freigestellt, fuer den Kontrast auf Weiss umgefaerbt und zentriert gesetzt.

Die erzeugten PNGs werden committet: der Pages-Workflow hat kein Python.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(ROOT, "assets", "jeremias-logo.png")
NAVY = (6, 22, 44, 255)
MONOGRAM = (0, 0, 54, 57)


def mark():
    glyph = Image.open(LOGO).convert("RGBA").crop(MONOGRAM)
    pixels = glyph.load()
    for y in range(glyph.height):
        for x in range(glyph.width):
            r, g, b, a = pixels[x, y]
            # Das Blau der Wortmarke traegt auf dunklem Grund zu wenig Kontrast,
            # die gelbe Krone bleibt als Farbakzent stehen.
            if a > 0 and b > r + 30:
                pixels[x, y] = (255, 255, 255, a)
    return glyph


def render(size, coverage):
    glyph = mark()
    canvas = Image.new("RGBA", (size, size), NAVY)
    scale = size * coverage / max(glyph.width, glyph.height)
    scaled = glyph.resize((max(1, round(glyph.width * scale)), max(1, round(glyph.height * scale))), Image.LANCZOS)
    canvas.paste(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2), scaled)
    return canvas


# Androids maskable safe zone ist der eingeschriebene Kreis mit 80 % Durchmesser,
# nicht ein 80-%-Quadrat: fuer ein nahezu quadratisches Zeichen bleiben rund 54 %.
TARGETS = [
    ("assets/icon-192.png", 192, 0.70),
    ("assets/icon-512.png", 512, 0.70),
    ("assets/icon-maskable-512.png", 512, 0.52),
    ("assets/apple-touch-icon.png", 180, 0.66),
    ("assets/favicon-32.png", 32, 0.82),
]

for path, size, coverage in TARGETS:
    target = os.path.join(ROOT, path)
    render(size, coverage).save(target, "PNG", optimize=True)
    print(f"{path}: {size}x{size}, {os.path.getsize(target)} B")
