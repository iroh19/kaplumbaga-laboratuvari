// Kaplumbağa Laboratuvarı: simülasyon çekirdeği
//
// Bu dosya "Systematic Program Design" (How to Design Programs) kursundaki
// tasarım tarifiyle yazıldı:
//   1. Veri tanımları  (aşağıdaki @typedef blokları)
//   2. İmza + amaç     (her fonksiyonun üstündeki yorum)
//   3. Örnekler        (world.test.js içindeki testler)
//   4. Gövde
//
// Tüm fonksiyonlar SAF: girdiyi değiştirmez, yeni bir değer döndürür.
// Arayüz, SPD'deki big-bang "world program" gibi çalışır:
//   onTick  → tick(world, dt)
//   toDraw  → drawWorld(ctx, world)      (components/WorldCanvas.jsx)
//   onMouse → handleClick(world, x, y, tool, type)

import { specOf } from "./vehicles.js";

/**
 * @typedef {Object} Light      Bir ışık kaynağı.
 * @property {number} id
 * @property {number} x
 * @property {number} y
 * @property {number} strength  1 = normal parlaklık
 *
 * @typedef {Object} Vehicle    Bir Braitenberg aracı.
 * @property {number} id
 * @property {import("./vehicles.js").VehicleType} type
 * @property {number} x
 * @property {number} y
 * @property {number} heading   Radyan; 0 = doğu, ekran koordinatlarında (y aşağı) saat yönünde artar
 * @property {number} speed     Son adımdaki ortalama hız (piksel/sn), çizim için
 * @property {{x:number, y:number}[]} trail  Son konumlar
 *
 * @typedef {Object} World
 * @property {number} width
 * @property {number} height
 * @property {Light[]} lights
 * @property {Vehicle[]} vehicles
 * @property {number} time      Geçen simülasyon süresi (sn)
 * @property {number} nextId
 *
 * @typedef {Object} Scene      Kaydedilen / paylaşılan sahne (yalnızca başlangıç durumu)
 * @property {{x:number, y:number, strength:number}[]} lights
 * @property {{type:string, x:number, y:number, heading:number}[]} vehicles
 */

// ---- Sabitler -----------------------------------------------------------

export const WORLD_WIDTH = 900;
export const WORLD_HEIGHT = 560;

export const SENSOR_ANGLE = Math.PI / 4; // sensörler burnun 45° sağında ve solunda
export const SENSOR_DISTANCE = 12;        // sensörlerin araç merkezine uzaklığı (px)
export const WHEEL_BASE = 20;             // iki tekerlek arası (px)
export const FALLOFF = 120;               // ışığın etkisinin yarıya indiği yaklaşık mesafe (px)
export const GAIN = 130;                  // uyarıcı bağlantının kazancı (px/sn)
export const INHIBIT_GAIN = 210;          // baskılayıcı bağlantının kazancı: ışık tam karşıdayken aracı durdurabilecek kadar güçlü
export const BASE_SPEED = 14;             // uyarıcı araçların karanlıktaki sürünme hızı
export const MAX_SPEED = 95;              // baskılayıcı araçların karanlıktaki hızı
export const SPEED_LIMIT = 220;
export const TRAIL_LENGTH = 160;
export const MOTOR_MISMATCH = 0.015;     // gerçek motorlar asla birebir aynı değildir: araçtan araca ±%1,5 fark

// ---- Oluşturucular ------------------------------------------------------

/**
 * Boş bir dünya oluşturur.
 * @returns {World}
 */
export function emptyWorld(width = WORLD_WIDTH, height = WORLD_HEIGHT) {
  return { width, height, lights: [], vehicles: [], time: 0, nextId: 1 };
}

/**
 * Dünyaya (x, y) konumunda bir ışık ekler.
 * @param {World} world
 * @returns {World}
 */
export function addLight(world, x, y, strength = 1) {
  const light = { id: world.nextId, x, y, strength };
  return { ...world, lights: [...world.lights, light], nextId: world.nextId + 1 };
}

/**
 * Dünyaya (x, y) konumunda, verilen yöne bakan bir araç ekler.
 * @param {World} world
 * @param {import("./vehicles.js").VehicleType} type
 * @returns {World}
 */
export function addVehicle(world, type, x, y, heading = 0) {
  specOf(type); // bilinmeyen tipte hata ver
  const vehicle = { id: world.nextId, type, x, y, heading, speed: 0, trail: [] };
  return { ...world, vehicles: [...world.vehicles, vehicle], nextId: world.nextId + 1 };
}

