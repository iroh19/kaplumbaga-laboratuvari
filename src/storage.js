// Sahneleri tarayıcıda (LocalStorage) saklar ve bağlantıyla paylaşılabilir hale getirir.
// LocalStorage bazı tarayıcılarda (gizli mod, kapalı çerezler) hata verebilir; bu yüzden her erişim try/catch içinde.

const KAYITLI_ANAHTAR = "kaplumbaga-lab:sahneler";
const SON_ANAHTAR = "kaplumbaga-lab:son";

/**
 * @typedef {Object} SavedScene
 * @property {string} id
 * @property {string} name
 * @property {number} createdAt
 * @property {import("./sim/world.js").Scene} scene
 */

function oku(anahtar, varsayilan) {
  try {
    const ham = localStorage.getItem(anahtar);
    return ham ? JSON.parse(ham) : varsayilan;
  } catch {
    return varsayilan;
  }
}

function yaz(anahtar, deger) {
  try {
    localStorage.setItem(anahtar, JSON.stringify(deger));
    return true;
  } catch {
    return false;
  }
}

/** @returns {SavedScene[]} En yeni kayıt en üstte. */
export function listSaved() {
  const liste = oku(KAYITLI_ANAHTAR, []);
  return Array.isArray(liste) ? liste.sort((a, b) => b.createdAt - a.createdAt) : [];
}

/** Sahneyi verilen adla kaydeder, güncel listeyi döndürür. */
export function saveScene(name, scene) {
  const kayit = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "Adsız sahne",
    createdAt: Date.now(),
    scene,
  };
  const liste = [kayit, ...listSaved()];
  yaz(KAYITLI_ANAHTAR, liste);
  return liste;
}

/** Kaydı siler, güncel listeyi döndürür. */
export function deleteSaved(id) {
  const liste = listSaved().filter((k) => k.id !== id);
  yaz(KAYITLI_ANAHTAR, liste);
  return liste;
}

/** Kullanıcının üzerinde çalıştığı son sahne (sayfa yenilenince kaldığı yerden devam için). */
export function loadLast() {
  return oku(SON_ANAHTAR, null);
}

export function saveLast(scene) {
  yaz(SON_ANAHTAR, scene);
}

// ---- Bağlantıyla paylaşma ----------------------------------------------

/** Sahneyi URL'ye sığacak bir metne çevirir (base64url). */
export function encodeScene(scene) {
  const json = JSON.stringify(scene);
  const bytes = new TextEncoder().encode(json);
  let ikili = "";
  bytes.forEach((b) => (ikili += String.fromCharCode(b)));
  return btoa(ikili).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** encodeScene'in tersi. Bozuk girdide null döndürür. */
export function decodeScene(metin) {
  try {
    const b64 = metin.replace(/-/g, "+").replace(/_/g, "/");
    const ikili = atob(b64);
    const bytes = Uint8Array.from(ikili, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** Adres çubuğundaki #s=... kısmından sahneyi okur. */
export function sceneFromHash(hash = window.location.hash) {
  const eslesme = /[#&]s=([^&]+)/.exec(hash);
  return eslesme ? decodeScene(eslesme[1]) : null;
}

/** Sahnenin paylaşılabilir bağlantısı. */
export function shareUrl(scene) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#s=${encodeScene(scene)}`;
}
