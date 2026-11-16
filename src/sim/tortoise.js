// Grey Walter'ın mekanik kaplumbağası (Elmer ve Elsie, 1948-49) için basitleştirilmiş benzetim.
//
// Walter'ın anlattığı davranışlar (kaynaklar README'de):
//   * Işık yokken karanlık odada daire çizerek dolaşır; dönen fotosel ışık arar.
//   * Orta şiddetteki ışığa yaklaşır, çok parlak ışıktan uzaklaşır.
//   * Kabuk bir şeye çarparsa geri çekilir ve yön değiştirir.
//   * Pili azalınca parlak ışık da çekici gelir; kulübesine gidip şarj olur.
//   * Üzerindeki gösterge lambası, aranırken yanar, ışığa kilitlenince söner.
//     Aynadaki yansımasını ya da öteki kaplumbağayı görünce çıkan "dans" buradan gelir.
//
// Eşik değerleri ve hızlar bu projenin ayarıdır; Walter'ın devresinin ölçüleri değildir.
// Tüm fonksiyonlar SAF: girdiyi değiştirmez, yeni değer döndürür (world.js ile aynı tarz).

export const ROOM_W = 900;
export const ROOM_H = 560;

export const P = {
  RADIUS: 14,        // kabuğun yarıçapı (px)
  FALLOFF: 120,      // ışığın etkisinin yarıya indiği mesafe (px)
  LOW: 0.06,         // bundan sönük ışık görülmez
  BRIGHT: 0.55,      // bundan parlak ışık tedirgin eder (aç değilken)
  SCAN_RATE: 6,      // fotoselin dönüş hızı (rad/sn)
  SCAN_HALF: 0.32,   // dönen fotoselin görüş yarı açısı (rad)
  LOCK_HALF: 0.7,    // ışığa kilitlenince görüş yarı açısı (rad)
  SEARCH_SPEED: 38,
  SEARCH_TURN: 0.35, // arama sırasındaki dönüş hızı (rad/sn): geniş bir daire
  APPROACH_SPEED: 62,
  APPROACH_TURN: 2.6,
  FLEE_SPEED: 46,
  FLEE_TURN: 2.4,
  BACK_TIME: 0.8,
  BACK_SPEED: 40,
  BACK_TURN: 2.4,
  DRAIN: 0.006,      // pil boşalma hızı (1/sn): yaklaşık 2 dakikada aç olur
  CHARGE: 0.12,      // şarj hızı (1/sn)
  HUNGRY: 0.3,       // pil bunun altına inince "aç"
  FULL: 0.97,
  DOCK_DIST: 24,
  DOCK_MAX_BATTERY: 0.9,
  PILOT: 0.9,        // gösterge lambasının parlaklığı
  HUTCH_STRENGTH: 2.2,
};

/**
 * @typedef {"ara"|"yaklas"|"kac"|"geri"|"sarj"} Mode
 * @typedef {Object} Tortoise
 * @property {number} id @property {string} name @property {number} x @property {number} y
 * @property {number} heading @property {Mode} mode @property {number} modeTime
 * @property {number} scan @property {number} battery @property {boolean} hungry
 * @property {boolean} lampOn @property {number} seen @property {number} speed
 * @property {number} turnSign @property {{x:number,y:number}[]} trail
 *
 * @typedef {Object} TWorld
 * @property {number} width @property {number} height
 * @property {{id:number,x:number,y:number,strength:number}[]} lights
 * @property {{id:number,x:number,y:number,w:number,h:number}[]} obstacles
 * @property {{x:number,y:number}|null} hutch
 * @property {{x:number,y1:number,y2:number}|null} mirror
 * @property {Tortoise[]} tortoises
 * @property {number} time @property {number} nextId
 */

export function emptyTWorld() {
  return { width: ROOM_W, height: ROOM_H, lights: [], obstacles: [], hutch: null, mirror: null, tortoises: [], time: 0, nextId: 1 };
}

