// Kaplumbağa benzetiminin örnekleri (testleri). Çalıştırmak için: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyTWorld, addTortoise, addLamp, addObstacle, removeNearT, segmentHitsRect, touches,
  visibleSources, observe, stepTortoise, tickT, acikla, EXPERIMENTS, P, MODE_INFO,
} from "./tortoise.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function calistir(world, saniye, her = () => {}) {
  let w = world;
  for (let i = 0; i < saniye * 60; i++) { w = tickT(w, 1 / 60); her(w, i / 60); }
  return w;
}

test("segmentHitsRect: doğru parçası dikdörtgenin içinden geçiyorsa true", () => {
  const r = { x: 100, y: 100, w: 50, h: 50 };
  assert.equal(segmentHitsRect(0, 125, 300, 125, r), true);
  assert.equal(segmentHitsRect(0, 50, 300, 50, r), false);
  assert.equal(segmentHitsRect(0, 125, 90, 125, r), false); // dikdörtgene varmadan bitiyor
});

test("touches: duvara ve engele değen kabuk true", () => {
  const w = addObstacle(emptyTWorld(), 400, 280, 60, 60);
  assert.equal(touches(w, 450, 280), false);
  assert.equal(touches(w, 5, 280), true);          // sol duvar
  assert.equal(touches(w, 380, 280), true);        // engelin içi
  assert.equal(touches(w, 440, 280), true);        // engele 10 px: kabuk (14 px) değer
});

test("engelin arkasındaki lamba görülmez", () => {
  let w = addTortoise(addLamp(emptyTWorld(), 700, 280), "E", 100, 280);
  assert.equal(visibleSources(w, w.tortoises[0]).length, 1);
  w = addObstacle(w, 400, 280, 40, 100);
  assert.equal(visibleSources(w, w.tortoises[0]).length, 0);
});

test("ışık yokken kaplumbağa ara modunda daire çizerek ilerler ve ışık görmez", () => {
  const w0 = addTortoise(emptyTWorld(), "E", 450, 280);
  const w = calistir(w0, 5);
  assert.equal(w.tortoises[0].mode, "ara");
  assert.ok(dist(w.tortoises[0], w0.tortoises[0]) > 40);
  assert.equal(w.tortoises[0].seen, 0);
});

test("gösterge lambası aranırken yanar, ışığa kilitlenince söner", () => {
  const ara = stepTortoise(emptyTWorld(), addTortoise(emptyTWorld(), "E", 450, 280).tortoises[0], 1 / 60);
  assert.equal(ara.lampOn, true);
  const w = addLamp(addTortoise(emptyTWorld(), "E", 300, 280, 0), 450, 280, 1);
  let t = w.tortoises[0], kilit = false;
  for (let i = 0; i < 300 && !kilit; i++) { t = stepTortoise(w, t, 1 / 60); kilit = t.mode === "yaklas"; }
  assert.equal(kilit, true);
  assert.equal(t.lampOn, false);
});

test("orta parlaklıktaki lambaya yaklaşır ama içine girmez: çevresinde gidip gelir", () => {
  const w0 = addLamp(addTortoise(emptyTWorld(), "E", 260, 280, 0.2), 660, 280, 1);
  const mesafeler = [];
  calistir(w0, 70, (w, t) => { if (t > 25) mesafeler.push(dist(w.tortoises[0], { x: 660, y: 280 })); });
  assert.ok(Math.min(...mesafeler) > 40, "lambanın içine girmemeli");
  assert.ok(Math.min(...mesafeler) < 150, "lambaya yeterince yaklaşmalı");
  assert.ok(Math.max(...mesafeler) > 120, "ama sürekli aynı yerde durmamalı");
});

test("tok kaplumbağa çok parlak ışıktan uzaklaşır", () => {
  const w0 = addLamp(addTortoise(emptyTWorld(), "E", 300, 280, 0), 340, 280, 3);
  const w = calistir(w0, 6);
  assert.ok(dist(w.tortoises[0], { x: 340, y: 280 }) > 40);
  assert.ok(["kac", "ara", "yaklas"].includes(w.tortoises[0].mode));
});

test("engele çarpan kaplumbağa geri çekilir ve engelin içine girmez", () => {
  // Burnu engele dönük: ara modunda ileri yürüyüp engele değer
  let w = addObstacle(addTortoise(emptyTWorld(), "E", 330, 280, 0), 400, 280, 40, 400);
  let geri = false, icerde = false;
  w = calistir(w, 30, (x) => { const t = x.tortoises[0]; if (t.mode === "geri") geri = true; if (touches(x, t.x, t.y)) icerde = true; });
  assert.equal(geri, true);
  assert.equal(icerde, false);
});

test("pil zamanla boşalır ve 0'ın altına inmez", () => {
  const w = calistir(addTortoise(emptyTWorld(), "E", 450, 280), 200);
  assert.ok(w.tortoises[0].battery < 0.1);
  assert.ok(w.tortoises[0].battery >= 0);
  assert.equal(w.tortoises[0].hungry, true);
});

