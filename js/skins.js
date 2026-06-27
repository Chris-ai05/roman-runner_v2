// ============================================================
//  Skins – austauschbares Aussehen des Läufers.
//  Jeder Skin baut nur die sichtbaren Meshes und hängt sie an die
//  vom Player gelieferten „Art"-Container (Körper, Arme, Beine).
//  Das bewegte Skelett bleibt davon unberührt – so funktioniert die
//  Lauf-/Sprung-/Rutsch-Animation für jeden Skin gleich.
// ============================================================
import * as THREE from 'three';

// Geteilte Materialien (einmal erstellt, von allen Skins genutzt)
const MAT = {
  skin:    new THREE.MeshStandardMaterial({ color: 0xc98e5a, roughness: 0.8 }),
  skinTan: new THREE.MeshStandardMaterial({ color: 0xbe8a55, roughness: 0.82 }),
  tunic:   new THREE.MeshStandardMaterial({ color: 0x8e1f2f, roughness: 0.85 }),
  gold:    new THREE.MeshStandardMaterial({ color: 0xd9a93e, roughness: 0.35, metalness: 0.7 }),
  bronze:  new THREE.MeshStandardMaterial({ color: 0xa07a3a, roughness: 0.4, metalness: 0.6 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }),
  plume:   new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.8 }),
  cape:    new THREE.MeshStandardMaterial({ color: 0x7a1624, roughness: 0.9, side: THREE.DoubleSide }),
  steel:   new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 0.35, metalness: 0.8 }),
};

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}
function cyl(rt, rb, h, seg, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true;
  return m;
}
function sph(r, mat, phi) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10, 0, Math.PI * 2, 0, phi ?? Math.PI), mat);
  m.castShadow = true;
  return m;
}
function at(m, x, y, z) { m.position.set(x, y, z); return m; }

// ---------- Legionär (Standard) ----------
function buildLegionary({ body, armL, armR, legL, legR }) {
  body.add(at(box(0.62, 0.62, 0.36, MAT.tunic), 0, 1.18, 0));   // Tunika-Torso
  body.add(at(box(0.66, 0.12, 0.4, MAT.gold), 0, 0.92, 0));     // Gürtel
  body.add(at(cyl(0.34, 0.42, 0.3, 8, MAT.leather), 0, 0.76, 0)); // Schurz
  body.add(at(sph(0.21, MAT.skin), 0, 1.72, 0));                // Kopf
  body.add(at(sph(0.235, MAT.bronze, Math.PI * 0.62), 0, 1.76, 0)); // Helm
  body.add(at(box(0.07, 0.16, 0.42, MAT.plume), 0, 1.97, 0));   // roter Kamm

  for (const grp of [armL, armR]) {
    grp.add(at(box(0.16, 0.34, 0.16, MAT.skin), 0, -0.16, 0));
    grp.add(at(box(0.14, 0.3, 0.14, MAT.skin), 0, -0.46, 0));
    grp.add(at(box(0.17, 0.08, 0.17, MAT.bronze), 0, -0.3, 0));
  }
  for (const grp of [legL, legR]) {
    grp.add(at(box(0.2, 0.36, 0.2, MAT.skin), 0, -0.18, 0));
    grp.add(at(box(0.17, 0.34, 0.17, MAT.bronze), 0, -0.52, 0)); // Beinschiene
    grp.add(at(box(0.18, 0.1, 0.3, MAT.leather), 0, -0.7, 0.05));
  }

  const parma = at(cyl(0.26, 0.26, 0.05, 14, MAT.leather), 0, 1.25, 0.26);
  parma.rotation.x = Math.PI / 2; body.add(parma);
  body.add(at(sph(0.07, MAT.gold), 0, 1.25, 0.3));               // Schildbuckel
  const sword = at(box(0.05, 0.4, 0.08, MAT.bronze), 0.36, 0.95, 0.1);
  sword.rotation.z = 0.15; body.add(sword);
  const cape = at(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), MAT.cape), 0, 1.45, 0.22);
  cape.rotation.x = 0.3; cape.castShadow = true; body.add(cape);

  return { cape };
}