export function addTortoise(world, name, x, y, heading = 0, battery = 1) {
  const id = world.nextId;
  const t = {
    id, name, x, y, heading, mode: "ara", modeTime: 0, scan: 0, battery,
    hungry: battery < P.HUNGRY, lampOn: true, seen: 0, speed: 0,
    turnSign: id % 2 === 0 ? -1 : 1, trail: [],
  };
  return { ...world, tortoises: [...world.tortoises, t], nextId: id + 1 };
}
export function addLamp(world, x, y, strength = 1) {
  return { ...world, lights: [...world.lights, { id: world.nextId, x, y, strength }], nextId: world.nextId + 1 };
}
export function addObstacle(world, x, y, w = 70, h = 44) {
  return { ...world, obstacles: [...world.obstacles, { id: world.nextId, x: x - w / 2, y: y - h / 2, w, h }], nextId: world.nextId + 1 };
}
export function removeNearT(world, x, y, radius = 30) {
  const items = [
    ...world.lights.map((o) => ({ k: "l", o, d: Math.hypot(o.x - x, o.y - y) })),
    ...world.obstacles.map((o) => ({ k: "o", o, d: Math.hypot(o.x + o.w / 2 - x, o.y + o.h / 2 - y) - Math.max(o.w, o.h) / 2 })),
  ].filter((c) => c.d <= radius).sort((a, b) => a.d - b.d);
  if (!items.length) return world;
  const { k, o } = items[0];
  return k === "l"
    ? { ...world, lights: world.lights.filter((l) => l.id !== o.id) }
    : { ...world, obstacles: world.obstacles.filter((b) => b.id !== o.id) };
}

// ---- Geometri -----------------------------------------------------------

