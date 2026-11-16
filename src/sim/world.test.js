// SPD tasarım tarifinin "örnekler" adımı: her fonksiyonun beklenen davranışı.
// Çalıştırmak için: npm test   (Node'un yerleşik test aracı, ek paket gerekmez)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyWorld, addLight, addVehicle, removeNear, sense, sensorPose, readSensors,
  motors, bounce, stepVehicle, tick, handleClick, toScene, fromScene,
} from "./world.js";

const BIG = { width: 100000, height: 100000 };
const doguyaBakan = (x, y, type = "korku") => ({ id: 1, type, x, y, heading: 0, speed: 0, trail: [] });
const mesafe = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Aracı tek bir ışığın yanında `saniye` boyunca sürer, her adımı döndürür. */
function sur(type, light, saniye, baslangic = doguyaBakan(5000, 5000, type)) {
  let v = { ...baslangic, type };
  const yol = [v];
  for (let t = 0; t < saniye; t += 1 / 60) {
    v = stepVehicle(v, [light], 1 / 60, BIG, false);
    yol.push(v);
  }
  return yol;
}

// ---- sense --------------------------------------------------------------

test("ışık yoksa sensör 0 okur", () => {
  assert.equal(sense({ x: 0, y: 0, dir: 0 }, []), 0);
});

test("ışığa bakan sensör, arkasını dönen sensörden çok okur", () => {
  const light = { id: 1, x: 100, y: 0, strength: 1 };
  const bakan = sense({ x: 0, y: 0, dir: 0 }, [light]);
  const arkasiDonuk = sense({ x: 0, y: 0, dir: Math.PI }, [light]);
  assert.ok(bakan > 0.3);
  assert.equal(arkasiDonuk, 0);
});

test("yakın ışık uzak ışıktan güçlü okunur", () => {
  const s = { x: 0, y: 0, dir: 0 };
  assert.ok(sense(s, [{ x: 50, y: 0, strength: 1 }]) > sense(s, [{ x: 400, y: 0, strength: 1 }]));
});

// ---- sensorPose / readSensors -------------------------------------------

test("doğuya bakan aracın sol sensörü ekranda yukarıda (y daha küçük)", () => {
  const v = doguyaBakan(100, 100);
  assert.ok(sensorPose(v, "sol").y < v.y);
  assert.ok(sensorPose(v, "sag").y > v.y);
});

test("ışık sol öndeyse sol sensör daha çok okur", () => {
  const v = doguyaBakan(100, 100);
  const s = readSensors(v, [{ x: 160, y: 50, strength: 1 }]);
  assert.ok(s.sol > s.sag);
});

// ---- motors -------------------------------------------------------------

const solaGucluSinyal = { sol: 0.8, sag: 0.2 };

test("Korku (düz, uyarıcı): sol sinyal sol tekerleği hızlandırır", () => {
  const m = motors("korku", solaGucluSinyal);
  assert.ok(m.sol > m.sag);
});

test("Saldırganlık (çapraz, uyarıcı): sol sinyal sağ tekerleği hızlandırır", () => {
  const m = motors("saldirganlik", solaGucluSinyal);
  assert.ok(m.sag > m.sol);
});

test("Sevgi (düz, baskılayıcı): sol sinyal sol tekerleği yavaşlatır", () => {
  const m = motors("sevgi", solaGucluSinyal);
  assert.ok(m.sol < m.sag);
});

test("Kâşif (çapraz, baskılayıcı): sol sinyal sağ tekerleği yavaşlatır", () => {
  const m = motors("kasif", solaGucluSinyal);
  assert.ok(m.sag < m.sol);
});

test("tekerlek hızı asla negatif olmaz", () => {
  const m = motors("sevgi", { sol: 50, sag: 50 });
  assert.equal(m.sol, 0);
  assert.equal(m.sag, 0);
});

// ---- davranış: birkaç saniyelik sürüş ----------------------------------

const solOndeIsik = { id: 9, x: 5150, y: 4900, strength: 1 };

test("Korku ışıktan uzaklaşır", () => {
  const yol = sur("korku", solOndeIsik, 6);
  assert.ok(mesafe(yol.at(-1), solOndeIsik) > mesafe(yol[0], solOndeIsik));
});

test("Saldırganlık ışığa çarpacak kadar yaklaşır", () => {
  const yol = sur("saldirganlik", solOndeIsik, 6);
  const enYakin = Math.min(...yol.map((v) => mesafe(v, solOndeIsik)));
  assert.ok(enYakin < 25, `en yakın mesafe ${enYakin.toFixed(1)}`);
});