// ---------- Gladiator (Murmillo) ----------
function buildGladiator({ body, armL, armR, legL, legR }) {
  body.add(at(box(0.66, 0.62, 0.38, MAT.skinTan), 0, 1.18, 0));  // nackter Oberkörper
  body.add(at(box(0.72, 0.16, 0.42, MAT.tunic), 0, 0.9, 0));     // Balteus (breiter Gürtel)
  body.add(at(cyl(0.34, 0.46, 0.34, 8, MAT.leather), 0, 0.73, 0)); // Subligaculum
  body.add(at(sph(0.21, MAT.skinTan), 0, 1.72, 0));             // Kopf

  // Murmillo-Helm: Stahlkuppel, Krempe, Gesichtsplatte, hoher Kamm
  body.add(at(sph(0.25, MAT.steel, Math.PI * 0.6), 0, 1.75, 0));
  const brim = at(cyl(0.3, 0.3, 0.05, 16, MAT.steel), 0, 1.62, 0); body.add(brim);
  body.add(at(box(0.26, 0.24, 0.05, MAT.steel), 0, 1.66, 0.2));  // Gesichtsplatte
  body.add(at(box(0.1, 0.12, 0.46, MAT.gold), 0, 1.93, 0));      // Kammhalter
  body.add(at(box(0.09, 0.3, 0.52, MAT.plume), 0, 2.06, 0));     // hoher Kamm

  // großes Scutum auf dem Rücken (zur Kamera gerichtet)
  body.add(at(box(0.7, 1.08, 0.06, MAT.gold), 0, 1.2, 0.26));    // Rand
  body.add(at(box(0.62, 1.0, 0.1, MAT.tunic), 0, 1.2, 0.3));     // Schildfläche
  body.add(at(sph(0.1, MAT.gold), 0, 1.2, 0.37));               // Buckel

  // Gladius an der Hüfte
  const sword = at(box(0.06, 0.42, 0.09, MAT.steel), 0.37, 0.95, 0.1);
  sword.rotation.z = 0.14; body.add(sword);
  body.add(at(box(0.13, 0.08, 0.12, MAT.gold), 0.37, 1.2, 0.1)); // Knauf

  // Arme (tanned), rechter Arm mit Manica (Segment-Armschutz)
  for (const grp of [armL, armR]) {
    grp.add(at(box(0.16, 0.34, 0.16, MAT.skinTan), 0, -0.16, 0));
    grp.add(at(box(0.14, 0.3, 0.14, MAT.skinTan), 0, -0.46, 0));
  }
  armR.add(at(box(0.22, 0.12, 0.22, MAT.steel), 0, 0.02, 0));    // Schulterkappe
  for (const y of [-0.1, -0.28, -0.46]) armR.add(at(box(0.18, 0.12, 0.18, MAT.steel), 0, y, 0));
  armL.add(at(box(0.17, 0.09, 0.17, MAT.leather), 0, -0.3, 0));  // Lederband

  // Beine: links Beinschiene (Ocrea) aus Stahl, rechts nackt
  legL.add(at(box(0.2, 0.36, 0.2, MAT.skinTan), 0, -0.18, 0));
  legL.add(at(box(0.18, 0.36, 0.18, MAT.steel), 0, -0.52, 0));
  legL.add(at(box(0.18, 0.1, 0.3, MAT.leather), 0, -0.7, 0.05));
  legR.add(at(box(0.2, 0.36, 0.2, MAT.skinTan), 0, -0.18, 0));
  legR.add(at(box(0.17, 0.34, 0.17, MAT.skinTan), 0, -0.52, 0));
  legR.add(at(box(0.18, 0.1, 0.3, MAT.leather), 0, -0.7, 0.05));

  return { cape: null };
}

// Registry: Reihenfolge = Anzeige im Charaktermenü
export const SKINS = [
  { id: 'legionary', name: 'Legionär', desc: 'Roms Standardsoldat – Bronzehelm mit rotem Kamm und Umhang.', price: 0, build: buildLegionary },
  { id: 'gladiator', name: 'Gladiator', desc: 'Murmillo der Arena – Stahlhelm, Manica und großes Scutum.', price: 300, build: buildGladiator },
];

export const DEFAULT_SKIN = 'legionary';
export function getSkin(id) { return SKINS.find((s) => s.id === id); }
