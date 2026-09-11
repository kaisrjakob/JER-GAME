# UNFAIR JEREMIAS // NACHTSCHICHT

Ein handgebautes Rage-Platformer-Spiel im Stil klassischer „Unfair“-Jump-’n’-Runs – vollständig als Jeremias-Abgastechnik-Welt inszeniert. Ziel ist der große FSA-X-Industrieschornstein am Ende der Nachtschicht. Unsichtbare Klemmband-Fallen, fallende DW-Elemente, Druckstöße aus Prüföffnungen und einstürzende Wartungsdächer machen den Weg bewusst gemein, aber lernbar.

**Live:** https://kaisrjakob.github.io/JER-GAME/

## Ziel und Steuerung

- **A / D** oder **Pfeiltasten**: laufen
- **W**, **Pfeil hoch** oder **Leertaste**: springen
- **R**: sofort zum letzten Jeremias-Servicepunkt zurückkehren
- **Escape / P**: Pause

## Auf dem Handy

Das Spiel läuft unter derselben URL im Querformat bildfüllend. Die Spielhöhe ist fix, die sichtbare Breite wächst mit dem Seitenverhältnis bis 20:9 mit – ein 19,5:9-Handy sieht also nicht weniger, sondern etwas mehr als ein 16:9-Desktop.

- Daumen links: **←** und **→**, der Finger darf zwischen beiden gleiten, ohne abzusetzen
- Daumen rechts: **SPRUNG**, halten für einen höheren Sprung
- Tippen irgendwo sonst springt ebenfalls
- Die Trefferflächen sind deutlich größer als die sichtbaren Pads und halten Abstand zu den Bildschirmkanten, damit Wischgesten des Systems nicht auslösen

Im Hochformat erscheint ein Dreh-Hinweis. Wer die Displaysperre aktiv hat, dreht die Ansicht dort per Knopf in die gewünschte Richtung; im Pause-Menü lässt sich das jederzeit wieder ändern.

Die Effektstufe (Schatten, Partikel, Parallax-Ebenen, Pixeldichte) passt sich automatisch an die gemessene Leistung an und lässt sich in den gespeicherten Einstellungen festnageln.

## Jeremias-Spielwelt

- Drei Abschnitte: **DW-FU**, **DW-VISION** und **FSA-X**
- Spielfigur als Jeremias-Servicetechniker in Blau und Orange
- Plattformen als Edelstahl-Wartungsdächer mit Klemmbändern und Systemkennzeichnung
- Sammelobjekte als orange Jeremias-Klemmbänder
- Checkpoints als Jeremias-Servicepunkte mit Firmenlogo
- Fallen aus Kaminhauben, DW-Elementen und Prüföffnungen
- Realistisch freigestellte Edelstahl-Bauteile statt gezeichneter Platzhalter
- Bewegliche, flüchtende und vertikal verfahrende Klemmband-Sammelobjekte
- Seitlich losschießende Kaminhauben und bis zur Auslösung verborgene Rohrmagazine
- Zielbauwerk als großer, gebrandeter FSA-X-Industrieschornstein

Jede Falle besitzt mindestens einen reproduzierbaren Lösungsweg. Fallende DW-Elemente sind niedriger als die maximale Sprunghöhe und werden zusätzlich nach kurzer Zeit wieder eingezogen.

Es werden keine Nintendo- oder Mario-Grafiken, Figuren, Musikstücke oder Markenzeichen verwendet.

## Entwicklung

Das Spiel ist eine statische Canvas-Webanwendung ohne Laufzeit-Abhängigkeiten:

```powershell
python -m http.server 4173
```

Danach `http://127.0.0.1:4173/` öffnen.

```powershell
npm test
npm run check
```

## Technik und Datenschutz

Canvas 2D rendert das Level mit festem Simulationsschritt in einem 900 Einheiten hohen Koordinatenraum; die Breite ergibt sich zur Laufzeit aus dem Seitenverhältnis. Musik und Effekte entstehen lokal über Web Audio. Highscore und Audioeinstellung bleiben im Browser. Es gibt kein Backend, keine Cookies, kein Tracking und keine Übertragung von Spieldaten.

## Bildquellen

- Offizielles Logo: Jeremias Abgastechnik GmbH, https://jeremias.de/
- Produktreferenz Doppelwandiger Edelstahlschornstein: https://jeremias.de/edelstahlschornstein
- Systemreferenz Industrieschornstein: https://jeremias.de/industrieschornstein
- Die drei text- und logofreien Hintergrundwelten wurden für dieses Projekt mit OpenAIs eingebauter Bildgenerierung erstellt und lokal optimiert.
- Die freigestellten Sprites für Klemmband, DW-Rohrelement und Kaminhaube wurden ebenfalls mit der eingebauten Bildgenerierung als realistische Produktmotive erstellt, per Chroma-Key freigestellt und lokal optimiert.
