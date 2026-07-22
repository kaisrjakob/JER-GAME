# JEREMIAS: DRAUGHT RIDER

Ein schneller 2.5D-Flow-Runner durch drei von Jeremias Abgastechnik inspirierte Systemwelten. Die Kampagne führt von einem doppelwandigen Edelstahlschornstein über eine Designstrecke bis in einen großen Industrieschornstein und geht anschließend in den Endless Flow über.

**Live:** https://kaisrjakob.github.io/JER-GAME/

## Steuerung

- Maus oder A/D beziehungsweise Pfeiltasten: um die Innenwand steuern
- W, Pfeil hoch oder Leertaste: Boost
- S oder Pfeil runter: bremsen
- Escape oder P: Pause

Auf Touch-Geräten folgt der Rider dem Finger; der rechte Bildschirmrand aktiviert den Boost.

## Spielsystem

- Strömungstore erhöhen Score und Multiplikator.
- Orange Energieimpulse füllen den Boost.
- Knappe Ausweichmanöver liefern Bonuspunkte.
- Drei Kollisionen beenden den Lauf.
- Highscore, Tutorialstatus und Audioeinstellung werden ausschließlich lokal im Browser gespeichert.

## Entwicklung

Das Spiel benötigt keine Laufzeit-Abhängigkeiten und läuft direkt als statische Website:

```powershell
python -m http.server 4173
```

Danach `http://127.0.0.1:4173/` öffnen.

```powershell
npm test
npm run check
```

## Technik und Datenschutz

Canvas 2D rendert den pseudo-räumlichen Tunnel mit festem Simulationsschritt. Musik und Effekte entstehen zur Laufzeit über Web Audio. Es gibt kein Backend, keine Cookies, kein Tracking, keine Online-Rangliste und keine Übertragung von Spieldaten.

## Bildquellen

- Offizielles Logo: Jeremias Abgastechnik GmbH, https://jeremias.de/
- Produktreferenz Doppelwandiger Edelstahlschornstein: https://jeremias.de/edelstahlschornstein
- Systemreferenz Industrieschornstein: https://jeremias.de/industrieschornstein
- Die drei text- und logofreien Spielhintergründe wurden für dieses Projekt mit OpenAIs eingebauter Bildgenerierung erstellt und lokal optimiert.