test("aç kaplumbağa kulübeye gider, şarj olur, dolunca kulübeden ayrılır", () => {
  const w0 = { ...addTortoise(emptyTWorld(), "E", 230, 330, 0.3, 0.32), hutch: { x: 780, y: 440 } };
  let sarj = false, pilArtti = false, sonSarj = -1, once = 0;
  const w = calistir(w0, 120, (x, t) => {
    const k = x.tortoises[0];
    if (k.mode === "sarj") { if (!sarj) once = k.battery; sarj = true; sonSarj = t; if (k.battery > once + 0.2) pilArtti = true; }
  });
  assert.equal(sarj, true, "kulübeye varmalı");
  assert.equal(pilArtti, true, "pil dolmalı");
  assert.ok(sonSarj < 119 && w.tortoises[0].mode !== "sarj" || w.tortoises[0].battery > 0.5);
});

test("tok kaplumbağa kulübenin parlak lambasına çekilmez, aç olan çekilir", () => {
  const hutch = { x: 500, y: 280 };
  const tok = { ...addTortoise(emptyTWorld(), "E", 400, 280, 0, 1), hutch };
  const ac = { ...addTortoise(emptyTWorld(), "E", 400, 280, 0, 0.2), hutch };
  const a = observe(tok, tok.tortoises[0], "yaklas"), b = observe(ac, ac.tortoises[0], "yaklas");
  assert.ok(a.I > P.BRIGHT);                               // tok için fazla parlak
  const t1 = stepTortoise(tok, { ...tok.tortoises[0], mode: "yaklas" }, 1 / 60);
  const t2 = stepTortoise(ac, { ...ac.tortoises[0], mode: "yaklas", hungry: true }, 1 / 60);
  assert.equal(t1.mode, "kac");
  assert.equal(t2.mode, "yaklas");
  assert.ok(b.I > P.BRIGHT);
});

test("ayna: kendi lambasının yansımasını görür, lamba söndüğünde yansıma kaybolur", () => {
  const w = { ...addTortoise(emptyTWorld(), "E", 780, 280, 0), mirror: { x: 880, y1: 140, y2: 420 } };
  const t = w.tortoises[0];
  assert.ok(visibleSources(w, t).some((s) => s.mirror));
  assert.ok(!visibleSources(w, { ...t, lampOn: false }).some((s) => s.mirror));
  assert.ok(!visibleSources(w, { ...t, y: 50 }).some((s) => s.mirror)); // aynanın dışından görünmez
});

test("iki kaplumbağa birbirinin lambasını görür", () => {
  const w = addTortoise(addTortoise(emptyTWorld(), "A", 300, 280, 0), "B", 500, 280, Math.PI);
  assert.equal(visibleSources(w, w.tortoises[0]).length, 1);
  const kapali = { ...w, tortoises: [w.tortoises[0], { ...w.tortoises[1], lampOn: false }] };
  assert.equal(visibleSources(kapali, kapali.tortoises[0]).length, 0);
});

test("removeNearT: yakındaki lambayı ya da engeli siler, uzaktaysa dokunmaz", () => {
  let w = addObstacle(addLamp(emptyTWorld(), 100, 100), 400, 300);
  assert.equal(removeNearT(w, 105, 100).lights.length, 0);
  assert.equal(removeNearT(w, 400, 300).obstacles.length, 0);
  assert.equal(removeNearT(w, 700, 500), w);
});

test("tickT girdiyi değiştirmez ve zamanı ilerletir", () => {
  const w = addTortoise(emptyTWorld(), "E", 450, 280);
  const kopya = JSON.stringify(w);
  const y = tickT(w, 1 / 60);
  assert.equal(JSON.stringify(w), kopya);
  assert.ok(y.time > w.time);
});

test("her hazır deney kurulur, çalışır ve kaplumbağalar odanın içinde kalır", () => {
  for (const e of EXPERIMENTS) {
    const w = calistir(e.build(), 20);
    assert.ok(w.tortoises.length >= 1, e.id);
    for (const t of w.tortoises) {
      assert.ok(Number.isFinite(t.x) && Number.isFinite(t.y), e.id);
      assert.ok(t.x > 0 && t.x < w.width && t.y > 0 && t.y < w.height, e.id);
    }
    assert.ok(e.soru && e.izle && e.sonuc);
  }
});

test("acikla: her mod için düz Türkçe bir cümle verir", () => {
  const t = addTortoise(emptyTWorld(), "E", 1, 1).tortoises[0];
  for (const mode of Object.keys(MODE_INFO)) {
    assert.ok(acikla({ ...t, mode }).length > 30, mode);
  }
  assert.ok(acikla({ ...t, mode: "ara", hungry: true }).includes("acıkmış"));
});