export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Doğru parçası bir dikdörtgenin içinden geçiyor mu? (slab yöntemi) */
export function segmentHitsRect(x1, y1, x2, y2, r) {
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  for (const [p, q] of [[-dx, x1 - r.x], [dx, r.x + r.w - x1], [-dy, y1 - r.y], [dy, r.y + r.h - y1]]) {
    if (p === 0) { if (q < 0) return false; }
    else {
      const t = q / p;
      if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
  }
  return true;
}

/** Daire (kabuk) duvara ya da bir engele değiyor mu? Kabuk anahtarı budur. */
export function touches(world, x, y) {
  const R = P.RADIUS;
  if (x < R || x > world.width - R || y < R || y > world.height - R) return true;
  return world.obstacles.some((o) => {
    const cx = clamp(x, o.x, o.x + o.w), cy = clamp(y, o.y, o.y + o.h);
    return Math.hypot(x - cx, y - cy) < R;
  });
}

// ---- Algılama -----------------------------------------------------------

/** Bu kaplumbağanın görebileceği tüm ışık kaynakları (engel arkasındakiler elenir). */
export function visibleSources(world, self) {
  const src = world.lights.map((l) => ({ x: l.x, y: l.y, strength: l.strength }));
  if (world.hutch) src.push({ x: world.hutch.x, y: world.hutch.y, strength: P.HUTCH_STRENGTH, hutch: true });
  for (const o of world.tortoises) {
    if (o.id !== self.id && o.lampOn) src.push({ x: o.x, y: o.y, strength: P.PILOT });
  }
  const m = world.mirror;
  if (m && self.lampOn && self.y >= m.y1 && self.y <= m.y2 && self.x < m.x) {
    src.push({ x: 2 * m.x - self.x, y: self.y, strength: P.PILOT, mirror: true }); // kendi lambasının yansıması
  }
  return src.filter((s) => !world.obstacles.some((o) => segmentHitsRect(self.x, self.y, s.x, s.y, o)));
}

export const brightness = (src, d) => src.strength / (1 + (d / P.FALLOFF) ** 2);

/**
 * Fotoselin gördüğü en parlak ışık: { I, bearing } ya da null.
 * bearing: kabuğun burnuna göre açı (rad). Işık görüşün dışındaysa null.
 */
export function observe(world, self, mode) {
  const dirRel = mode === "ara" ? self.scan : 0;
  const half = mode === "ara" ? P.SCAN_HALF : mode === "kac" ? Math.PI : P.LOCK_HALF;
  let best = null;
  for (const s of visibleSources(world, self)) {
    const dx = s.x - self.x, dy = s.y - self.y;
    const bearing = wrapAngle(Math.atan2(dy, dx) - self.heading);
    if (Math.abs(wrapAngle(bearing - dirRel)) > half) continue;
    const I = brightness(s, Math.hypot(dx, dy));
    if (!best || I > best.I) best = { I, bearing, hutch: !!s.hutch, mirror: !!s.mirror };
  }
  return best;
}

// ---- Hareket ------------------------------------------------------------

/**
 * Bir kaplumbağayı dt saniye ilerletir.
 * @param {TWorld} world
 * @param {Tortoise} t
 * @param {number} dt
 * @returns {Tortoise}
 */
export function stepTortoise(world, t, dt, recordTrail = true) {
  let { x, y, heading, mode, modeTime, scan, battery, hungry, lampOn, seen, speed } = t;
  modeTime += dt;
  const setMode = (m) => { if (m !== mode) { mode = m; modeTime = 0; } };

  // Pil ve açlık
  if (mode !== "sarj") battery = Math.max(0, battery - P.DRAIN * dt);
  if (battery < P.HUNGRY) hungry = true;
  const bright = hungry ? Infinity : P.BRIGHT; // açken en parlak ışık bile çekici

  // Kulübede şarj
  if (mode !== "sarj" && world.hutch && battery < P.DOCK_MAX_BATTERY &&
      Math.hypot(world.hutch.x - x, world.hutch.y - y) < P.DOCK_DIST) setMode("sarj");

  if (mode === "sarj") {
    battery = Math.min(1, battery + P.CHARGE * dt);
    speed = 0; lampOn = false; seen = 0;
    if (battery >= P.FULL) { hungry = false; setMode("ara"); }
  } else if (mode === "geri") {
    heading += t.turnSign * P.BACK_TURN * dt;
    speed = -P.BACK_SPEED; lampOn = false;
    if (modeTime >= P.BACK_TIME) setMode("ara");
  } else {
    const obs = observe(world, { ...t, x, y, heading, scan, lampOn }, mode);
    seen = obs ? obs.I : 0;
    if (mode === "ara") {
      lampOn = true;
      scan = (scan + P.SCAN_RATE * dt) % (2 * Math.PI);
      heading += t.turnSign * P.SEARCH_TURN * (1 + 0.6 * Math.sin(modeTime * 0.7 + t.id)) * dt;
      speed = P.SEARCH_SPEED;
      if (obs && obs.I >= P.LOW) { setMode(obs.I > bright ? "kac" : "yaklas"); scan = 0; lampOn = false; } // ışığa kilitlenince lamba söner
    } else if (mode === "yaklas") {
      lampOn = false;
      if (!obs || obs.I < P.LOW) setMode("ara");
      else if (obs.I > bright) setMode("kac");
      else {
        heading += clamp(3 * obs.bearing, -P.APPROACH_TURN, P.APPROACH_TURN) * dt;
        speed = P.APPROACH_SPEED;
      }
    } else if (mode === "kac") {
      lampOn = false;
      if (!obs || obs.I < P.LOW || obs.I < bright * 0.85) setMode("ara");
      else {
        heading -= (obs.bearing >= 0 ? 1 : -1) * P.FLEE_TURN * dt;
        speed = P.FLEE_SPEED;
      }
    }
  }
  heading = wrapAngle(heading);

  // Kabuk anahtarı: gitmek istediği yer bir şeye değiyorsa gitmez, geri çekilir
  const nx = x + Math.cos(heading) * speed * dt;
  const ny = y + Math.sin(heading) * speed * dt;
  if (speed !== 0 && touches(world, nx, ny)) {
    if (mode !== "geri") setMode("geri");
    speed = mode === "geri" ? speed : 0;
  } else { x = nx; y = ny; }

  const trail = recordTrail ? [...t.trail, { x, y }].slice(-220) : t.trail;
  return { ...t, x, y, heading, mode, modeTime, scan, battery, hungry, lampOn, seen, speed, trail };
}

/**
 * "Başa sar": kaplumbağalar başlangıç durumuna döner, kullanıcının eklediği lamba ve engeller kalır.
 * nextId geri alınmaz; alınsaydı başa sardıktan sonra eklenen lamba eski bir lambayla aynı id'yi alır
 * ve biri silinince ikisi birden silinirdi.
 * @param {TWorld} start    Deneyin ilk hali
 * @param {TWorld} current  Şu anki dünya
 * @returns {TWorld}
 */
export function rewindT(start, current) {
  return {
    ...start,
    lights: current.lights,
    obstacles: current.obstacles,
    nextId: Math.max(start.nextId, current.nextId),
  };
}

/** Dünyayı dt saniye ilerletir. */
export function tickT(world, dt) {
  const rec = Math.floor((world.time + dt) * 20) !== Math.floor(world.time * 20);
  return { ...world, time: world.time + dt, tortoises: world.tortoises.map((t) => stepTortoise(world, t, dt, rec)) };
}

// ---- Düz Türkçe açıklama ----------------------------------------------

export const MODE_INFO = {
  ara: { ad: "Işık arıyor", renk: "#9fb6c0" },
  yaklas: { ad: "Işığa gidiyor", renk: "#7fd18b" },
  kac: { ad: "Çok parlak, uzaklaşıyor", renk: "#f4b41a" },
  geri: { ad: "Çarptı, geri çekiliyor", renk: "#e5484d" },
  sarj: { ad: "Şarj oluyor", renk: "#6aa9f2" },
};

/** Kaplumbağanın şu anki durumunu, hiç bilgisi olmayan birine anlatır. */
export function acikla(t) {
  switch (t.mode) {
    case "ara":
      return t.hungry
        ? "Pili azaldı, acıkmış. Bu yüzden en parlak ışık bile ona çekici gelecek. Küçük bir daire çizerek yürüyor ve dönen gözüyle şarj kulübesinin lambasını arıyor."
        : "Hiçbir ışık görmüyor. Küçük bir daire çizerek yürüyor ve tepesindeki gözü (fotosel) sürekli dönüyor. Bir ışığın önünden geçerse göz kilitlenir. Gösterge lambası yanık, yani \"arıyorum\" diyor.";
    case "yaklas":
      return "Orta parlaklıkta bir ışık gördü. Gözü ışığa kilitlendi, gösterge lambası söndü ve ışığa doğru yürüyor. Yaklaştıkça ışık parlaşacak.";
    case "kac":
      return "Işık ona fazla parlak geldi ve ondan uzaklaşıyor. Biraz uzaklaşınca ışık yeniden \"orta\" olacak ve yine yaklaşacak. Bu yüzden lambanın çevresinde gidip gelir.";
    case "geri":
      return "Kabuğu bir şeye çarptı. Kabuk gövdeye gevşek bağlı olduğu için içeri itildi ve bir anahtarı çalıştırdı. Şimdi geri gidip dönüyor, sonra yeniden arayacak.";
    case "sarj":
      return "Şarj kulübesinde. Bağlantıları takıldı ve pili doluyor. Dolunca kulübenin parlak lambası ona fazla gelecek ve kulübeden uzaklaşacak.";
    default:
      return "";
  }
}

// ---- Hazır deney sahneleri ---------------------------------------------

export const EXPERIMENTS = [
  {
    id: "karanlik",
    ad: "Karanlık oda",
    soru: "Odada hiç ışık yokken kaplumbağa ne yapar?",
    izle: "Çizdiği izi ve tepesindeki gözün dönüşünü izle.",
    sonuc: "Rastgele değil, düzenli bir daire çizerek dolaşır. Işık arayan bir hayvan gibi görünür ama içinde yalnızca \"ışık yoksa dön ve yürü\" kuralı var. Duvara çarpınca geri çekilir.",
    build: () => addTortoise(emptyTWorld(), "Elsie", 450, 280, -0.6),
  },
  {
    id: "tek-lamba",
    ad: "Tek lamba",
    soru: "Kaplumbağa lambaya gidince içine girer mi?",
    izle: "Lambaya ne kadar yaklaştığına ve sonra ne yaptığına bak.",
    sonuc: "Lambaya yaklaşır ama içine girmez. Işık fazla parlaklaşınca uzaklaşır, biraz açılınca yine yaklaşır. Lambanın çevresinde gidip gelir. Walter bunu bir güvenin alevin çevresindeki uçuşuna benzetmişti.",
    build: () => addTortoise(addLamp(emptyTWorld(), 660, 280, 1), "Elsie", 260, 280, 0.2),
  },
  {
    id: "engel",
    ad: "Engelin arkasındaki lamba",
    soru: "Işık görünmüyorsa kaplumbağa ona nasıl ulaşır?",
    izle: "Çarpma anını ve ışığı yeniden bulma anını izle.",
    sonuc: "Plan yapmaz, harita çıkarmaz. Engele çarpar, geri çekilir, yön değiştirir ve gözü ışığı yeniden bulana kadar dolaşır. Çözümü planlamadan, tepkilerle bulur.",
    build: () => addTortoise(addObstacle(addLamp(emptyTWorld(), 760, 280, 1), 470, 280, 40, 90), "Elsie", 250, 260, 0.1),
  },
  {
    id: "kulube",
    ad: "Şarj kulübesi",
    soru: "Pili bitmek üzere olan kaplumbağa ne yapar?",
    izle: "Sağ üstteki pil çubuğuna ve \"gördüğü ışık\" çubuğuna bak. Pil azalınca ne değişiyor?",
    sonuc: "Aç değilken kulübenin parlak lambası ona fazla gelir ve uzak durur. Pili azalınca aynı lamba çekici olur. Kulübeye gider, şarj olur, dolunca lamba yine fazla parlak gelir ve kulübeden ayrılır. Hiçbir yerde \"pili kontrol et\" diye bir komut yoktur; yalnızca ışığa verilen tepki değişir.",
    build: () => {
      let w = addLamp(emptyTWorld(), 450, 120, 0.8);
      w = { ...w, hutch: { x: 780, y: 440 } };
      return addTortoise(w, "Elsie", 230, 330, 0.3, 0.32);
    },
  },
  {
    id: "ayna",
    ad: "Ayna testi",
    soru: "Kaplumbağa aynada kendini görünce ne yapar?",
    izle: "Gösterge lambasının yanıp sönüşüne ve aynanın önünde nasıl titrediğine bak.",
    sonuc: "Aynaya doğru yürür, titrer, geri çekilir, yine yaklaşır. Çünkü aynadaki şey kendi gösterge lambası: lamba yanarken yansımayı görür ve ona gider, kilitlenince lamba söner, yansıma kaybolur, yeniden arar ve lamba yanar. Walter bunun öz farkındalığa benzer bir izlenim verdiğini söylemişti. Gerçekte yalnızca iki kuralın birbirini tetiklemesi.",
    build: () => ({ ...addTortoise(emptyTWorld(), "Elsie", 730, 280, 0.05), mirror: { x: 880, y1: 140, y2: 420 } }),
  },
  {
    id: "iki",
    ad: "Elmer ve Elsie",
    soru: "İki kaplumbağa aynı odaya konunca ne olur?",
    izle: "İkisinin izlerine ve lambalarının hangi anlarda yandığına bak.",
    sonuc: "Birbirlerinin gösterge lambasını ışık sanıp yaklaşır, çok yaklaşınca uzaklaşır, tekrar yaklaşır. Dışarıdan bakınca bir tür dans ya da oyun gibi görünür. Walter buna \"sosyal davranış\" demişti. Ortada iki ayrı basit kural var, \"anlaşma\" yok.",
    build: () => addTortoise(addTortoise(emptyTWorld(), "Elmer", 280, 200, 0.4), "Elsie", 620, 360, Math.PI + 0.3),
  },
];
