// Synthetic bridge project for "Try an example": no real file is read.
import { makeDir, makeFile, finalize } from './tree.js';

const DAY = 86400000;

export function exampleTree(now = Date.now()) {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const root = makeDir('P-2471_Pont_riviere_du_Loup');
  const stats = { ignored: 3, denied: [], unexplored: 0, files: 0, dirs: 0, emptyDirsVisible: true, depthLimited: false };
  const dir = (parent, name) => {
    const node = makeDir(name, parent.path ? `${parent.path}/${name}` : name, parent.depth + 1);
    parent.children.push(node); stats.dirs++; return node;
  };
  // ageDays: how long ago the files were last modified (with a little spread).
  const files = (parent, names, ageDays, size) => {
    for (const name of names) {
      const days = Math.max(0, ageDays * (0.8 + random() * 0.4));
      const bytes = Math.round(size * (0.4 + random() * 1.2));
      parent.children.push(makeFile(name, `${parent.path}/${name}`, parent.depth + 1, bytes, now - days * DAY));
      stats.files++;
    }
  };
  const series = (prefix, count, ext, start = 1) => Array.from({ length: count }, (_, index) => `${prefix}${String(index + start).padStart(2, '0')}${ext}`);

  const admin = dir(root, '01_Administration');
  files(admin, ['Offre_de_services.pdf', 'Contrat_signe.pdf', 'Echeancier.xlsx', 'Liste_contacts.xlsx'], 820, 900e3);
  const meetings = dir(admin, 'Reunions');
  files(meetings, series('CR_reunion_', 14, '.docx'), 300, 180e3);
  files(meetings, series('CR_reunion_', 14, '.pdf'), 290, 420e3);
  files(dir(admin, 'Facturation'), series('Facture_', 9, '.pdf'), 60, 250e3);

  const survey = dir(root, '02_Releves');
  const photos = dir(survey, 'Photos_inspection_2024');
  files(photos, series('IMG_', 48, '.jpg', 4410), 760, 4.2e6);
  files(dir(survey, 'Arpentage'), ['Leve_topo.dwg', 'Leve_topo.pdf', 'Points.csv'], 800, 3.5e6);
  files(dir(survey, 'Geotechnique'), ['Rapport_geotechnique.pdf', 'Forages_F1-F6.pdf'], 700, 12e6);

  const calcs = dir(root, '03_Calculs');
  const model = dir(calcs, 'Modele_poutres');
  files(model, ['Poutres_continues_v1.xlsx', 'Poutres_continues_v2.xlsx', 'Poutres_continues_final.xlsx', 'Enveloppes_CL-625.pdf'], 120, 1.8e6);
  files(dir(calcs, 'Fondations'), ['Semelles.xlsx', 'Pieux_lateraux.xlsx', 'Note_fondations.docx'], 95, 900e3);
  const seismic = dir(calcs, 'Seisme');
  files(seismic, ['Spectre_S6-25.xlsx', 'Analyse_modale.pdf'], 9, 2.4e6);
  dir(calcs, 'A_classer');

  const drawings = dir(root, '04_Plans');
  const issued = dir(drawings, 'Emis_pour_construction');
  files(issued, series('P-2471-S-', 32, '.pdf'), 25, 1.6e6);
  files(issued, series('P-2471-S-', 32, '.dwg'), 26, 2.8e6);
  const preliminary = dir(drawings, 'Preliminaires');
  files(preliminary, series('Esquisse_', 6, '.pdf'), 400, 2e6);
  files(preliminary, ['Gabarit.dwt', 'Plumes.ctb', 'Plumes_couleur.ctb'], 900, 40e3);
  files(dir(drawings, 'Revision_client'), series('Annotations_', 4, '.pdf'), 4, 2.2e6);

  const reports = dir(root, '05_Rapports');
  files(reports, ['Rapport_conception_preliminaire.docx', 'Rapport_conception_preliminaire.pdf', 'Rapport_final.docx', 'Rapport_final.pdf'], 6, 6.5e6);
  files(dir(reports, 'Annexes'), ['Annexe_A_calculs.pdf', 'Annexe_B_photos.pdf', 'Annexe_C_plans.pdf'], 7, 14e6);

  const archive = dir(root, '99_Archives');
  const old = dir(archive, '2021_Etude_de_faisabilite');
  files(old, ['Etude_faisabilite.pdf', 'Estimation_couts.xlsx', 'Variantes.pptx', 'Visite_chantier.mov'], 1650, 9e6);
  files(dir(old, 'Photos'), series('DSC_', 22, '.jpg'), 1700, 3.1e6);
  files(archive, ['Ancien_projet_reference.zip'], 2100, 180e6);

  return { root: finalize(root), stats };
}
