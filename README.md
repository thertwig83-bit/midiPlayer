# PartiturPlayer – Interaktive MusicXML Übungshilfe & PWA

Eine moderne Web-App und Progressive Web App (PWA) zum Einlesen von MusicXML-Partituren und zum gezielten Üben einzelner Stimmen auf Laptop, PC und Android-Tablets.

---

## ✨ Hauptfunktionen

1. **MusicXML Partituren einlesen:**
   - Unterstützt unkomprimierte `.musicxml` und `.xml` sowie komprimierte `.mxl` Partiturdateien direkt vom lokalen Datenträger.
   - Drag & Drop und Datei-Auswahldialog.
   - Mitgelieferte Beispiel-Partituren (u. a. Beethovens *Ode an die Freude* für 4 Stimmen SATB und J.S. Bachs Choral *O Haupt voll Blut und Wunden*).
   - Zuletzt geöffnete Dateien werden lokal gespeichert und stehen mit einem Fingertipp bereit.

2. **Gezielte Stimmen-Auswahl zum Üben:**
   - **Solo:** Mit einem Klick auf *Solo* wird eine einzelne Stimme isoliert abgespielt.
   - **Auswahl:** Beliebige Kombinationen von Stimmen können gleichzeitig stummgeschaltet oder aktiviert werden.
   - **Alles:** Schnelltaste, um alle Stimmen gemeinsam einzuschalten.
   - **Lautstärkeregelung pro Stimme:** Die eigene Stimme kann z.B. auf 100% und die Begleitstimmen auf 30% geregelt werden – ideal zum Einstudieren!
   - **Klangfarbe pro Stimme:** Wähle zwischen Klavier, Chor/Gesang, Streichern, Orgel, Flöte, Bläsern oder Bass.

3. **Visuelle Notenanzeige & Positionslinie:**
   - Hochwertige SVG-Notendarstellung über *OpenSheetMusicDisplay (OSMD)*.
   - Gut sichtbare, rote Positionslinie, die während der Wiedergabe Takt für Takt und Note für Note mitwandert.
   - Automatische Nachführung der Ansicht (Auto-Scroll), damit die aktuelle Spielposition stets im sichtbaren Bereich bleibt.
   - Zoom-Funktion (+ / - / Reset) für optimale Lesbarkeit auf kleinen und großen Bildschirmen.

4. **Tippen zum Springen (Click-to-Seek):**
   - Tippe oder klicke an eine beliebige Stelle in den Noten: Der Positionszeiger und die Audiowiedergabe springen sofort dorthin.

5. **Wiedergabesteuerung & Übungshilfen:**
   - Start / Pause / Stopp.
   - Takt vor / Takt zurück.
   - Tempo-Anpassung (BPM-Schieberegler und Geschwindigkeitsstufen: 0.75x, 1.0x, 1.25x).
   - **Metronom:** Zuschaltbarer Takt-Klick.
   - **A-B Loop (Übungsschleife):** Bestimmte Takte können automatisch in einer Endlosschleife wiederholt werden.

6. **PWA-Unterstützung (Laptop & Android Tablet):**
   - Vollständige Offline-Fähigkeit durch Service Worker und Web Audio Synthesizer (keine Internetverbindung während des Übens erforderlich!).
   - Kann im Chrome-Browser auf Android („Zum Startbildschirm hinzufügen“ oder „App installieren“) wie eine native Tablet-App installiert werden.

---

## 🚀 Schnellstart & Entwicklung

### Voraussetzungen
- Node.js (ab Version 18)
- npm

### Installation der Abhängigkeiten
```bash
npm install
```

### Entwicklungs-Server starten
```bash
npm run dev
```
Die App steht anschließend unter `http://localhost:5173` im Browser bereit.

### Für Produktion bauen
```bash
npm run build
```
Die fertigen statischen Dateien liegen im Ordner `dist/` und können auf jedem Webserver oder lokalen Server gehostet werden.

### Vorschau der Produktionsversion
```bash
npm run preview
```

---

## 📱 Installation als PWA auf einem Android-Tablet

1. Öffne die Web-App im Chrome-Browser auf deinem Android-Tablet.
2. Tippe oben rechts auf die drei Punkte (`⋮`).
3. Wähle **„Zum Startbildschirm hinzufügen“** bzw. **„App installieren“**.
4. Die App erscheint nun mit eigenem Icon auf deinem Startbildschirm und öffnet sich im Vollbildmodus ohne störende Browserleisten.

---

## 📄 Danksagung & Lizenzen (Credits & Third-Party Licenses)

Dieses Projekt nutzt folgende Open-Source-Bibliotheken und Audio-Ressourcen:

- **OpenSheetMusicDisplay (OSMD):** Notendarstellung via VexFlow ([MIT License](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay))
- **SoundFonts / Audio Samples:**
  - *FluidR3 GM* (Violine, Bass) von Frank Wen ([MIT License](https://github.com/urish/cinto/blob/master/soundfonts/FluidR3%20GM.md))
  - *GeneralUser GS* (Klavier, Orgel, Chor, Bläser, Flöte) von S. Christian Collins ([GeneralUser GS License](http://www.schristiancollins.com/generaluser.php))
  - Konvertiert und bereitgestellt über das [WebAudioFont](https://github.com/surikov/webaudiofont)-Ökosystem.
- **Icons:** [Lucide Icons](https://lucide.dev/) (ISC License)
- **UI & Framework:** React & Vite (MIT License)