/**
 * (x, y) noktasına `radius` içindeki en yakın ışığı ya da aracı siler.
 * Yakında bir şey yoksa dünyayı olduğu gibi döndürür.
 * @param {World} world
 * @returns {World}
 */
export function removeNear(world, x, y, radius = 26) {
  const candidates = [
    ...world.lights.map((o) => ({ kind: "light", o })),
    ...world.vehicles.map((o) => ({ kind: "vehicle", o })),
  ]
    .map((c) => ({ ...c, d: Math.hypot(c.o.x - x, c.o.y - y) }))
    .filter((c) => c.d <= radius)
    .sort((a, b) => a.d - b.d);

  if (candidates.length === 0) return world;
  const { kind, o } = candidates[0];
  return kind === "light"
    ? { ...world, lights: world.lights.filter((l) => l.id !== o.id) }
    : { ...world, vehicles: world.vehicles.filter((v) => v.id !== o.id) };
}

// ---- Algılama -----------------------------------------------------------

/**
 * Bir sensörün konumu.
 * @param {Vehicle} v
 * @param {"sol" | "sag"} side
 * @returns {{x:number, y:number, dir:number}}  dir = sensörün baktığı yön
 */
export function sensorPose(v, side) {
  // Ekranda y aşağı doğru arttığı için "sol" = heading - 45°
  const dir = v.heading + (side === "sol" ? -SENSOR_ANGLE : SENSOR_ANGLE);
  return {
    x: v.x + Math.cos(dir) * SENSOR_DISTANCE,
    y: v.y + Math.sin(dir) * SENSOR_DISTANCE,
    dir,
  };
}

/**
 * Bir sensörün tüm ışıklardan aldığı toplam uyarım (0 ve üzeri).
 * Işık ne kadar yakın ve sensörün baktığı yöne ne kadar dönükse uyarım o kadar büyük.
 * @param {{x:number, y:number, dir:number}} sensor
 * @param {Light[]} lights
 * @returns {number}
 */
export function sense(sensor, lights) {
  return lights.reduce((total, light) => {
    const dx = light.x - sensor.x;
    const dy = light.y - sensor.y;
    const d = Math.hypot(dx, dy);
    const facing = d === 0 ? 1 : Math.max(0, Math.cos(Math.atan2(dy, dx) - sensor.dir));
    const falloff = 1 / (1 + (d / FALLOFF) ** 2);
    return total + light.strength * facing * falloff;
  }, 0);
}

/**
 * Aracın iki sensör okuması.
 * @param {Vehicle} v
 * @param {Light[]} lights
 * @returns {{sol:number, sag:number}}
 */
export function readSensors(v, lights) {
  return { sol: sense(sensorPose(v, "sol"), lights), sag: sense(sensorPose(v, "sag"), lights) };
}

// ---- Karar: sensör → motor ---------------------------------------------

/**
 * Sensör okumalarından iki tekerleğin hızını hesaplar. Aracın "beyni" bu kadar.
 * @param {import("./vehicles.js").VehicleType} type
 * @param {{sol:number, sag:number}} s
 * @returns {{sol:number, sag:number}}  tekerlek hızları (px/sn)
 */
export function motors(type, s) {
  const { baglanti, etki } = specOf(type);
  // Hangi sensör hangi motoru sürüyor?
  const solMotoraGiden = baglanti === "duz" ? s.sol : s.sag;
  const sagMotoraGiden = baglanti === "duz" ? s.sag : s.sol;

  const drive = (input) =>
    etki === "uyarici" ? BASE_SPEED + GAIN * input : MAX_SPEED - INHIBIT_GAIN * input;

  const clamp = (v) => Math.min(SPEED_LIMIT, Math.max(0, v));
  return { sol: clamp(drive(solMotoraGiden)), sag: clamp(drive(sagMotoraGiden)) };
}

// ---- Hareket ------------------------------------------------------------

/**
 * Aracı odanın duvarlarından sektirir: duvara çarpan araç ayna gibi yansır ve odanın içinde kalır.
 * @returns {{x:number, y:number, heading:number}}
 */
export function bounce(x, y, heading, bounds, margin = 10) {
  let h = heading;
  let nx = x;
  let ny = y;
  if (nx < margin || nx > bounds.width - margin) {
    h = Math.PI - h;
    nx = Math.min(bounds.width - margin, Math.max(margin, nx));
  }
  if (ny < margin || ny > bounds.height - margin) {
    h = -h;
    ny = Math.min(bounds.height - margin, Math.max(margin, ny));
  }
  return { x: nx, y: ny, heading: h };
}

