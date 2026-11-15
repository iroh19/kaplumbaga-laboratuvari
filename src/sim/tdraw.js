// Kaplumbağa odasını canvas'a çizer. Yalnızca çizer, dünyayı değiştirmez.
import { MODE_INFO, P } from "./tortoise.js";

const RENK = ["#e8b04a", "#6aa9f2", "#7fd18b"]; // kaplumbağaların kabuk renkleri

export function drawTWorld(ctx, world, { showTrails = true, watchedId = null } = {}) {
  const { width, height } = world;
  ctx.fillStyle = "#0a1a26";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(190,225,235,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 40) seg(ctx, x, 0, x, height);
  for (let y = 0; y <= height; y += 40) seg(ctx, 0, y, width, y);

  // Işıklar ve kulübenin lambası
  const isiklar = world.lights.map((l) => ({ x: l.x, y: l.y, s: l.strength }));
  if (world.hutch) isiklar.push({ x: world.hutch.x, y: world.hutch.y, s: P.HUTCH_STRENGTH });
  for (const l of isiklar) {
    const r = 105 * Math.min(l.s, 1.6) + 20;
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
    g.addColorStop(0, "rgba(255, 214, 102, 0.55)");
    g.addColorStop(0.35, "rgba(255, 196, 61, 0.16)");
    g.addColorStop(1, "rgba(255, 196, 61, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(l.x, l.y, r, 0, Math.PI * 2); ctx.fill();
  }

  // Kulübe
  if (world.hutch) {
    const { x, y } = world.hutch;
    ctx.fillStyle = "rgba(106,169,242,0.12)";
    ctx.strokeStyle = "#6aa9f2";
    ctx.lineWidth = 2;
    rrect(ctx, x - 46, y - 34, 92, 68, 12, true, true);
    label(ctx, "şarj kulübesi", x, y + 52, "#9cc6f5");
  }

  // Ayna
  if (world.mirror) {
    const m = world.mirror;
    const g = ctx.createLinearGradient(m.x - 6, 0, m.x + 12, 0);
    g.addColorStop(0, "rgba(190,235,255,0.9)");
    g.addColorStop(1, "rgba(120,180,210,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(m.x - 4, m.y1, 8, m.y2 - m.y1);
    label(ctx, "ayna", m.x - 24, m.y1 - 8, "#bfe6f7");
  }

  // Engeller
  for (const o of world.obstacles) {
    ctx.fillStyle = "#2a4658";
    ctx.strokeStyle = "#5d8197";
    ctx.lineWidth = 1.5;
    rrect(ctx, o.x, o.y, o.w, o.h, 6, true, true);
  }

  // İzler
  if (showTrails) {
    world.tortoises.forEach((t, i) => {
      if (t.trail.length < 2) return;
      ctx.strokeStyle = rgba(RENK[i % RENK.length], 0.55);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      t.trail.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    });
  }

  // Lamba çekirdekleri
  for (const l of world.lights) {
    ctx.fillStyle = "#fff4c9";
    ctx.strokeStyle = "#ffc43d";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(l.x, l.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (world.hutch) {
    ctx.fillStyle = "#fff4c9";
    ctx.beginPath(); ctx.arc(world.hutch.x, world.hutch.y, 8, 0, Math.PI * 2); ctx.fill();
  }

  // Kaplumbağalar
  world.tortoises.forEach((t, i) => drawTortoise(ctx, t, RENK[i % RENK.length], t.id === watchedId && world.tortoises.length > 1));
}

function drawTortoise(ctx, t, renk, izlenen) {
  const info = MODE_INFO[t.mode];
  // Durum halkası
  ctx.strokeStyle = info.renk;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(t.x, t.y, 22, 0, Math.PI * 2); ctx.stroke();
  if (izlenen) {
    ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(t.x, t.y, 29, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }

  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.heading);

  // Gözün baktığı yön (dönen fotosel)
  const goz = t.mode === "ara" ? t.scan : 0;
  const yari = t.mode === "ara" ? P.SCAN_HALF : P.LOCK_HALF;
  if (t.mode === "ara" || t.mode === "yaklas") {
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 60, goz - yari, goz + yari); ctx.closePath(); ctx.fill();
  }

  // Tekerlekler
  ctx.fillStyle = "#03101a";
  rrect(ctx, -12, -17, 12, 5, 2, true, false);
  rrect(ctx, -12, 12, 12, 5, 2, true, false);
  rrect(ctx, 8, -2.5, 8, 5, 2, true, false);

  // Kabuk
  ctx.fillStyle = renk;
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(-1, 0, 15, 12.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-9, 8); ctx.moveTo(-1, -12); ctx.lineTo(-1, 12); ctx.moveTo(7, -8); ctx.lineTo(7, 8); ctx.stroke();

  // Dönen göz (fotosel)
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(Math.cos(goz) * 6, Math.sin(goz) * 6, 3, 0, Math.PI * 2); ctx.fill();

  // Gösterge lambası
  if (t.lampOn) {
    ctx.fillStyle = "rgba(120,255,160,0.28)";
    ctx.beginPath(); ctx.arc(14, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7dffa6";
    ctx.beginPath(); ctx.arc(14, 0, 3.2, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = "#2c4a3c";
    ctx.beginPath(); ctx.arc(14, 0, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  label(ctx, t.name, t.x, t.y - 32, "#e6f0f3");
}

function label(ctx, text, x, y, color) {
  ctx.font = "600 12px 'IBM Plex Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
function seg(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function rrect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; }
