# AgroSfer : logo motion

Animation du logo d'[AgroSfer](https://agrosfer.co/) reprenant la direction artistique de la vidéo TikTok de référence (« White Pillar Studios », @mrwhite_310).

| Format | Fichier |
| --- | --- |
| 16:9 · 1920×1080 · 30 i/s · 10 s | [`videos/agrosfer_motion_16x9.mp4`](videos/agrosfer_motion_16x9.mp4) |
| 9:16 · 1080×1920 · 30 i/s · 10 s (TikTok / Reels / Shorts) | [`videos/agrosfer_motion_9x16.mp4`](videos/agrosfer_motion_9x16.mp4) |

## Concept

Ce que reprend la référence :

- un fond blanc, des formes plates en silhouette sombre, un flou de mouvement marqué ;
- un objet lancé qui tournoie, retombe et rebondit, puis une deuxième pièce qui tombe et vient s'emboîter ;
- un faisceau de lumière jaune pâle qui **ne révèle le logo que là où il éclaire** ;
- une orbite rapide autour du logo, après quoi le logo est aspiré dans l'objectif ;
- un volet sombre tiré par l'objet, avec le titre en capitales serif crème ;
- un volet clair qui tombe du haut et pousse le volet sombre, avec une tagline en serif.

Ce qui change pour AgroSfer :

- **Le projecteur de cinéma devient un drone agricole.** La silhouette garde un corps et un dôme-objectif, comme la caméra de la référence. Son faisceau évoque le scan et la traçabilité, et la « visibilité » offerte aux industriels.
- **Le logo est le globe et la pousse d'AgroSfer**, en couleurs. La pousse grandit quand la lumière l'atteint.
- **La palette est celle de la marque** : vert #7AA83E et bleu #4D8BAE (logo), noir teinté vert #14251C (drone et volet), lumière #F2F5C6.
- **Titre** : `AGROSFER`, en Cinzel.
- **Tagline** : *Cultiver. Tracer. Connecter.* (Libre Baskerville). Elle reprend les trois axes du site : production des coopératives, traçabilité, mise en relation avec les industriels.
- **Carte de fin** : logo et `agrosfer.co` (Montserrat, la police du site).

## Déroulé (secondes)

| t | Action |
| --- | --- |
| 0.0–0.9 | Le corps du drone est lancé, tournoie et atterrit. |
| 0.95–2.0 | Le bras-rotors tombe, flotte, puis s'emboîte avec un « clac ». |
| 2.0–2.46 | Les hélices démarrent, le drone décolle et le dôme-caméra sort. |
| 2.46 | La lumière s'allume : le logo apparaît dans le faisceau et la pousse grandit. |
| 2.95–5.1 | Six passages rapides du drone autour du logo. |
| 5.45–5.8 | Le logo est aspiré dans l'objectif. |
| 5.85–7.05 | Le drone file à droite, puis tire le volet sombre `AGROSFER`. |
| 7.55–8.05 | Le volet clair tombe : *Cultiver. Tracer. Connecter.* |
| 8.35–10 | Carte de fin : logo et agrosfer.co. |

Le sound design est entièrement synthétisé et calé sur ces événements : whooshs, impacts, clac, allumage lumineux, aspiration, carillon final, ainsi que le bourdonnement du drone spatialisé gauche/droite.

## Régénérer les vidéos

Il faut Node 18+, Playwright (Chromium), ffmpeg, et Python 3 avec numpy et scipy.

```bash
cd motion
npm install                      # playwright
pip install numpy scipy
node render.mjs --format 16x9    # -> videos/agrosfer_motion_16x9.mp4
node render.mjs --format 9x16    # -> videos/agrosfer_motion_9x16.mp4
node render.mjs --stills 2.6,7.8 # images de contrôle -> motion/out/stills
```

Options : `--samples 16` (sous-images de flou de mouvement par image), `--fps 30` et `--no-audio`.

Pour un aperçu en temps réel dans un navigateur, servez le dossier (`npx serve motion`), puis ouvrez `index.html?preview`, ou `index.html?preview&format=9x16` pour le vertical.

Organisation des fichiers :

- `motion/scene.js` : toute l'animation. Elle est définie en fonction du temps : la timeline `T`, les orbites `ORBIT`, les couleurs `COL` et les événements sonores `SFX`.
- `motion/render.mjs` : rendu image par image, puis encodage H.264 et AAC.
- `motion/sfx.py` : synthèse audio.
- `motion/assets/` : calques du logo (globe et pousse, recolorés depuis le logo HD du site) et polices (OFL).
- `motion/reference/` : planche-contact de la vidéo de référence.