test("Sevgi ışığın yanına gelir ve orada yavaşlar", () => {
  const yol = sur("sevgi", solOndeIsik, 20);
  const son = yol.at(-1);
  assert.ok(mesafe(son, solOndeIsik) < 120, `son mesafe ${mesafe(son, solOndeIsik).toFixed(1)}`);
  assert.ok(son.speed < 40, `son hız ${son.speed.toFixed(1)}`);
});

test("Kâşif ışığın yanında durmaz, yoluna devam eder", () => {
  const yol = sur("kasif", solOndeIsik, 20);
  assert.ok(yol.at(-1).speed > 40);
});

// ---- duvarlar / iz / tick -------------------------------------------

test("bounce: odanın içindeki araca dokunmaz", () => {
  assert.deepEqual(bounce(300, 200, 0.5, { width: 900, height: 560 }), { x: 300, y: 200, heading: 0.5 });
});

test("bounce: sağ duvara çarpan araç geri döner, içeride kalır", () => {
  const b = bounce(905, 200, 0, { width: 900, height: 560 });
  assert.ok(b.x <= 890);
  assert.ok(Math.cos(b.heading) < 0);
});

test("bounce: alt duvara çarpan araç yukarı döner", () => {
  const b = bounce(300, 600, Math.PI / 2, { width: 900, height: 560 });
  assert.ok(b.y <= 550);
  assert.ok(Math.sin(b.heading) < 0);
});

test("araç ilerledikçe izi uzar ve odadan çıkmaz", () => {
  let w = addVehicle(emptyWorld(), "kasif", 100, 100, 0);
  for (let i = 0; i < 600; i++) w = tick(w, 1 / 60);
  const v = w.vehicles[0];
  assert.ok(v.trail.length > 100, `iz uzunluğu ${v.trail.length}`);
  assert.ok(v.trail.every((p) => p.x >= 0 && p.x <= 900 && p.y >= 0 && p.y <= 560));
});

test("tick girdiyi değiştirmez ve zamanı ilerletir", () => {
  const w0 = addVehicle(addLight(emptyWorld(), 300, 300), "sevgi", 100, 100);
  const kopya = JSON.stringify(w0);
  const w1 = tick(w0, 0.1);
  assert.equal(JSON.stringify(w0), kopya);
  assert.ok(Math.abs(w1.time - 0.1) < 1e-9);
  assert.notDeepEqual(w1.vehicles[0], w0.vehicles[0]);
});

// ---- handleClick / removeNear ------------------------------------------

test("ışık aracı tıklanan yere ışık koyar", () => {
  const w = handleClick(emptyWorld(), 10, 20, "isik", "korku");
  assert.deepEqual([w.lights[0].x, w.lights[0].y], [10, 20]);
});

test("araç aracı seçili tipte araç ekler", () => {
  const w = handleClick(emptyWorld(), 10, 20, "arac", "kasif");
  assert.equal(w.vehicles[0].type, "kasif");
});

test("sil aracı yalnızca en yakın nesneyi siler, uzaktaysa hiçbir şeyi silmez", () => {
  let w = addLight(addLight(emptyWorld(), 100, 100), 120, 100);
  w = removeNear(w, 118, 100);
  assert.deepEqual(w.lights.map((l) => l.x), [100]);
  assert.equal(removeNear(w, 500, 500), w);
});

// ---- sahne --------------------------------------------------------------

test("sahne → dünya → sahne aynı kalır", () => {
  const w = addVehicle(addLight(emptyWorld(), 300, 200, 1.5), "saldirganlik", 50, 60, 1.234);
  assert.deepEqual(toScene(fromScene(toScene(w))), toScene(w));
});

test("fromScene bilinmeyen tipleri ve bozuk satırları atlar", () => {
  const w = fromScene({
    lights: [{ x: 1, y: 2 }, { x: "a", y: 2 }],
    vehicles: [{ type: "ejderha", x: 1, y: 1 }, { type: "sevgi", x: 5, y: 5 }],
  });
  assert.equal(w.lights.length, 1);
  assert.deepEqual(w.vehicles.map((v) => v.type), ["sevgi"]);
});

test("fromScene boş ya da eksik girdide boş dünya döndürür", () => {
  assert.equal(fromScene(null).vehicles.length, 0);
  assert.equal(fromScene({}).lights.length, 0);
});

test("fromScene bozuk bir paylaşım bağlantısında hata vermez", () => {
  // Bağlantıdaki sahne herhangi bir JSON olabilir: dizi yerine sayı, satır yerine null
  assert.equal(fromScene(5).lights.length, 0);
  assert.equal(fromScene({ lights: 7, vehicles: "x" }).vehicles.length, 0);
  const w = fromScene({ lights: [null, { x: 1, y: 2 }], vehicles: [null, 3, { type: "korku", x: 4, y: 4 }] });
  assert.equal(w.lights.length, 1);
  assert.equal(w.vehicles.length, 1);
});
