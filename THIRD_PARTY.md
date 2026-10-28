# Dépendances distribuées

- **ExcelJS 4.4.0**, licence MIT. Distribution officielle du paquet npm `exceljs@4.4.0`, identique à celle d’Extracto Commento. Fichiers : `vendor/exceljs.min.js` et `vendor/EXCELJS-LICENSE`. Source : https://github.com/exceljs/exceljs

`vendor/SHA256SUMS.json` inventorie les empreintes SHA-256 des fichiers fournis. Aucune ressource n’est chargée depuis un CDN à l’utilisation. Les visualisations (carte mentale, sunburst, treemap, graphiques) sont dessinées en SVG sans bibliothèque.

Les dépendances des tests (`playwright`, `jszip`) ne sont pas copiées dans la distribution navigateur. Elles sont indiquées dans `package.json` pour reproduire les vérifications. Le script Python (`python/`) utilise `openpyxl` (licence MIT), à installer séparément.
