# 🏛️ VIA ROMANA

**Ein 3D-Endless-Runner durch das antike Rom — direkt im Browser.**

Renne als Legionär über eine endlose römische Straße, springe über gestürzte Säulen, rutsche unter Torbalken hindurch, sammle Denare und weiche entgegenkommenden Streitwagen aus. Gebaut mit [Three.js](https://threejs.org/) — ohne Build-Schritt, ohne Abhängigkeiten zum Installieren. Hochladen, deployen, losrennen.

---

## 🎮 Steuerung

| Aktion | Tastatur | Touch (Handy/Tablet) |
|---|---|---|
| Spur wechseln | `←` `→` oder `A` `D` | Nach links/rechts wischen |
| Springen | `↑`, `W` oder `Leertaste` | Nach oben wischen **oder tippen** |
| Rutschen / Sturzflug | `↓` oder `S` | Nach unten wischen |
| Pause | `P` oder `Esc` | — |

**Profi-Trick:** Drückst du in der Luft „runter“, stürzt du blitzschnell zu Boden und rutschst sofort — perfekt für Sprung-Rutsch-Kombos.

## ✨ Features

- **3D-Welt im goldenen Abendlicht**: Kolonnaden, Tempel, Aquädukte, Marktstände, Statuen, Zypressen und flackernde Feuerschalen — alles prozedural, ohne externe Assets.
- **4 Power-ups:**
  - 🛡️ **Schild der Legion** — verzeiht genau einen Treffer (zerschmettert das Hindernis).
  - 🧲 **Magnet-Amulett** — zieht 8 Sekunden lang alle Denare an.
  - 👟 **Merkurs Sandalen** — Tempo-Boost + unverwundbar: renn einfach durch alles hindurch!
  - 🌿 **Lorbeer des Ruhms** — verdoppelt 10 Sekunden lang alle Punkte (×II).
- **Streitwagen-Events**: Ab mittlerer Schwierigkeit donnern dir Streitwagen entgegen — mit Hornsignal als Warnung.
- **Steigende Schwierigkeit**: Tempo, Musterdichte und Musterkomplexität wachsen mit der Distanz; jedes Muster hat garantiert einen überlebbaren Pfad.
- **Meilensteine alle 500 m** mit römischen Ziffern (D, M, MD …), Fanfare, Bonuspunkten und SPQR-Triumphbögen über der Straße.
- **Klares Feedback**: Near-Miss-Boni („Knapp! +15“), Punkte-Popups, Partikel (Staub, Funken, Trümmer, Goldspur), Screen-Shake, Treffer-Vignette und Zeitlupen-Sturz.
- **Shop & Charaktere:** Sammle Denare und schalte neue Skins frei – z. B. den **Gladiator** (Murmillo) für 300 Denare. Im Charaktermenü wählst du deinen Läufer; das Modell dreht sich live in 3D. Highscore, Denare, Besitz und ausgewählter Skin werden lokal gespeichert (`localStorage`).
- **Sound komplett synthetisiert** (WebAudio): Münzen, Sprünge, Crash, Fanfaren und eine dezente generative „Lyra“-Hintergrundmusik — per 🔊-Knopf abschaltbar.
- **Mobil-optimiert**: Touch-Gesten, Safe-Areas, gedeckelte Pixel-Ratio und adaptive Qualität (Schatten werden bei schwacher Hardware automatisch reduziert).

## 🚀 Deployment: GitHub → Vercel (ohne Konfiguration)

1. **Repository anlegen**: Auf [github.com](https://github.com) ein neues Repository erstellen (z. B. `via-romana`).
2. **Dateien hochladen**: Den kompletten Inhalt dieses Ordners hochladen — per `git push` oder direkt im Browser über *Add file → Upload files* (Drag & Drop des Ordnerinhalts). Wichtig: `index.html` muss im Repo-**Root** liegen.
3. **Mit Vercel verbinden**: Auf [vercel.com](https://vercel.com) → *Add New… → Project* → das Repository importieren.
4. **Einstellungen**: Framework Preset **„Other“** lassen, **kein** Build Command, **kein** Output Directory — einfach auf **Deploy** klicken.

Fertig! Vercel erkennt die statische Seite automatisch und liefert sie aus. Jeder weitere Push deployt automatisch neu.

> Three.js wird per CDN (jsDelivr) geladen; ein Importmap-Polyfill sorgt für Kompatibilität mit älteren Browsern.

## 💻 Lokal testen

ES-Module funktionieren nicht über `file://` — starte einen kleinen Server im Projektordner:

```bash
# Variante 1 (Node)
npx serve .

# Variante 2 (Python)
python3 -m http.server 8000
```

Dann `http://localhost:3000` bzw. `http://localhost:8000` öffnen.

## 🛠️ Anpassen

Fast alles Gameplay-Tuning liegt in **`js/config.js`**: Tempo, Schwerkraft, Sprungkraft, Power-up-Dauern, Spawn-Abstände, Punktwerte. Neue Hindernis-/Münz-Muster ergänzt du in **`js/director.js`**, neue Hindernistypen in **`js/obstacles.js`**, neue Seitendeko in **`js/world.js`**.

## 📁 Projektstruktur

```
via-romana/
├── index.html          Einstieg, Startseite (Landing) + UI-Struktur, Importmap
├── favicon.svg
├── css/style.css       Komplettes Styling (Tabula-Design + Startseite)
└── js/
    ├── main.js         Spielzustände, Loop, Kamera, Punkte, Power-up-Logik
    ├── landing.js      Startseite: prozedurale Hero-Szene & Reveal-Fallback
    ├── config.js       Alle Stellschrauben + Helfer
    ├── world.js        Himmel, Licht, Straße, Deko, Triumphbögen
    ├── player.js       Läufer: Skelett, Animationen, Physik, Hitbox, Skin-Wechsel
    ├── skins.js        Skins (Legionär, Gladiator) – austauschbares Aussehen
    ├── obstacles.js    Hindernistypen, Kollision, Near-Miss, Streitwagen
    ├── collectibles.js Denare & Power-ups (inkl. Magnet-Anziehung)
    ├── director.js     Musterwahl, Schwierigkeit, Event-Taktung
    ├── effects.js      Partikel & Screen-Shake
    ├── audio.js        Synthetisierte Sounds & generative Musik
    ├── input.js        Tastatur + Touch-Gesten
    ├── ui.js           Menüs, HUD, Banner, Popups
    └── textures.js     Prozedurale Canvas-Texturen
```

## 📜 Lizenz

MIT — siehe [LICENSE](LICENSE). Viel Spaß beim Laufen. **Ave!**
