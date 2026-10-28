# Arborescento — arborescence de dossiers vers Excel

Version 0.1 · 28 octobre 2026 · [English README](README.md)

Listez l’arborescence d’un dossier, explorez-la avec des filtres, visualisez-la et exportez-la vers Excel. **Traitement 100 % local : seuls les noms, tailles et dates sont lus, aucun fichier n’est ouvert ni envoyé en ligne.** Version web du script Python « Extraction liste dossiers fichiers », avec la même mise en page Excel.

**[Ouvrir Arborescento](https://acheruel.github.io/Arborescento/)**, ou cliquer sur **Essayer un exemple** pour découvrir l’outil avec un projet fictif.

## Fonctionnalités

- **Choisir un dossier** ou le **glisser-déposer**, local ou sur un lecteur réseau. Profondeur max. réglable (7 par défaut, comme le script).
- **Regroupement** des fichiers nombreux d’un même type sur une ligne « [......] 12 fichiers .pdf : … (regroupés car ≥ 10) ». Les seuils par extension sont ceux du script, modifiables dans l’outil et mémorisés dans le navigateur.
- **Explorer** : arborescence dépliable avec taille cumulée, nombre de fichiers et date du fichier le plus récent par dossier. Filtres en direct : recherche dans le nom ou le chemin (avec `*`, sans tenir compte des accents), extensions, plage de dates, taille minimale, niveaux affichés.
- **Visualiser** : carte mentale repliable, sunburst et treemap zoomables. Couleur par type de fichier ou par âge, mesure par taille ou par nombre de fichiers.
- **Statistiques** : chiffres clés, répartition par type (nombre et volume), ligne du temps des modifications, dossiers « où ça bouge » (moins de 15 jours) et dossiers dormants (plus de 2 ans).
- **Excel** : une colonne par niveau, taille, dernière modification (vraie date, verte si récente, grise si ancienne), octets et remarques (accès refusé, contenu non exploré…). Liens cliquables vers les sous-dossiers si vous collez le chemin du dossier. Export de l’arborescence complète ou seulement de la vue filtrée.
- Interface français / anglais.

## Navigateurs

| | Edge / Chrome | Firefox / Safari |
|---|---|---|
| Lecture | Seuls les niveaux affichés sont lus | Le navigateur liste tout le dossier, puis la profondeur est appliquée |
| Dossiers vides | Oui | Seulement par glisser-déposer |
| Enregistrement de l’Excel | Vous choisissez l’emplacement | Téléchargement |

Le navigateur ne donne jamais le chemin complet du dossier : pour obtenir des liens cliquables dans Excel, collez-le dans le champ prévu (ex. `P:\Projets\12345`). Il ne fournit pas non plus la date de modification des dossiers : un dossier prend la date du fichier le plus récent qu’il contient. Le message « Importer N fichiers sur ce site ? » de certains navigateurs ne signifie pas un envoi : rien ne quitte l’appareil.

Comme le script, les fichiers temporaires et système (Thumbs.db, desktop.ini, .DS_Store, `~$…`, `.~lock.…`, `.log`, `.tmp`) sont ignorés et comptés dans les informations de lecture.

## Démarrer en local sur Windows

1. Double-cliquer sur **Lancer.cmd** (Node.js requis).
2. Le navigateur s’ouvre sur **http://127.0.0.1:8765**. Garder la fenêtre du serveur ouverte.
3. Pour arrêter, fermer la fenêtre ou appuyer sur Ctrl+C.

Autre possibilité : `node server.mjs --open`, ou tout autre serveur statique. Ne pas ouvrir `index.html` directement : les modules JavaScript et les workers demandent une adresse HTTP.

## Script Python

Le dossier [`python/`](python/) contient la version 0.3 du script (même Excel, `pip install -r python/requirements.txt`). Elle reste utile pour un très gros lecteur réseau ou sans navigateur récent. Par rapport à la 0.2 : un dossier inaccessible n’arrête plus l’extraction, les liens et jonctions ne sont plus suivis, les noms commençant par « = » restent du texte, tri naturel, vraies dates et tailles en octets, choix de l’emplacement de l’Excel.

## Tests

```bash
npm install
npm test
```

`CHROME_PATH=/chemin/vers/chrome` ou `TEST_BROWSER=msedge` pour choisir le navigateur. Voir [VALIDATION.md](VALIDATION.md).

## Fichiers

`index.html` / `styles.css` (interface) · `app.js` (état, filtres, traductions, export) · `scan.js` (lecture du dossier) · `tree.js` (modèle, regroupement, filtres) · `stats.js` (statistiques) · `views/viz.js` (carte mentale, sunburst, treemap) · `example.js` (projet fictif) · `export-worker.js` (génération Excel) · `vendor/` (ExcelJS 4.4.0, MIT — voir [THIRD_PARTY.md](THIRD_PARTY.md)) · `python/` (script v0.3).

Auteur : Anthony Chéruel. Licence GPL-3.0 ([LICENSE](LICENSE)). Publié avec GitHub Pages depuis la branche `main`.
