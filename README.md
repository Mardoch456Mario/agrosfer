# AgroSfer : motion design

Quatre vidéos de motion design pour [AgroSfer](https://agrosfer.co/), chacune dans la direction artistique d'une référence TikTok. Elles ont toutes une musique originale et un sound design générés par code, donc sans problème de droits.

| # | Vidéo | DA de référence | Formats | Durée |
| --- | --- | --- | --- | --- |
| 1 | **Drone** : logo révélé par un faisceau de lumière | White Pillar Studios (@mrwhite_310) | [16:9](videos/agrosfer_drone_16x9.mp4) · [9:16](videos/agrosfer_drone_9x16.mp4) | 10 s |
| 2 | **Studio** : film de présentation de la marque | Aldeon Studio (@aldeon.studio) | [16:9](videos/agrosfer_studio_16x9.mp4) · [9:16](videos/agrosfer_studio_9x16.mp4) | 26 s |
| 3 | **App** : une journée avec l'app, téléphone en 3D | démo UI sombre (@tonytuyisenge) | [9:16](videos/agrosfer_app_9x16.mp4) | 25,7 s |
| 4 | **VSL** : vidéo de vente en typographie cinétique | VSL claire (@lemosthiagoo) | [16:9](videos/agrosfer_vsl_16x9.mp4) · [9:16](videos/agrosfer_vsl_9x16.mp4) | 30,5 s |

Toutes les vidéos sont en 30 i/s (1920×1080 ou 1080×1920), en H.264 avec le son en AAC 192 kb/s, normalisées à -14 LUFS (le niveau des réseaux sociaux).

## 1. Drone (DA White Pillar Studios)

L'objet noir assemblé de la référence devient un drone agricole. Son corps est lancé, tournoie et retombe ; le bras-rotors s'emboîte. Le drone décolle, et son faisceau jaune pâle révèle le logo (la pousse grandit). Il tourne autour du logo, l'aspire, puis tire le volet sombre `AGROSFER`. Le volet clair tombe avec *Cultiver. Tracer. Connecter.*

Musique : afro-house à 122 BPM, dont le drop tombe pile à l'allumage du faisceau.

## 2. Studio (DA Aldeon Studio)

Fond noir et grille fine, avec des étiquettes en police mono. La vidéo enchaîne :

1. *Bonjour, nous sommes AgroSfer* apparaît en pixels sur un globe en points qui tourne vers l'Afrique de l'Ouest. Des repères marquent la Côte d'Ivoire, le Bénin et la France, reliés par des arcs.
2. Les mots défilent un par un (*Nous connectons les coopératives, les producteurs et les industriels.*) pendant que des cartes d'interface surgissent.
3. Une mosaïque 3D d'écrans de la plateforme défile, avec des cartouches *Traçabilité*, *Paiements*, *Données terrain* et *Accès aux marchés*.
4. Un mur d'écrans en perspective porte *de la parcelle à l'usine.*
5. Des rangées de tags défilent, avec *Nous sommes AgroSfer* intégré dans les rangées.
6. On tape `agrosfer.co` dans une barre de recherche, le site s'ouvre et le curseur clique sur *Demander une démo*.
7. Le logo apparaît au-dessus d'une planète lumineuse, avec un glitch RVB final.

Musique : électro sombre à 120 BPM en ré mineur, avec une touche afro (conga, shaker).

## 3. App (DA démo UI sombre)

Un téléphone en 3D sur fond sombre raconte le parcours dans l'app, en sept étapes : **Collecter** (enquête et recherche au clavier), **Cartographier** (relevé GPS d'une parcelle), **Identifier** (fiche productrice), **Tracer** (pesée et étapes du lot), **Payer** (AgroSfer Pay), **Vendre** (conversation avec un industriel et commande) et **Piloter** (tableau de bord).

Des éléments sortent de l'écran en 3D. L'intro est un anneau lumineux, et l'outro des traînées de lumière qui dessinent les contours du logo.

Musique : amapiano à 112 BPM, avec un changement d'écran par mesure.

## 4. VSL (DA vidéo de vente claire)

Fond crème avec des taches vertes, citron et bleues, et une typographie mot à mot avec un mot accentué en vert. La vidéo enchaîne :

1. L'accroche : *Un producteur. Puis mille. Et aucune visibilité sur votre filière.*
2. La marque : *Découvrez AgroSfer*.
3. Quatre fonctionnalités numérotées, chacune avec sa carte d'interface : producteurs recensés, parcelles cartographiées, lots tracés, paiements sécurisés.
4. *Une plateforme complète. Simple à déployer. Pour toute votre filière.*
5. Le bouton *Demander une démo*, sur lequel le curseur clique.

Les messages reprennent ceux du site, sans aucune promesse chiffrée ni garantie inventée.

Musique : afro-pop lumineuse à 104 BPM en do majeur, avec un break de tension sur l'accroche.

> Les données affichées dans les interfaces (noms, quantités, montants, coopératives) sont des exemples illustratifs, inspirés des maquettes du site. Ce ne sont pas des données réelles.

## Régénérer les vidéos

Il faut Node 18+, Playwright (Chromium, avec WebGL2), ffmpeg, et Python 3 avec numpy et scipy.

```bash
cd motion
npm install                                      # playwright
pip install numpy scipy
node render.mjs --scene drone  --format 16x9     # -> videos/agrosfer_drone_16x9.mp4
node render.mjs --scene studio --format 9x16
node render.mjs --scene app    --format 9x16
node render.mjs --scene vsl    --format 16x9
node render.mjs --scene vsl --stills 2,9.5,28    # images de contrôle -> motion/out/stills
node render.mjs --scene app --audio-only         # piste son seule (.wav)
```

Options : `--samples 16` (sous-images de flou de mouvement par image), `--fps 30` et `--no-audio`.

Pour un aperçu en temps réel, servez le dossier `motion` (`npx serve motion`), puis ouvrez `index.html?scene=studio&preview`, en ajoutant `&format=9x16` pour le vertical.

## Organisation

| Chemin | Rôle |
| --- | --- |
| `motion/scenes/*.js` | Une scène par vidéo. Chacune contient sa timeline `T` (en secondes), ses bruitages `SFX` et le nom de son morceau `MUSIC`. |
| `motion/lib/core.js` | Easing, fabrique de scène, flou de mouvement, texte. |
| `motion/lib/gl3d.js` | Plans texturés en perspective (WebGL2), pour la 3D. |
| `motion/lib/ui.js` | Composants d'interface AgroSfer : AgroSfer Pay, enquêtes, carte de parcelle, traçabilité, commande, site… |
| `motion/audio/musiclib.py` | Moteur musical : batterie, log drum, piano FM, kalimba, marimba, nappes, risers, bus réverb/delay, sidechain. |
| `motion/audio/scores.py` | Une composition par vidéo, calée sur la timeline de la scène. |
| `motion/audio/sfxlib.py` | Bruitages : whoosh, impacts, clics, frappe clavier, bips, glitch, paiement… |
| `motion/audio/mix.py` | Mixage de la musique (atténuée sous les bruitages) et des bruitages, puis normalisation à -14 LUFS. |
| `motion/render.mjs` | Rendu image par image (Chromium) puis encodage (ffmpeg). |
| `motion/assets/` | Calques du logo (recolorés depuis le logo HD du site), contours vectoriels du logo, points du globe (Natural Earth, domaine public) et polices sous licence OFL (Cinzel, Libre Baskerville, Montserrat, Inter, JetBrains Mono). |
| `motion/reference/` | Planche-contact de la première référence. |
