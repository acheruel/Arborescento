import { DEFAULT_MAX_DEPTH, MAX_DEPTH_LIMIT, DEFAULT_THRESHOLDS, HOT_DAYS, OLD_DAYS, DAY, FAMILIES, emptyFilters, filtersActive,
  filterTree, flatten, extensionCounts, parseThresholds, normalizeExtension, naturalCompare, walk, family } from './tree.js';
import { computeStats } from './stats.js';
import { scanHandle, scanEntry, scanFileList, dropSources } from './scan.js';
import { exampleTree } from './example.js';
import { Viz, FAMILY_COLORS, AGE_COLORS } from './views/viz.js';

const VERSION = '0.1';
const COPY = {
  fr: {
    title:'Arborescento — Arborescence de dossiers vers Excel',
    lead:'L’arborescence de vos dossiers, prête pour Excel. Explorez, visualisez et exportez.',
    privacy:'Traitement 100 % local', privacyDetail:'Seuls les noms, tailles et dates sont lus. Aucun fichier n’est ouvert ni envoyé en ligne.',
    step1:'Choisir un dossier', step2:'Explorer et filtrer', step3:'Exporter Excel', steps:'Étapes',
    dropTitle:'Déposez un dossier ici', dropHint:'ou choisissez un dossier sur votre appareil ou sur un lecteur réseau',
    choose:'Choisir un dossier', demo:'Essayer un exemple', depthLabel:'Profondeur max. (niveaux)',
    groupingLabel:'Regrouper les fichiers nombreux d’un même type', thresholdsTitle:'Seuils de regroupement',
    thresholdsHint:'Dans un dossier, les fichiers d’une extension listée sont regroupés sur une ligne « [......] » à partir de ce nombre. Vos réglages sont mémorisés dans ce navigateur.',
    extensionLabel:'Extension', countLabel:'À partir de', add:'Ajouter', resetDefaults:'Valeurs par défaut', remove: ext => `Retirer ${ext}`,
    thresholdFrom: count => `dès ${count}`, invalidThreshold:'Extension ou nombre invalide (ex. .pdf et 10).',
    browserFull:'Edge / Chrome : seuls les niveaux affichés sont lus, les dossiers vides apparaissent et vous choisissez où enregistrer l’Excel.',
    browserBasic:'Votre navigateur liste tout le dossier avant l’analyse et ne montre les dossiers vides que par glisser-déposer. L’Excel sera téléchargé.',
    clear:'Effacer / changer', cancel:'Annuler', preview:'ARBORESCENCE', resultsTitle:'Explorez votre dossier',
    exportTitle:'Votre fichier Excel', exportHint:'Même mise en page que le script Python : une colonne par niveau, taille, date et remarques.',
    rootPathLabel:'Chemin du dossier, pour les liens cliquables (facultatif)', exportFiltered:'Exporter seulement la vue filtrée',
    download:'Enregistrer Excel', sizeLabel:'volume total',
    statDirs: count => count < 2 ? 'dossier' : 'dossiers', statFiles: count => count < 2 ? 'fichier' : 'fichiers',
    tabs:'Vues', tabExplorer:'Explorer', tabViz:'Visualiser', tabStats:'Statistiques',
    searchLabel:'Recherche (nom ou chemin, * accepté)', searchPlaceholder:'ex. *rapport*.pdf', fromLabel:'Modifié depuis le', toLabel:'Jusqu’au',
    minSizeLabel:'Taille min.', depthShownLabel:'Niveaux affichés', anySize:'Toutes', allLevels:'Tous', levels: count => `${count} ${count < 2 ? 'niveau' : 'niveaux'}`,
    extensions:'Extensions', noExtension:'(sans extension)', resetFilters:'Réinitialiser les filtres',
    expandAll:'Tout déplier', collapseAll:'Tout replier', nameHeading:'Nom', sizeHeading:'Taille', filesHeading:'Fichiers',
    dateHeading:'Dernière modif.', remarkHeading:'Remarque', bytesHeading:'Octets', levelHeading:'Niveau',
    vizMap:'Carte mentale', vizSunburst:'Sunburst', vizTreemap:'Treemap', colorType:'Couleur : type', colorAge:'Couleur : âge',
    measureSize:'Taille', measureCount:'Nombre de fichiers', vizModeLabel:'Vue', vizColorLabel:'Couleur', vizMeasureLabel:'Mesure',
    hintMap:'Cliquez un dossier pour le déplier ou le replier. La taille du point suit le volume du dossier.',
    hintSunburst:'Anneaux = niveaux, angle = volume. Cliquez un dossier pour zoomer, le centre pour remonter.',
    hintTreemap:'Surface = volume. Cliquez un dossier pour zoomer, le fil d’Ariane pour remonter.',
    hintCount:'Mesure : nombre de fichiers.', hintNoSize:'Tous les fichiers font 0 octet : la mesure utilise le nombre de fichiers.',
    mapLabel:'Carte mentale des dossiers', sunburstLabel:'Sunburst des dossiers et fichiers', treemapLabel:'Treemap des dossiers et fichiers',
    fold:'cliquer pour replier', unfold:'cliquer pour déplier', up:'Remonter d’un niveau', path:'Chemin', empty:'Rien à afficher pour ces filtres.',
    families:{ pdf:'PDF', cad:'CAO / BIM', office:'Bureautique', image:'Images', archive:'Archives', media:'Vidéo / audio', other:'Autres' },
    ages:['Moins de 15 jours', '15 jours à 3 mois', '3 mois à 1 an', '1 à 2 ans', 'Plus de 2 ans'], unknownDate:'Sans date',
    helpTitle:'Fonctionnement et limites',
    helpLocal:'Le dossier est lu dans votre navigateur : seuls les noms, tailles et dates de modification sont lus, jamais le contenu des fichiers. Rien n’est envoyé en ligne. Les bibliothèques sont incluses avec l’outil.',
    helpBrowsers:'Edge et Chrome : la profondeur max. évite de lire les niveaux non affichés, les dossiers vides apparaissent et vous choisissez où enregistrer l’Excel. Firefox et Safari : le navigateur liste tout le dossier avant l’analyse, les dossiers vides n’apparaissent pas (sauf par glisser-déposer) et l’Excel est téléchargé. Le navigateur peut afficher « Importer N fichiers sur ce site ? » : rien n’est importé, il demande seulement l’accès à la liste.',
    helpPaths:'Le navigateur ne donne jamais le chemin complet du dossier. Pour obtenir des liens cliquables vers les sous-dossiers dans l’Excel, collez ce chemin (ex. P:\\Projets\\12345) dans le champ prévu avant l’export.',
    helpDates:'La date d’un dossier est celle du fichier le plus récent qu’il contient, sous-dossiers compris : le navigateur ne fournit pas la date de modification des dossiers.',
    helpIgnored:'Comme le script Python, les fichiers temporaires et système (Thumbs.db, desktop.ini, .DS_Store, ~$…, .log, .tmp) sont ignorés et comptés dans les informations de lecture.',
    helpPython:'Pour un très gros lecteur réseau, le script Python fourni dans le dépôt (dossier python/) produit le même Excel.',
    updated:'Dernière mise à jour :', updatedDate:'28 octobre 2026', github:'Code source sur GitHub',
    loading:'Chargement de l’outil…', ready:'Prêt : choisissez ou déposez un dossier.', scanning:'Lecture du dossier…',
    progress:(dirs, files) => `${dirs.toLocaleString('fr-CA')} dossiers · ${files.toLocaleString('fr-CA')} fichiers lus`,
    complete:'Lecture terminée. Explorez, filtrez puis enregistrez l’Excel.', partial:'Lecture terminée avec des dossiers inaccessibles : voir les informations de lecture.',
    emptyFolder:'Ce dossier est vide.', cancelled:'Lecture annulée. Vous pouvez choisir un autre dossier.',
    dropFolder:'Déposez un dossier, pas un fichier.', pickerBlocked:'Le navigateur refuse ce dossier (dossier système ou protégé). Choisissez un sous-dossier.',
    unexpected:'La lecture a échoué. Réessayez ou choisissez un autre dossier.',
    exporting:'Création du fichier Excel…', saved:'Fichier Excel enregistré.', downloaded:'Téléchargement lancé. Votre navigateur gère l’enregistrement du fichier.',
    saveCancelled:'Enregistrement annulé.', exportCancelled:'Création Excel annulée.', exportError:'Impossible de générer Excel. L’arborescence reste disponible.',
    tooManyRows:'Trop de lignes pour Excel (plus de 1 048 576). Activez le regroupement, réduisez la profondeur ou filtrez.', nothingToExport:'Rien à exporter avec ces filtres.',
    duration: seconds => `Lecture en ${seconds} s`,
    folderMeta:(dirs, files, size) => `${dirs} · ${files} · ${size}`,
    shown:(files, dirs, totalFiles) => `${files} et ${dirs} affichés sur ${totalFiles} au total`,
    shownAll:(files, dirs) => `${files} · ${dirs}`,
    files: count => `${count.toLocaleString('fr-CA')} ${count < 2 ? 'fichier' : 'fichiers'}`,
    dirs: count => `${count.toLocaleString('fr-CA')} ${count < 2 ? 'dossier' : 'dossiers'}`,
    warnings:'Informations de lecture', ignored: count => `${count} fichier(s) temporaire(s) ou système ignoré(s) (Thumbs.db, ~$…, .log, .tmp…).`,
    denied:'Dossiers inaccessibles', unexplored: count => `${count} dossier(s) au-delà de la profondeur max. : contenu non lu. Augmentez la profondeur pour les lire.`,
    noEmptyDirs:'Ce navigateur ne voit pas les dossiers vides avec « Choisir un dossier ». Déposez le dossier pour les inclure, ou utilisez Edge / Chrome.',
    unreadableFiles: count => `${count} fichier(s) illisible(s) : taille et date inconnues.`,
    remarkDenied:'Accès refusé', remarkUnexplored:'Contenu non exploré (profondeur max)', remarkUnreadable:'Illisible', remarkHidden:'Niveaux suivants masqués',
    groupLabel:(count, ext, first, last, threshold) => `[......] ${count} fichiers ${ext || '(sans extension)'} : ${first} … ${last} (regroupés car ≥ ${threshold})`,
    toggleFolder: name => `Déplier ou replier ${name}`, sheet:'Arborescence',
    header:{
      intro:'Ce fichier Excel contient une liste brute de l’arborescence des sous-dossiers et fichiers du dossier sélectionné suivant :',
      root: value => `Dossier racine : ${value}`, date: value => `Date de génération arborescence : ${value}`,
      grouping: value => `Filtre appliqué sur le nombre de fichier par sous-dossier : ${value ? 'Oui' : 'Non'}`,
      depth: value => `Profondeur d’analyse max : ${value}`, view: value => `Vue filtrée : ${value || 'Non'}`,
      generator:`Généré avec Arborescento v${VERSION} — acheruel.github.io/Arborescento`,
    },
    filterSummary:{ search: value => `recherche « ${value} »`, extensions: value => `extensions ${value}`, from: value => `depuis le ${value}`,
      to: value => `jusqu’au ${value}`, minSize: value => `taille ≥ ${value}`, depth: value => `${value} niveau(x)` },
    statsTitle:'Statistiques de la vue', statsFiltered:'Calculées sur la vue filtrée.', statsDepth:'niveaux réels', statsEmpty:'dossiers vides',
    statsUndated:'fichiers sans date', byType:'Par type de fichier', typeHeading:'Type', countHeading:'Fichiers', volumeHeading:'Volume', shareHeading:'Part du volume',
    timelineTitle:'Activité : fichiers par date de dernière modification', timelineMonth:'par mois', timelineYear:'par année', noDates:'Aucune date disponible.',
    showData:'Voir les données', periodHeading:'Période', hotTitle:'Dossiers où ça bouge', hotHint:`Dossiers contenant des fichiers modifiés depuis moins de ${HOT_DAYS} jours.`,
    recentHeading:'Fichiers récents', latestHeading:'Dernière modif.', folderHeading:'Dossier', noHot:'Aucun fichier modifié depuis 15 jours.',
    dormantTitle:'Dossiers dormants', dormantHint: size => `Dossiers sans modification depuis plus de 2 ans : ${size} au total, candidats à l’archivage.`, noDormant:'Aucun dossier dormant.',
    more: count => `et ${count} autre(s)`, units:['o', 'Ko', 'Mo', 'Go', 'To'], locale:'fr-CA',
    months:['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  },
  en: {
    title:'Arborescento — Folder tree to Excel',
    lead:'Your folder tree, ready for Excel. Explore, visualise and export.',
    privacy:'100% local processing', privacyDetail:'Only names, sizes and dates are read. No file is opened or sent online.',
    step1:'Choose a folder', step2:'Explore and filter', step3:'Export Excel', steps:'Steps',
    dropTitle:'Drop a folder here', dropHint:'or choose a folder on your device or on a network drive',
    choose:'Choose a folder', demo:'Try an example', depthLabel:'Max. depth (levels)',
    groupingLabel:'Group many files of the same type', thresholdsTitle:'Grouping thresholds',
    thresholdsHint:'In a folder, files with a listed extension are grouped on one “[......]” line from this count. Your settings are saved in this browser.',
    extensionLabel:'Extension', countLabel:'From', add:'Add', resetDefaults:'Default values', remove: ext => `Remove ${ext}`,
    thresholdFrom: count => `from ${count}`, invalidThreshold:'Invalid extension or count (e.g. .pdf and 10).',
    browserFull:'Edge / Chrome: only the levels shown are read, empty folders are listed and you choose where to save the Excel file.',
    browserBasic:'Your browser lists the whole folder before the analysis and only shows empty folders when you drop the folder. The Excel file will be downloaded.',
    clear:'Clear / change', cancel:'Cancel', preview:'FOLDER TREE', resultsTitle:'Explore your folder',
    exportTitle:'Your Excel file', exportHint:'Same layout as the Python script: one column per level, size, date and remarks.',
    rootPathLabel:'Folder path, for clickable links (optional)', exportFiltered:'Export the filtered view only',
    download:'Save Excel', sizeLabel:'total size',
    statDirs: count => count === 1 ? 'folder' : 'folders', statFiles: count => count === 1 ? 'file' : 'files',
    tabs:'Views', tabExplorer:'Explore', tabViz:'Visualise', tabStats:'Statistics',
    searchLabel:'Search (name or path, * allowed)', searchPlaceholder:'e.g. *report*.pdf', fromLabel:'Modified from', toLabel:'Until',
    minSizeLabel:'Min. size', depthShownLabel:'Levels shown', anySize:'Any', allLevels:'All', levels: count => `${count} ${count === 1 ? 'level' : 'levels'}`,
    extensions:'Extensions', noExtension:'(no extension)', resetFilters:'Reset filters',
    expandAll:'Expand all', collapseAll:'Collapse all', nameHeading:'Name', sizeHeading:'Size', filesHeading:'Files',
    dateHeading:'Last modified', remarkHeading:'Remark', bytesHeading:'Bytes', levelHeading:'Level',
    vizMap:'Mind map', vizSunburst:'Sunburst', vizTreemap:'Treemap', colorType:'Colour: type', colorAge:'Colour: age',
    measureSize:'Size', measureCount:'File count', vizModeLabel:'View', vizColorLabel:'Colour', vizMeasureLabel:'Measure',
    hintMap:'Click a folder to expand or collapse it. Dot size follows the folder size.',
    hintSunburst:'Rings = levels, angle = size. Click a folder to zoom in, the centre to go back.',
    hintTreemap:'Area = size. Click a folder to zoom in, the breadcrumb to go back.',
    hintCount:'Measure: file count.', hintNoSize:'All files are 0 bytes: the measure uses the file count.',
    mapLabel:'Mind map of the folders', sunburstLabel:'Sunburst of folders and files', treemapLabel:'Treemap of folders and files',
    fold:'click to collapse', unfold:'click to expand', up:'Up one level', path:'Path', empty:'Nothing to show with these filters.',
    families:{ pdf:'PDF', cad:'CAD / BIM', office:'Office', image:'Images', archive:'Archives', media:'Video / audio', other:'Other' },
    ages:['Less than 15 days', '15 days to 3 months', '3 months to 1 year', '1 to 2 years', 'More than 2 years'], unknownDate:'No date',
    helpTitle:'How it works and limitations',
    helpLocal:'The folder is read in your browser: only names, sizes and modification dates are read, never file contents. Nothing is sent online. Libraries are included with the tool.',
    helpBrowsers:'Edge and Chrome: the max. depth avoids reading levels that are not shown, empty folders are listed and you choose where to save the Excel file. Firefox and Safari: the browser lists the whole folder before the analysis, empty folders are missing (except with drag and drop) and the Excel file is downloaded. The browser may ask “Upload N files to this site?”: nothing is uploaded, it only asks for access to the list.',
    helpPaths:'The browser never reveals the full folder path. To get clickable links to subfolders in Excel, paste that path (e.g. P:\\Projects\\12345) in the field provided before exporting.',
    helpDates:'A folder’s date is that of the most recent file it contains, subfolders included: browsers do not provide folder modification dates.',
    helpIgnored:'As in the Python script, temporary and system files (Thumbs.db, desktop.ini, .DS_Store, ~$…, .log, .tmp) are skipped and counted in the scan information.',
    helpPython:'For a very large network drive, the Python script included in the repository (python/ folder) produces the same Excel file.',
    updated:'Last updated:', updatedDate:'October 28, 2026', github:'Source code on GitHub',
    loading:'Loading the tool…', ready:'Ready: choose or drop a folder.', scanning:'Reading the folder…',
    progress:(dirs, files) => `${dirs.toLocaleString('en-CA')} folders · ${files.toLocaleString('en-CA')} files read`,
    complete:'Scan complete. Explore, filter, then save the Excel file.', partial:'Scan complete with unreadable folders: see the scan information.',
    emptyFolder:'This folder is empty.', cancelled:'Scan cancelled. You can choose another folder.',
    dropFolder:'Drop a folder, not a file.', pickerBlocked:'The browser refuses this folder (system or protected folder). Choose a subfolder.',
    unexpected:'The scan failed. Try again or choose another folder.',
    exporting:'Creating the Excel file…', saved:'Excel file saved.', downloaded:'Download started. Your browser manages saving the file.',
    saveCancelled:'Save cancelled.', exportCancelled:'Excel generation cancelled.', exportError:'Unable to generate Excel. The folder tree remains available.',
    tooManyRows:'Too many rows for Excel (over 1,048,576). Turn on grouping, reduce the depth or filter.', nothingToExport:'Nothing to export with these filters.',
    duration: seconds => `Scanned in ${seconds} s`,
    folderMeta:(dirs, files, size) => `${dirs} · ${files} · ${size}`,
    shown:(files, dirs, totalFiles) => `${files} and ${dirs} shown out of ${totalFiles} in total`,
    shownAll:(files, dirs) => `${files} · ${dirs}`,
    files: count => `${count.toLocaleString('en-CA')} ${count === 1 ? 'file' : 'files'}`,
    dirs: count => `${count.toLocaleString('en-CA')} ${count === 1 ? 'folder' : 'folders'}`,
    warnings:'Scan information', ignored: count => `${count} temporary or system file(s) skipped (Thumbs.db, ~$…, .log, .tmp…).`,
    denied:'Unreadable folders', unexplored: count => `${count} folder(s) beyond the max. depth: content not read. Increase the depth to read them.`,
    noEmptyDirs:'With “Choose a folder”, this browser does not see empty folders. Drop the folder to include them, or use Edge / Chrome.',
    unreadableFiles: count => `${count} unreadable file(s): size and date unknown.`,
    remarkDenied:'Access denied', remarkUnexplored:'Content not explored (max depth)', remarkUnreadable:'Unreadable', remarkHidden:'Deeper levels hidden',
    groupLabel:(count, ext, first, last, threshold) => `[......] ${count} ${ext || '(no extension)'} files: ${first} … ${last} (grouped, ≥ ${threshold})`,
    toggleFolder: name => `Expand or collapse ${name}`, sheet:'Folder tree',
    header:{
      intro:'This Excel file contains a raw list of the subfolders and files of the following selected folder:',
      root: value => `Root folder: ${value}`, date: value => `Generated on: ${value}`,
      grouping: value => `Grouping of many files per folder: ${value ? 'Yes' : 'No'}`,
      depth: value => `Max. scan depth: ${value}`, view: value => `Filtered view: ${value || 'No'}`,
      generator:`Generated with Arborescento v${VERSION} — acheruel.github.io/Arborescento`,
    },
    filterSummary:{ search: value => `search “${value}”`, extensions: value => `extensions ${value}`, from: value => `from ${value}`,
      to: value => `until ${value}`, minSize: value => `size ≥ ${value}`, depth: value => `${value} level(s)` },
    statsTitle:'Statistics of the view', statsFiltered:'Computed on the filtered view.', statsDepth:'actual levels', statsEmpty:'empty folders',
    statsUndated:'files without date', byType:'By file type', typeHeading:'Type', countHeading:'Files', volumeHeading:'Size', shareHeading:'Share of size',
    timelineTitle:'Activity: files by last modification date', timelineMonth:'per month', timelineYear:'per year', noDates:'No dates available.',
    showData:'Show data', periodHeading:'Period', hotTitle:'Where things move', hotHint:`Folders holding files modified less than ${HOT_DAYS} days ago.`,
    recentHeading:'Recent files', latestHeading:'Last modified', folderHeading:'Folder', noHot:'No file modified in the last 15 days.',
    dormantTitle:'Dormant folders', dormantHint: size => `Folders untouched for more than 2 years: ${size} in total, candidates for archiving.`, noDormant:'No dormant folder.',
    more: count => `and ${count} more`, units:['B', 'KB', 'MB', 'GB', 'TB'], locale:'en-CA',
    months:['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
};

const $ = id => document.getElementById(id);
const LANGUAGE_KEY = 'arborescento-language', THRESHOLDS_KEY = 'arborescento-thresholds', GROUPING_KEY = 'arborescento-grouping';
const ROW_HEIGHT = 34, OVERSCAN = 12, EXCEL_ROWS = 1048576;
const MIN_SIZES = [0, 100 * 1024, 1024 ** 2, 10 * 1024 ** 2, 100 * 1024 ** 2, 1024 ** 3];
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
};
let lang = navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
if (['fr', 'en'].includes(storage.get(LANGUAGE_KEY))) lang = storage.get(LANGUAGE_KEY);
const t = key => COPY[lang][key];

let scan = null, view = null, rows = [], filters = emptyFilters(), tab = 'explorer';
let thresholds = (() => { try { const saved = JSON.parse(storage.get(THRESHOLDS_KEY)); return saved ? parseThresholds(saved) : { ...DEFAULT_THRESHOLDS }; } catch { return { ...DEFAULT_THRESHOLDS }; } })();
let groupingOn = storage.get(GROUPING_KEY) !== 'off';
let expanded = new Set(), collapsedFiltered = new Set(), openGroups = new Set();
let controller = null, exportWorker = null, busy = false, operation = 0, statusKey = 'loading', statusKind = '', elapsed = 0, scanDepth = DEFAULT_MAX_DEPTH;
let searchTimer = 0, scanNow = Date.now();
const canPick = typeof window.showDirectoryPicker === 'function';
const canSave = typeof window.showSaveFilePicker === 'function';
const grouping = () => ({ enabled: groupingOn, thresholds });
const viz = new Viz($('viz'), { describe: (node, short) => describe(node, short), labels: () => COPY[lang], formatSize: bytes => formatSize(bytes) });

// ---- Formatting ----
function formatSize(bytes, language = lang) {
  if (bytes === null || bytes === undefined) return '';
  const units = COPY[language].units;
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  // No decimal for bytes and kilobytes, one decimal above (as in the Python script).
  return `${value.toLocaleString(COPY[language].locale, { minimumFractionDigits: unit > 1 ? 1 : 0, maximumFractionDigits: unit > 1 ? 1 : 0 })} ${units[unit]}`;
}
const pad = value => String(value).padStart(2, '0');
const formatDate = time => { if (time === null || time === undefined) return ''; const date = new Date(time); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; };
function describe(node, short = false) {
  if (node.kind === 'dir') return short ? `${node.files.toLocaleString(t('locale'))} · ${formatSize(node.size)}` : `${t('files')(node.files)} · ${formatSize(node.size)}${node.latest ? ` · ${formatDate(node.latest)}` : ''}`;
  return `${formatSize(node.size)}${node.mtime ? ` · ${formatDate(node.mtime)}` : ''}`;
}
const remarkOf = node => ({ denied: t('remarkDenied'), unexplored: t('remarkUnexplored'), unreadable: t('remarkUnreadable') }[node.note] || (node.hidden ? t('remarkHidden') : ''));
const groupLabel = row => t('groupLabel')(row.members.length, row.ext, row.members[0].name, row.members[row.members.length - 1].name, row.threshold);
const extensionLabel = ext => (ext === '(none)' ? t('noExtension') : ext);

// ---- Status and busy state ----
function showStatus(key, kind = '') {
  statusKey = key; statusKind = kind;
  $('status').textContent = t(key) || t('unexpected');
  $('status-box').className = `status-box ${kind}`;
}
function setBusy(value) {
  busy = value;
  for (const id of ['choose', 'demo', 'folder-input', 'max-depth', 'clear']) $(id).disabled = value;
  for (const button of $('language').querySelectorAll('button')) button.disabled = value;
  $('progress-card').hidden = !value;
  $('download').disabled = value || !scan;
}
function step(index) {
  [...$('steps').children].forEach((item, position) => { item.className = position === index ? 'current' : position < index ? 'done' : ''; });
}

// ---- Scanning ----
function readDepth() {
  const value = Math.round(Number($('max-depth').value));
  scanDepth = Number.isFinite(value) ? Math.min(MAX_DEPTH_LIMIT, Math.max(1, value)) : DEFAULT_MAX_DEPTH;
  $('max-depth').value = scanDepth;
  return scanDepth;
}

async function runScan(task) {
  const token = ++operation;
  controller = new AbortController();
  const maxDepth = readDepth();
  setBusy(true); showStatus('scanning');
  $('progress').removeAttribute('value');
  $('progress-label').textContent = t('scanning');
  const started = performance.now();
  try {
    let lastPaint = 0;
    const result = await task({ maxDepth, signal: controller.signal, onProgress: ({ dirs, files }) => {
      if (token !== operation || performance.now() - lastPaint < 120) return;
      lastPaint = performance.now();
      $('progress-label').textContent = t('progress')(dirs, files);
    } });
    if (token !== operation || !result) return;
    elapsed = (performance.now() - started) / 1000;
    load(result);
  } catch (error) {
    if (token !== operation) return;
    if (error.name === 'AbortError') showStatus('cancelled');
    else { console.error(error); showStatus('unexpected', 'error'); }
  } finally {
    if (token === operation) { controller = null; setBusy(false); }
  }
}

function load(result) {
  scan = result; scanNow = Date.now();
  filters = emptyFilters(); expanded = new Set(); collapsedFiltered = new Set(); openGroups = new Set();
  for (const child of scan.root.children) if (child.kind === 'dir') expanded.add(child.path);
  viz.initialized = false; viz.expanded = new Set(['']); viz.focus = ''; viz.root = null;
  $('results').hidden = false; $('dropzone').hidden = true; $('folder-card').hidden = false;
  $('root-path').value = ''; $('export-filtered').checked = false; $('diagnostics').open = false;
  resetFilterInputs(); buildFilterOptions(); update();
  $('download').disabled = busy;
  step(1);
  if (!scan.root.children.length) showStatus('emptyFolder');
  else showStatus(scan.stats.denied.length ? 'partial' : 'complete', scan.stats.denied.length ? 'error' : 'success');
}

function reset() {
  operation++;
  controller?.abort(); controller = null;
  exportWorker?.terminate(); exportWorker = null;
  scan = null; view = null; rows = [];
  $('results').hidden = true; $('dropzone').hidden = false; $('folder-card').hidden = true;
  $('tree-body').replaceChildren(); $('viz').replaceChildren(); $('stats-content').replaceChildren();
  setBusy(false); step(0); showStatus('ready');
}

async function chooseFolder() {
  if (busy) return;
  if (!canPick) { $('folder-input').click(); return; }
  let handle;
  try { handle = await window.showDirectoryPicker({ id: 'arborescento', mode: 'read' }); }
  catch (error) {
    if (error.name === 'AbortError') return;
    showStatus('pickerBlocked', 'error'); return;
  }
  void runScan(options => scanHandle(handle, options));
}

// ---- Filters ----
function resetFilterInputs() {
  $('search').value = filters.search; $('date-from').value = filters.from; $('date-to').value = filters.to;
  $('min-size').value = String(filters.minSize); $('depth-shown').value = String(filters.depth);
}

function buildFilterOptions() {
  const sizes = $('min-size');
  sizes.replaceChildren(...MIN_SIZES.map(value => new Option(value ? `≥ ${formatSize(value)}` : t('anySize'), String(value))));
  sizes.value = String(filters.minSize);
  const depth = $('depth-shown');
  const levels = scan ? scan.root.maxDepth + 1 : 0;
  depth.replaceChildren(new Option(t('allLevels'), '0'), ...Array.from({ length: Math.max(0, levels - 1) }, (_, index) => new Option(t('levels')(index + 1), String(index + 1))));
  depth.value = String(filters.depth);
  if (depth.selectedIndex < 0) { depth.value = '0'; filters.depth = 0; }
  const chips = $('extension-chips');
  chips.setAttribute('aria-label', t('extensions'));
  const counts = scan ? extensionCounts(scan.root) : [];
  const shown = counts.slice(0, 16);
  for (const ext of filters.extensions) if (!shown.some(([key]) => key === ext)) shown.push([ext, counts.find(([key]) => key === ext)?.[1] || 0]);
  chips.replaceChildren(...shown.map(([ext, count]) => {
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'chip'; chip.dataset.ext = ext;
    chip.setAttribute('aria-pressed', String(filters.extensions.includes(ext)));
    const label = document.createElement('span'); label.textContent = extensionLabel(ext);
    const number = document.createElement('small'); number.textContent = count.toLocaleString(t('locale'));
    chip.append(label, number);
    return chip;
  }));
}

function update() {
  if (!scan) return;
  // The search box is debounced: always read its current text so another filter never uses a stale query.
  clearTimeout(searchTimer);
  filters.search = $('search').value;
  view = filtersActive(filters) ? filterTree(scan.root, filters) : scan.root;
  $('reset-filters').disabled = !filtersActive(filters);
  renderSummary(); renderCount(); renderDiagnostics();
  renderTab();
}

function renderSummary() {
  const root = scan.root;
  $('count-dirs').textContent = root.dirs.toLocaleString(t('locale')); $('count-dirs-label').textContent = t('statDirs')(root.dirs);
  $('count-files').textContent = root.files.toLocaleString(t('locale')); $('count-files-label').textContent = t('statFiles')(root.files);
  $('count-size').textContent = formatSize(root.size);
  $('folder-name').textContent = root.name;
  $('folder-meta').textContent = t('folderMeta')(t('dirs')(root.dirs), t('files')(root.files), formatSize(root.size));
  $('elapsed').textContent = elapsed ? t('duration')(elapsed.toFixed(1)) : '';
}

function renderCount() {
  $('visible-count').textContent = filtersActive(filters)
    ? t('shown')(t('files')(view.files), t('dirs')(view.dirs), t('files')(scan.root.files))
    : t('shownAll')(t('files')(scan.root.files), t('dirs')(scan.root.dirs));
}

function renderDiagnostics() {
  const { stats } = scan;
  const items = [];
  if (stats.ignored) items.push(t('ignored')(stats.ignored));
  if (stats.unexplored) items.push(t('unexplored')(stats.unexplored));
  if (!stats.emptyDirsVisible) items.push(t('noEmptyDirs'));
  let unreadable = 0;
  walk(scan.root, node => { if (node.kind === 'file' && node.note === 'unreadable') unreadable++; });
  if (unreadable) items.push(t('unreadableFiles')(unreadable));
  if (stats.denied.length) items.push(`${t('denied')} : ${stats.denied.slice(0, 20).map(item => item.path).join(' · ')}${stats.denied.length > 20 ? ` ${t('more')(stats.denied.length - 20)}` : ''}`);
  $('diagnostics').hidden = !items.length;
  $('diagnostics-title').textContent = `${t('warnings')} · ${items.length}`;
  $('warning-list').replaceChildren(...items.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  if (stats.denied.length) $('diagnostics').open = true;
}

// ---- Tabs ----
function selectTab(name, focus = false) {
  tab = name;
  for (const id of ['explorer', 'viz', 'stats']) {
    const button = $(`tab-${id}`), selected = id === name;
    button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    $(`panel-${id}`).hidden = !selected;
    if (selected && focus) button.focus();
  }
  renderTab();
}
function renderTab() {
  if (!scan) return;
  if (tab === 'explorer') renderTree();
  else if (tab === 'viz') renderViz();
  else renderStats();
}

// ---- Explorer: virtualised tree ----
const isFiltered = () => filtersActive(filters);
const isOpen = path => (isFiltered() ? !collapsedFiltered.has(path) : expanded.has(path));

function renderTree() {
  rows = flatten(view, grouping(), isOpen, key => openGroups.has(key));
  $('tree-body').style.height = `${Math.max(1, rows.length) * ROW_HEIGHT}px`;
  paintRows();
}

function paintRows() {
  const scroller = $('tree-scroll');
  const body = $('tree-body');
  if (!rows.length) {
    const empty = document.createElement('p'); empty.className = 'tree-empty'; empty.textContent = t('empty');
    body.replaceChildren(empty); return;
  }
  const first = Math.max(0, Math.floor(scroller.scrollTop / ROW_HEIGHT) - OVERSCAN);
  const last = Math.min(rows.length, Math.ceil((scroller.scrollTop + scroller.clientHeight) / ROW_HEIGHT) + OVERSCAN);
  const fragment = document.createDocumentFragment();
  for (let index = first; index < last; index++) fragment.append(rowElement(rows[index], index));
  body.replaceChildren(fragment);
}

function rowElement(row, index) {
  const element = document.createElement('div');
  element.className = `tree-row ${row.type}${row.inGroup ? ' in-group' : ''}`;
  element.style.transform = `translateY(${index * ROW_HEIGHT}px)`;
  const name = document.createElement('div'); name.className = 'cell name';
  name.style.paddingLeft = `${10 + row.depth * 20}px`;
  const node = row.node;
  const foldable = row.type === 'group' || (row.type === 'dir' && node.children.length && !node.hidden);
  if (foldable) {
    const open = row.type === 'group' ? openGroups.has(row.key) : isOpen(node.path);
    const toggle = document.createElement('button');
    toggle.type = 'button'; toggle.className = 'toggle'; toggle.dataset.index = index;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', t('toggleFolder')(row.type === 'group' ? groupLabel(row) : node.name));
    name.append(toggle);
  } else { const spacer = document.createElement('span'); spacer.className = 'toggle-space'; name.append(spacer); }
  const icon = document.createElement('span'); icon.className = `icon ${row.type}`; icon.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span'); text.className = 'label';
  text.textContent = row.type === 'group' ? groupLabel(row) : node.name;
  text.title = row.type === 'group' ? groupLabel(row) : node.path;
  name.append(icon, text);
  const size = document.createElement('div'); size.className = 'cell size';
  size.textContent = formatSize(row.type === 'group' ? row.size : node.size);
  const files = document.createElement('div'); files.className = 'cell files';
  files.textContent = row.type === 'dir' ? node.files.toLocaleString(t('locale')) : row.type === 'group' ? row.members.length.toLocaleString(t('locale')) : '';
  const date = document.createElement('div'); date.className = 'cell date';
  const time = row.type === 'group' ? row.mtime : row.type === 'dir' ? node.latest : node.mtime;
  date.textContent = formatDate(time);
  if (time !== null && time !== undefined) {
    const age = (scanNow - time) / DAY;
    if (age < HOT_DAYS) date.classList.add('hot'); else if (age > OLD_DAYS) date.classList.add('old');
  }
  const remark = document.createElement('div'); remark.className = 'cell remark';
  remark.textContent = row.type === 'group' ? '' : remarkOf(node);
  element.append(name, size, files, date, remark);
  return element;
}

function toggleRow(index) {
  const row = rows[index];
  if (!row) return;
  if (row.type === 'group') { if (openGroups.has(row.key)) openGroups.delete(row.key); else openGroups.add(row.key); }
  else if (isFiltered()) { if (collapsedFiltered.has(row.node.path)) collapsedFiltered.delete(row.node.path); else collapsedFiltered.add(row.node.path); }
  else if (expanded.has(row.node.path)) expanded.delete(row.node.path); else expanded.add(row.node.path);
  renderTree();
  $('tree-body').querySelector(`.toggle[data-index="${index}"]`)?.focus();
}

function setAllFolders(open) {
  const paths = [];
  walk(view, node => { if (node.kind === 'dir') paths.push(node.path); });
  if (isFiltered()) collapsedFiltered = open ? new Set() : new Set(paths);
  else expanded = open ? new Set(paths) : new Set();
  renderTree();
}

// ---- Visualisation ----
function renderViz() {
  const mode = viz.mode;
  $('zoom').hidden = mode !== 'map';
  for (const [group, value] of [['viz-mode', viz.mode], ['viz-color', viz.color], ['viz-measure', viz.measure]]) {
    for (const button of $(group).querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.value === value));
  }
  const noSize = !view.size && view.files > 0;
  $('viz-hint').textContent = `${t(mode === 'map' ? 'hintMap' : mode === 'sunburst' ? 'hintSunburst' : 'hintTreemap')}${noSize ? ` ${t('hintNoSize')}` : viz.measure === 'count' ? ` ${t('hintCount')}` : ''}`;
  viz.setTree(view, scanNow);
  renderLegend();
}

function renderLegend() {
  const legend = $('legend');
  let entries;
  if (viz.color === 'age') entries = [...AGE_COLORS.map((color, index) => [color, t('ages')[index]]), ['#c3c2b7', t('unknownDate')]];
  else {
    const present = new Set();
    walk(view, node => { if (node.kind === 'file') present.add(family(node.ext)); });
    entries = FAMILIES.filter(name => present.has(name)).map(name => [FAMILY_COLORS[name], t('families')[name]]);
  }
  legend.replaceChildren(...entries.map(([color, label]) => {
    const item = document.createElement('li');
    const swatch = document.createElement('span'); swatch.className = 'swatch'; swatch.style.background = color;
    const text = document.createElement('span'); text.textContent = label;
    item.append(swatch, text); return item;
  }));
}

// ---- Statistics ----
function renderStats() {
  const stats = computeStats(view, scanNow);
  const root = $('stats-content');
  const make = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const section = (heading, hint) => { const box = make('section', 'stat-section'); box.append(make('h3', '', heading)); if (hint) box.append(make('p', 'stat-hint', hint)); return box; };
  const table = (headings, data, numeric = []) => {
    const element = make('table', 'data-table');
    const head = element.createTHead().insertRow();
    headings.forEach((heading, index) => { const cell = make('th', numeric.includes(index) ? 'num' : '', heading); cell.scope = 'col'; head.append(cell); });
    const body = element.createTBody();
    for (const values of data) { const line = body.insertRow(); values.forEach((value, index) => { const cell = line.insertCell(); cell.textContent = value; if (numeric.includes(index)) cell.className = 'num'; }); }
    const scroll = make('div', 'table-scroll'); scroll.append(element); return scroll;
  };
  const out = [];
  out.push(make('h2', 'stats-title', t('statsTitle')));
  if (isFiltered()) out.push(make('p', 'stat-hint', t('statsFiltered')));
  const tiles = make('div', 'stats tiles');
  const tile = (value, label) => { const box = make('div'); box.append(make('strong', '', value), make('span', '', label)); tiles.append(box); };
  tile(stats.dirs.toLocaleString(t('locale')), t('statDirs')(stats.dirs));
  tile(stats.files.toLocaleString(t('locale')), t('statFiles')(stats.files));
  tile(formatSize(stats.size), t('sizeLabel'));
  tile(String(stats.maxDepth), t('statsDepth'));
  if (scan.stats.emptyDirsVisible) tile(stats.emptyDirs.toLocaleString(t('locale')), t('statsEmpty'));
  out.push(tiles);

  // By file type: one row per family, bars for count and size share the row's swatch and label.
  const types = section(t('byType'));
  const totalCount = Math.max(1, stats.files), totalSize = Math.max(1, stats.size);
  const maxCount = Math.max(1, ...FAMILIES.map(name => stats.byFamily[name].count));
  const maxSize = Math.max(1, ...FAMILIES.map(name => stats.byFamily[name].size));
  const list = make('div', 'type-bars');
  const header = make('div', 'type-row head');
  header.append(make('span', '', t('typeHeading')), make('span', '', t('countHeading')), make('span', '', t('volumeHeading')));
  list.append(header);
  for (const name of FAMILIES) {
    const { count, size } = stats.byFamily[name];
    if (!count) continue;
    const line = make('div', 'type-row');
    const label = make('span', 'type-name');
    const swatch = make('span', 'swatch'); swatch.style.background = FAMILY_COLORS[name];
    label.append(swatch, make('span', '', t('families')[name]));
    const bar = (value, max, text) => {
      const cell = make('span', 'bar-cell');
      const track = make('span', 'bar'); const fill = make('span', 'bar-fill');
      fill.style.width = `${Math.max(1.5, 100 * value / max)}%`; fill.style.background = FAMILY_COLORS[name];
      track.append(fill); cell.append(track, make('span', 'bar-value', text)); return cell;
    };
    line.title = `${t('families')[name]} — ${t('files')(count)} (${Math.round(100 * count / totalCount)} %) · ${formatSize(size)} (${Math.round(100 * size / totalSize)} %)`;
    line.append(label, bar(count, maxCount, count.toLocaleString(t('locale'))), bar(size, maxSize, `${formatSize(size)} · ${Math.round(100 * size / totalSize)} %`));
    list.append(line);
  }
  types.append(list);
  out.push(types);

  // Activity timeline: one series, columns per month or per year.
  const timeline = section(`${t('timelineTitle')} (${t(stats.timeline.unit === 'month' ? 'timelineMonth' : 'timelineYear')})`);
  if (!stats.timeline.bars.length) timeline.append(make('p', 'stat-hint', t('noDates')));
  else {
    timeline.append(timelineChart(stats.timeline));
    const details = make('details', 'data-view'); details.append(make('summary', '', t('showData')));
    details.append(table([t('periodHeading'), t('countHeading')], stats.timeline.bars.filter(bar => bar.count).map(bar => [periodLabel(bar, stats.timeline.unit), bar.count.toLocaleString(t('locale'))]), [1]));
    timeline.append(details);
  }
  out.push(timeline);

  const pair = make('div', 'stat-pair');
  const hot = section(t('hotTitle'), t('hotHint'));
  if (!stats.hot.length) hot.append(make('p', 'stat-hint', t('noHot')));
  else hot.append(table([t('folderHeading'), t('recentHeading'), t('latestHeading')], stats.hot.slice(0, 10).map(({ dir, recent }) => [dir.path || dir.name, recent.toLocaleString(t('locale')), formatDate(dir.latest)]), [1]));
  if (stats.hot.length > 10) hot.append(make('p', 'stat-hint', t('more')(stats.hot.length - 10)));
  const dormant = section(t('dormantTitle'), stats.dormant.length ? t('dormantHint')(formatSize(stats.dormantSize)) : '');
  if (!stats.dormant.length) dormant.append(make('p', 'stat-hint', t('noDormant')));
  else dormant.append(table([t('folderHeading'), t('volumeHeading'), t('latestHeading')], stats.dormant.slice(0, 10).map(dir => [dir.path, formatSize(dir.size), formatDate(dir.latest)]), [1]));
  if (stats.dormant.length > 10) dormant.append(make('p', 'stat-hint', t('more')(stats.dormant.length - 10)));
  pair.append(hot, dormant);
  out.push(pair);
  root.replaceChildren(...out);
}

const periodLabel = (bar, unit) => (unit === 'month' ? `${t('months')[bar.month]} ${bar.year}` : String(bar.year));

function timelineChart({ bars, unit }) {
  const NS = 'http://www.w3.org/2000/svg';
  const WIDTH = 960, HEIGHT = 220, LEFT = 44, BOTTOM = 26, TOP = 12;
  const max = Math.max(1, ...bars.map(bar => bar.count));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const slot = (WIDTH - LEFT - 8) / bars.length;
  const width = Math.min(24, Math.max(2, slot - 2));
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`); svg.setAttribute('class', 'timeline'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t('timelineTitle'));
  const add = (name, attributes) => { const node = document.createElementNS(NS, name); for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value); svg.append(node); return node; };
  const y = value => HEIGHT - BOTTOM - (HEIGHT - BOTTOM - TOP) * value / top;
  for (let value = 0; value <= top; value += step) {
    add('line', { x1: LEFT, x2: WIDTH - 4, y1: y(value), y2: y(value), class: value ? 'grid' : 'baseline' });
    add('text', { x: LEFT - 6, y: y(value) + 4, 'text-anchor': 'end', class: 'tick' }).textContent = compact(value);
  }
  const labelEvery = Math.max(1, Math.ceil(bars.length / 12));
  bars.forEach((bar, index) => {
    const x = LEFT + index * slot + (slot - width) / 2;
    if (bar.count) {
      const height = HEIGHT - BOTTOM - y(bar.count);
      const radius = Math.min(4, width / 2, height);
      // Rounded data end, square at the baseline.
      const path = add('path', { class: 'column', d: `M${x} ${HEIGHT - BOTTOM}V${y(bar.count) + radius}Q${x} ${y(bar.count)} ${x + radius} ${y(bar.count)}H${x + width - radius}Q${x + width} ${y(bar.count)} ${x + width} ${y(bar.count) + radius}V${HEIGHT - BOTTOM}Z` });
      const hit = add('rect', { x: LEFT + index * slot, y: TOP, width: slot, height: HEIGHT - BOTTOM - TOP, class: 'hit' });
      const tip = document.createElementNS(NS, 'title'); tip.textContent = `${periodLabel(bar, unit)} : ${t('files')(bar.count)}`;
      hit.append(tip); path.append(tip.cloneNode(true));
    }
    if (index % labelEvery === 0) add('text', { x: LEFT + index * slot + slot / 2, y: HEIGHT - 8, 'text-anchor': 'middle', class: 'tick' }).textContent = unit === 'month' ? (bar.month === 0 || index === 0 ? `${t('months')[bar.month]} ${String(bar.year).slice(2)}` : t('months')[bar.month]) : String(bar.year);
  });
  return svg;
}
const niceStep = max => { const raw = max / 4, power = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 5, 10].map(factor => factor * power).find(value => value >= raw) || power * 10; };
const compact = value => (value >= 1000 ? `${(value / 1000).toLocaleString(t('locale'), { maximumFractionDigits: 1 })}K` : String(value));

// ---- Grouping thresholds editor ----
function renderThresholds() {
  $('grouping').checked = groupingOn;
  const list = $('threshold-list');
  list.replaceChildren(...Object.entries(thresholds).sort((a, b) => naturalCompare(a[0], b[0])).map(([ext, count]) => {
    const item = document.createElement('li');
    const label = document.createElement('label');
    const name = document.createElement('span'); name.textContent = ext;
    const input = document.createElement('input');
    input.type = 'number'; input.min = '1'; input.step = '1'; input.value = String(count); input.dataset.ext = ext; input.inputMode = 'numeric';
    input.setAttribute('aria-label', `${ext} : ${t('countLabel')}`);
    label.append(name, input);
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'remove'; remove.dataset.ext = ext; remove.textContent = '×';
    remove.setAttribute('aria-label', t('remove')(ext));
    item.append(label, remove); return item;
  }));
}
function saveThresholds() { storage.set(THRESHOLDS_KEY, JSON.stringify(thresholds)); update(); }

// ---- Excel export ----
function exportRows(root) {
  const base = $('root-path').value.trim().replace(/["<>|]/g, '');
  const windows = /\\/.test(base) || /^[a-z]:/i.test(base);
  const separator = windows ? '\\' : '/';
  const prefix = base.replace(/[\\/]+$/, '');
  const link = path => (prefix ? `${prefix}${separator}${path.split('/').join(separator)}` : '');
  return flatten(root, grouping()).map(row => {
    if (row.type === 'group') return { type: 'group', depth: row.depth, name: groupLabel(row), size: row.size, sizeText: formatSize(row.size), mtime: row.mtime, remark: '', link: '' };
    const node = row.node;
    if (row.type === 'dir') return { type: 'dir', depth: row.depth, name: node.name, size: null, sizeText: '', mtime: node.latest, remark: remarkOf(node), link: link(node.path) };
    return { type: 'file', depth: row.depth, name: node.name, size: node.size, sizeText: formatSize(node.size), mtime: node.mtime, remark: remarkOf(node), link: '' };
  });
}

function filterSummary() {
  if (!filtersActive(filters)) return '';
  const f = COPY[lang].filterSummary, parts = [];
  if (filters.search.trim()) parts.push(f.search(filters.search.trim()));
  if (filters.extensions.length) parts.push(f.extensions(filters.extensions.map(extensionLabel).join(', ')));
  if (filters.from) parts.push(f.from(filters.from));
  if (filters.to) parts.push(f.to(filters.to));
  if (filters.minSize) parts.push(f.minSize(formatSize(filters.minSize)));
  if (filters.depth) parts.push(f.depth(filters.depth));
  return parts.join(', ');
}

async function download() {
  if (!scan || busy) return;
  const filteredOnly = $('export-filtered').checked && filtersActive(filters);
  const data = exportRows(filteredOnly ? view : scan.root);
  const h = COPY[lang].header, now = new Date();
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const header = [h.intro, h.root($('root-path').value.trim() || scan.root.name), h.date(stamp), h.grouping(groupingOn), h.depth(scanDepth),
    h.view(filteredOnly ? filterSummary() : ''), '', h.generator, ''];
  if (!data.length) { showStatus('nothingToExport', 'error'); return; }
  if (data.length > EXCEL_ROWS - header.length - 1) { showStatus('tooManyRows', 'error'); return; }
  const safe = scan.root.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 120);
  const suggestedName = `Arborescence_${safe}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
  // The save dialog must open while the click still counts as a user gesture, before generating.
  let target = null;
  if (canSave) {
    try {
      target = await window.showSaveFilePicker({ suggestedName, id: 'arborescento-export',
        types: [{ description: 'Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }] });
    } catch (error) {
      if (error.name === 'AbortError') { showStatus('saveCancelled'); return; }
      target = null;
    }
  }
  const token = ++operation;
  setBusy(true); showStatus('exporting');
  $('progress-label').textContent = t('exporting'); $('progress').removeAttribute('value');
  exportWorker = new Worker(new URL('./export-worker.js', import.meta.url));
  const finish = () => { exportWorker?.terminate(); exportWorker = null; setBusy(false); };
  exportWorker.onerror = () => { if (token === operation) { finish(); showStatus('exportError', 'error'); } };
  exportWorker.onmessage = async ({ data: message }) => {
    if (token !== operation) return;
    if (message.error) { finish(); showStatus('exportError', 'error'); return; }
    const blob = new Blob([message.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    try {
      if (target) {
        const writable = await target.createWritable();
        await writable.write(blob); await writable.close();
        finish(); step(2); showStatus('saved', 'success');
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = suggestedName;
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        finish(); step(2); showStatus('downloaded', 'success');
      }
    } catch (error) { console.error(error); finish(); showStatus('exportError', 'error'); }
  };
  const c = COPY[lang];
  exportWorker.postMessage({ rows: data, header, sheetName: c.sheet, now: scanNow, hotDays: HOT_DAYS, oldDays: OLD_DAYS,
    headings: { level: c.levelHeading, size: c.sizeHeading, date: c.dateHeading, bytes: c.bytesHeading, remark: c.remarkHeading } });
}

// ---- Translation ----
function translate() {
  document.documentElement.lang = lang;
  document.title = t('title');
  for (const button of $('language').querySelectorAll('button')) {
    const selected = button.dataset.lang === lang;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  }
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll('[data-placeholder]').forEach(element => { element.placeholder = t(element.dataset.placeholder); });
  $('steps').setAttribute('aria-label', t('steps'));
  $('tabs').setAttribute('aria-label', t('tabs'));
  $('viz-mode').setAttribute('aria-label', t('vizModeLabel')); $('viz-color').setAttribute('aria-label', t('vizColorLabel')); $('viz-measure').setAttribute('aria-label', t('vizMeasureLabel'));
  $('browser-note').textContent = t(canPick ? 'browserFull' : 'browserBasic');
  renderThresholds();
  showStatus(statusKey, statusKind);
  if (scan) { buildFilterOptions(); update(); }
}

// ---- Events ----
$('choose').addEventListener('click', chooseFolder);
$('folder-input').addEventListener('change', async () => {
  const files = $('folder-input').files;
  if (!files.length) return;
  await runScan(options => scanFileList(files, options));
  $('folder-input').value = '';
});
$('demo').addEventListener('click', () => {
  if (busy) return;
  elapsed = 0; readDepth();
  load(exampleTree());
  $('root-path').value = 'P:\\Projets\\P-2471_Pont_riviere_du_Loup';
});
$('clear').addEventListener('click', reset);
$('cancel').addEventListener('click', () => {
  if (exportWorker) { operation++; exportWorker.terminate(); exportWorker = null; setBusy(false); showStatus('exportCancelled'); }
  else controller?.abort();
});
$('download').addEventListener('click', download);
$('max-depth').addEventListener('change', readDepth);
for (const button of $('language').querySelectorAll('button')) button.addEventListener('click', () => {
  if (button.dataset.lang === lang) return;
  lang = button.dataset.lang; storage.set(LANGUAGE_KEY, lang); translate();
});

$('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { collapsedFiltered = new Set(); update(); }, 160);
});
for (const [id, key] of [['date-from', 'from'], ['date-to', 'to']]) $(id).addEventListener('change', () => { filters[key] = $(id).value; collapsedFiltered = new Set(); update(); });
$('min-size').addEventListener('change', () => { filters.minSize = Number($('min-size').value); collapsedFiltered = new Set(); update(); });
$('depth-shown').addEventListener('change', () => { filters.depth = Number($('depth-shown').value); collapsedFiltered = new Set(); update(); });
$('extension-chips').addEventListener('click', event => {
  const chip = event.target.closest('.chip');
  if (!chip) return;
  const ext = chip.dataset.ext;
  filters.extensions = filters.extensions.includes(ext) ? filters.extensions.filter(item => item !== ext) : [...filters.extensions, ext];
  chip.setAttribute('aria-pressed', String(filters.extensions.includes(ext)));
  collapsedFiltered = new Set(); update();
});
$('reset-filters').addEventListener('click', () => { filters = emptyFilters(); collapsedFiltered = new Set(); resetFilterInputs(); buildFilterOptions(); update(); });
$('expand-all').addEventListener('click', () => setAllFolders(true));
$('collapse-all').addEventListener('click', () => setAllFolders(false));
$('tree-scroll').addEventListener('scroll', () => requestAnimationFrame(paintRows), { passive: true });
$('tree-body').addEventListener('click', event => {
  const toggle = event.target.closest('.toggle');
  if (toggle) { toggleRow(Number(toggle.dataset.index)); return; }
  const row = event.target.closest('.tree-row');
  if (row && (row.classList.contains('dir') || row.classList.contains('group'))) row.querySelector('.toggle')?.click();
});

const tabs = ['explorer', 'viz', 'stats'];
for (const name of tabs) {
  $(`tab-${name}`).addEventListener('click', () => selectTab(name));
  $(`tab-${name}`).addEventListener('keydown', event => {
    const index = tabs.indexOf(name);
    if (event.key === 'ArrowRight') selectTab(tabs[(index + 1) % tabs.length], true);
    else if (event.key === 'ArrowLeft') selectTab(tabs[(index + tabs.length - 1) % tabs.length], true);
  });
}
for (const [group, key] of [['viz-mode', 'mode'], ['viz-color', 'color'], ['viz-measure', 'measure']]) {
  $(group).addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    viz[key] = button.dataset.value;
    if (key === 'mode') viz.focus = viz.focus || '';
    renderViz();
  });
}
$('zoom-in').addEventListener('click', () => { viz.zoom = Math.min(2, viz.zoom * 1.25); viz.render(); });
$('zoom-out').addEventListener('click', () => { viz.zoom = Math.max(0.4, viz.zoom / 1.25); viz.render(); });

$('grouping').addEventListener('change', () => { groupingOn = $('grouping').checked; storage.set(GROUPING_KEY, groupingOn ? 'on' : 'off'); update(); });
$('threshold-list').addEventListener('change', event => {
  const input = event.target.closest('input[data-ext]');
  if (!input) return;
  const count = Math.round(Number(input.value));
  if (Number.isInteger(count) && count >= 1) { thresholds[input.dataset.ext] = count; saveThresholds(); }
  else input.value = String(thresholds[input.dataset.ext]);
});
$('threshold-list').addEventListener('click', event => {
  const button = event.target.closest('.remove');
  if (!button) return;
  delete thresholds[button.dataset.ext]; renderThresholds(); saveThresholds();
});
$('threshold-add').addEventListener('click', () => {
  const ext = normalizeExtension($('threshold-ext').value), count = Math.round(Number($('threshold-count').value));
  if (!ext || !Number.isInteger(count) || count < 1) { showStatus('invalidThreshold', 'error'); return; }
  thresholds[ext] = count; $('threshold-ext').value = '';
  renderThresholds(); saveThresholds();
});
$('threshold-reset').addEventListener('click', () => { thresholds = { ...DEFAULT_THRESHOLDS }; renderThresholds(); saveThresholds(); });

// Drag and drop a folder anywhere on the page.
const dropzone = $('dropzone');
for (const name of ['dragenter', 'dragover']) dropzone.addEventListener(name, event => { event.preventDefault(); if (!busy) dropzone.classList.add('drag'); });
dropzone.addEventListener('dragleave', event => { if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove('drag'); });
document.addEventListener('dragover', event => { if ([...event.dataTransfer.types].includes('Files')) event.preventDefault(); });
document.addEventListener('drop', async event => {
  event.preventDefault(); dropzone.classList.remove('drag');
  if (busy) return;
  // Handles and entries are only available during the drop event itself: request them first.
  const source = dropSources(event.dataTransfer)[0];
  if (!source) return;
  try {
    const handle = source.handle ? await source.handle : null;
    if (handle?.kind === 'directory') { void runScan(options => scanHandle(handle, options)); return; }
  } catch {}
  if (source.entry?.isDirectory) { void runScan(options => scanEntry(source.entry, options)); return; }
  showStatus('dropFolder', 'error');
});

statusKey = 'ready';
translate();
for (const id of ['choose', 'demo']) $(id).disabled = false;
