# Validation de la version 0.1

28 octobre 2026. Scénario automatisé `tests/smoke.mjs` réussi dans Chromium 153 (Linux, Playwright, sans interface). Captures ordinateur et mobile (390 px) inspectées dans `tests/output/`.

## Modèle (Node)

- Tri naturel insensible à la casse : `A.txt`, `b.txt`, `plan_2.pdf`, `plan_10.pdf`.
- Recherche avec `*`, sans tenir compte des accents ni de la casse (`resume` trouve `Résumé.md`).
- Fichiers ignorés comme dans le script Python : Thumbs.db, desktop.ini, `~$…`, `.~lock.…`, `.log`, `.tmp`.
- Regroupement par extension avec taille totale et date la plus récente; filtres sans modifier l’arbre d’origine; statistiques de l’exemple; treemap couvrant exactement la surface.

## Navigateur — parcours Edge / Chrome (sélecteur de dossier simulé)

Le sélecteur de dossier natif ne peut pas être piloté sans interface : il est remplacé par de faux « directory handles » construits à partir du dossier de test, avec un sous-dossier refusé (`NotAllowedError`).

- 20 fichiers lus, 3 fichiers temporaires ignorés et signalés, dossier refusé signalé « Accès refusé » sans arrêter la lecture, dossier au-delà de la profondeur 7 signalé « Contenu non exploré ».
- Fichiers avant dossiers, tri naturel, nom `=1+1.md` affiché comme texte, dossier vide présent, ligne « [......] 12 fichiers .pdf … (regroupés car ≥ 10) » dépliable.
- Date des dossiers = fichier le plus récent; mise en évidence des dates récentes (< 15 jours) et anciennes (> 1 an).
- Filtres : recherche, extension, taille minimale, niveaux affichés, réinitialisation; résultat vide signalé.
- Seuils de regroupement modifiables, mémorisés dans le navigateur, retour aux valeurs par défaut.
- Carte mentale (repli et dépliage au clic), sunburst (zoom et retour par le centre), treemap (zoom et fil d’Ariane), couleur par type ou par âge avec légende.
- Statistiques : chiffres clés, types, ligne du temps, dossiers actifs et dormants.
- FR/EN et choix mémorisé.
- Excel enregistré via le sélecteur d’enregistrement simulé : nom proposé `Arborescence_<dossier>_<date>.xlsx`, en-tête « Généré avec Arborescento v0.1 », une colonne par niveau réellement présent, gel des volets sous l’en-tête, liens `P:\Projets\Test\…` vers les sous-dossiers, aucune formule, aucune adresse courriel professionnelle.
- Export de la vue filtrée : seuls les fichiers retenus et leurs dossiers, filtre décrit dans l’en-tête.
- Annulation d’une lecture lente, puis exemple; aucun débordement horizontal à 390 px sur les trois onglets.

## Navigateur — parcours Firefox / Safari (sans File System Access API)

- Sélection du dossier réel par `<input webkitdirectory>` avec une profondeur de 3 : 19 fichiers, 2 dossiers signalés au-delà de la profondeur, absence des dossiers vides signalée.
- Excel téléchargé : 3 colonnes de niveaux, aucun lien sans chemin collé.

## Contrôles complémentaires

- Fichier Excel relu avec openpyxl : dates réelles au format `yyyy-mm-dd`, fond vert pour les dates récentes, octets numériques, liens natifs vers `P:\Projets\Test\…`.
- Dossier réel de 20 000 fichiers (220 dossiers) par `webkitdirectory` dans Chromium : lecture 3,2 s, recherche 0,2 s, export Excel de 20 230 lignes en 1,6 s.
- Aucune requête externe ni requête HTTP d’écriture pendant les scénarios.
- Script Python v0.3 (`python/`) : testé séparément sous Linux (dossier refusé, boucle de lien, nom en `=`, tri, profondeur, chemin long, fichier verrouillé).

## À valider sur poste Windows

- Edge et Chrome Windows avec le vrai sélecteur de dossier, sur disque local et sur lecteur réseau (temps de lecture à mesurer).
- Ouverture des liens `P:\…` et `\\serveur\…` dans Excel.
- Script Python v0.3 : liens, jonctions, chemins de plus de 260 caractères, fenêtres tkinter.
