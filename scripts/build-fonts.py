"""Erzeugt die woff2-Subsets aus den Originalschriften.

Die Unicode-Bereiche muessen alle Zeichen abdecken, die in index.html, style.css und
den Canvas-Beschriftungen vorkommen; tests/fonts.test.mjs prueft das gegen die Fonts.
"""
import glob
import os
from fontTools.subset import main as subset_main

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "fonts")
UNICODES = ",".join([
    "U+0020-007E", "U+00A0-00FF", "U+0100-017F",
    "U+2010-2027", "U+20AC", "U+2044", "U+00D7",
    "U+2160-2163",            # Roemische Ziffern: Pause-Knopf
    "U+2190-2193",            # Pfeile: Laufrichtung
    "U+21BA", "U+21BB",       # Drehpfeile: Hochformat-Overlay
    "U+25AD", "U+25A1",       # Rechtecke: Geraetesymbol
    "U+266A", "U+266B",       # Noten: Audio-Knopf
])

for source in sorted(glob.glob(os.path.join(ROOT, "*.ttf"))):
    target = source[:-4] + ".woff2"
    subset_main([
        source, f"--unicodes={UNICODES}", "--flavor=woff2",
        "--layout-features=kern,liga,clig,calt", "--desubroutinize",
        "--drop-tables+=DSIG", f"--output-file={target}",
    ])
    print(f"{os.path.basename(target)}: {os.path.getsize(target) // 1024} KB")
