# BrickTally – zehn Logo-Konzepte

Stand: 15.10.2026. Reviewbare Konzeptauswahl für pke/bricktally.

## Ansehen

- [Beschriftete Übersicht (PNG)](overview.png) – alle zehn Richtungen auf einem Blatt.
- [Übersicht als editierbares SVG](overview.svg).
- [Review-Galerie](review.html) – lokal im Browser öffnen; je Konzept Hell-/Dunkelansicht, Einfarbtest, Originalgrößen, Detailblatt und Merken-Checkbox. Die Checkbox-Auswahl wird nicht gespeichert.

## Ausgangspunkt

Gelesen wurden README.md, index.html, styles.css, manifest-prod.json, bricktally-icon.svg, assets/favicon.svg, og-image.svg und package.json. Das vorhandene PNG-App-Icon wurde visuell geprüft.

BrickTally zählt Teile, prüft Sets auf Vollständigkeit, filtert Farben, zeigt Fortschritt, verwaltet den bisherigen Set-Verlauf und exportiert fehlende Teile bzw. Verifikationsbadges. Das bisherige Branding kombiniert Blau (#0055BF), einen weißen Stein und einen grünen Haken; im Header steht ein Stein-Emoji vor BrickTally. Die Oberfläche verwendet Arial und unterstützt helle und dunkle Ansichten.

Die Entwürfe übersetzen deshalb drei Motive: Baustein, Zählen und vollständiges Set. Die Schreibweise BrickTally und der bestehende Claim Every Brick Counts bleiben Bezugspunkte. Verschiedene Silhouetten tragen die Unterscheidung; Farbwechsel allein zählen hier nicht als neue Variante.

## Richtungen

| Nr. | Entwurf | Gestaltungsprinzip | Besonders geeignet für |
| --- | --- | --- | --- |
| 01 | Block Check | Haken als Negativform im zweinoppigen Stein | Verständlicher Anschluss an die heutige Marke |
| 02 | Five Count | Vier Steinsäulen mit fünftem Querstrich | Eigenständige Marke mit Bezug zu Tally |
| 03 | BT Modules | Geometrisches BT-Monogramm mit Noppen | GitHub-Avatar und kompakte Wort-Bild-Marke |
| 04 | Counted Cube | Isometrischer Steckkörper | Haptisches PWA-Icon |
| 05 | Full Circle | Fortschrittsring und vier Noppen | Fortschritt und Sammlung |
| 06 | Last Piece | Offenes Rasterfeld und letzter Stein | Motivation und Set-Vollständigkeit |
| 07 | Part Lens | Stein in einer Lupe | Sachliches Prüfwerkzeug |
| 08 | Verified Set | Schildform mit Noppen und Negativhaken | Verifikationsbadges |
| 09 | Brick Abacus | Zählschienen mit eckigen Perlen | Freundliche Sammler-Marke |
| 10 | Snap Fit | Zwei verzahnte Elemente | Abstrakte, längerfristige Dachmarke |

## Meine engere Auswahl

1. **02 Five Count:** Der Name und die Funktion werden in einem eigenen Zeichen verbunden. Die Strichliste funktioniert auch einfarbig; sie braucht bei Erstkontakt mehr Erklärung als ein Haken.
2. **01 Block Check:** Der direkteste Anschluss an das heutige Branding. Die integrierte Negativform reduziert Details und bleibt klein erkennbar. Das Motiv ist allerdings vertrauter und weniger eigenständig.
3. **10 Snap Fit:** Die eigenständigste abstrakte Richtung der Auswahl. Das Verzahnen steht für ein vollständiges Ganzes; der Zweck Teilezählen ist ohne Wortmarke weniger offensichtlich.

## Dateien pro Konzept

Jeder nummerierte Ordner enthält:

- mark.svg: Hauptzeichen, transparent, 100 × 100 ViewBox.
- mark-dark.svg: hellere Farbfassung für dunklen Grund.
- mark-mono.svg: eine dunkle Farbe mit weißem Kontrast bzw. weißen Negativdetails.
- lockup.svg und lockup-dark.svg: Wort-Bild-Marke, transparenter Grund.
- mark-16.png, mark-32.png, mark-64.png, mark-512.png: Rasterexporte des Zeichens mit Alpha.
- app-icon.svg und app-icon-512.png: Studien einer weißen abgerundeten App-Kachel.
- detail.svg und detail.png: beschriftetes Detailblatt mit Hell-/Dunkelansicht, Einfarbtest und Abwägung.

concepts.json enthält Namen, Begründungen, Farben und Einsatzideen. build-concepts.cjs ist die reproduzierbare Quelle für alle zehn Entwürfe und die Vergleichsdateien. Alle Vektoren bestehen aus einfachen Formen/Pfaden; nur Beschriftungen und die Wortmarke bleiben SVG-Text.

## Technik und Prüfung

Der Imagegen-Skill wurde gelesen und für die Wahl des Formats berücksichtigt: Da das vorhandene Branding repo-native SVG-Dateien nutzt und die Zeichen geometrisch sind, wurden direkte Vektorentwürfe erstellt. Es wurden keine KI-Rasterbilder oder externen Referenzbilder eingesetzt.

Die Hauptwortmarke verwendet Segoe UI Bold, Arial als Fallback; in der Übersicht wird für einen fairen Vergleich dieselbe Wortmarke verwendet. Die PNGs fixieren das gerenderte Erscheinungsbild. Bei SVG-Ansichten auf anderen Systemen kann die Schrift abweichen. Nach der Auswahl sollten die finale Wortmarke in Pfade umgewandelt sowie Abstand, kleine Pixelgrößen und PWA-Safe-Areas gezielt optimiert werden. Die App-Kacheln sind Konzeptansichten, keine geprüften maskable PWA-Assets.

Die Übersicht und ausgewählte Detailblätter wurden visuell geprüft. Alle 71 SVGs wurden erfolgreich zu PNG gerendert; alle 40 gelieferten transparenten Zeichengrößen wurden auf Abmessungen und Alpha geprüft. Die 16-Pixel-Exporte dienen der Beurteilung und sind noch keine separat gezeichneten Favicons.

Zum erneuten Exportieren: Node.js mit installiertem sharp verwenden und im Konzeptordner node build-concepts.cjs ausführen. Der Generator erkennt zusätzlich den lokal gebündelten Codex-Runtime-Pfad.

Alle erstellten Dateien liegen ausschließlich in diesem Konzeptordner. Keine Anwendungsdatei und keine Set-Editor-Datei wurde durch diese Arbeit geändert. Es wurde kein Commit erstellt.