/**
 * Aracı dt saniye ilerletir (diferansiyel sürüş).
 * @param {Vehicle} v
 * @param {Light[]} lights
 * @param {number} dt
 * @param {{width:number, height:number}} bounds  Odanın boyutu; araç duvarlardan seker
 * @param {boolean} recordTrail
 * @returns {Vehicle}
 */
export function stepVehicle(v, lights, dt, bounds, recordTrail = true) {
  const ideal = motors(v.type, readSensors(v, lights));
  // Tekerlekler arasındaki küçük, sabit fark tam simetrik durumlarda takılıp kalmayı önler
  const bias = v.id % 2 === 0 ? MOTOR_MISMATCH : -MOTOR_MISMATCH;
  const wheels = { sol: ideal.sol * (1 + bias), sag: ideal.sag * (1 - bias) };
  const speed = (wheels.sol + wheels.sag) / 2;
  // Sol tekerlek daha hızlıysa araç sağa (saat yönüne) döner → heading artar
  const turn = (wheels.sol - wheels.sag) / WHEEL_BASE;
  const yon = v.heading + turn * dt;
  const { x, y, heading } = bounce(
    v.x + Math.cos(yon) * speed * dt,
    v.y + Math.sin(yon) * speed * dt,
    yon,
    bounds,
  );
  const trail = recordTrail ? [...v.trail, { x, y }].slice(-TRAIL_LENGTH) : v.trail;

  return { ...v, x, y, heading, speed, trail };
}

/**
 * Dünyayı dt saniye ilerletir. (SPD: on-tick)
 * @param {World} world
 * @param {number} dt
 * @returns {World}
 */
export function tick(world, dt) {
  // İzi her adımda değil, yaklaşık 1/20 saniyede bir kaydet
  const recordTrail = Math.floor((world.time + dt) * 20) !== Math.floor(world.time * 20);
  return {
    ...world,
    time: world.time + dt,
    vehicles: world.vehicles.map((v) => stepVehicle(v, world.lights, dt, world, recordTrail)),
  };
}

/**
 * Fare tıklamasını dünyaya uygular. (SPD: on-mouse)
 * @param {World} world
 * @param {"isik" | "arac" | "sil"} tool
 * @param {import("./vehicles.js").VehicleType} type  "arac" aracı için hangi tip
 * @returns {World}
 */
export function handleClick(world, x, y, tool, type) {
  if (tool === "isik") return addLight(world, x, y);
  if (tool === "sil") return removeNear(world, x, y);
  // Yeni araçlar, id'ye göre değişen ama tekrarlanabilir bir yöne baksın
  const heading = ((world.nextId * 137.5) % 360) * (Math.PI / 180);
  return addVehicle(world, type, x, y, heading);
}

// ---- Sahne (kaydetme / paylaşma) ---------------------------------------

/**
 * Dünyanın başlangıç durumunu sade bir sahneye çevirir (iz, hız ve zaman atılır).
 * @param {World} world
 * @returns {Scene}
 */
export function toScene(world) {
  const r = (n) => Math.round(n * 10) / 10;
  return {
    lights: world.lights.map((l) => ({ x: r(l.x), y: r(l.y), strength: l.strength })),
    vehicles: world.vehicles.map((v) => ({
      type: v.type,
      x: r(v.x),
      y: r(v.y),
      heading: Math.round(v.heading * 1000) / 1000,
    })),
  };
}

/**
 * Sahneden yeni bir dünya kurar. Hatalı girdileri atlar.
 * @param {Scene} scene
 * @returns {World}
 */
export function fromScene(scene) {
  let world = emptyWorld();
  for (const l of scene?.lights ?? []) {
    if (Number.isFinite(l.x) && Number.isFinite(l.y)) {
      world = addLight(world, l.x, l.y, Number.isFinite(l.strength) ? l.strength : 1);
    }
  }
  for (const v of scene?.vehicles ?? []) {
    try {
      if (Number.isFinite(v.x) && Number.isFinite(v.y)) {
        world = addVehicle(world, v.type, v.x, v.y, Number.isFinite(v.heading) ? v.heading : 0);
      }
    } catch {
      // bilinmeyen araç tipi: atla
    }
  }
  return world;
}
