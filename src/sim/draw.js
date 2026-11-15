// Dünyayı canvas'a çizer. (SPD: to-draw)
// Çekirdekteki fonksiyonlardan farklı olarak bu dosya yan etkili: yalnızca çizer, dünyayı değiştirmez.

import { specOf } from "./vehicles.js";
import { sensorPose } from "./world.js";

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import("./world.js").World} world
 * @param {{showTrails:boolean, showSensors:boolean}} options
 */
export function drawWorld(ctx, world, { showTrails = true, showSensors = true, watchedId = null } = {}) {
  const { width, height } = world;

  // Zemin ve ızgara
  ctx.fillStyle = "#0d2230";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(190,225,235,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 40) line(ctx, x, 0, x, height);
  for (let y = 0; y <= height; y += 40) line(ctx, 0, y, width, y);

  // Işıkların parıltısı
  for (const light of world.lights) {
    const r = 110 * light.strength;
    const g = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, r);
    g.addColorStop(0, "rgba(255, 214, 102, 0.55)");
    g.addColorStop(0.35, "rgba(255, 196, 61, 0.18)");
    g.addColorStop(1, "rgba(255, 196, 61, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(light.x, light.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // İzler
  if (showTrails) {
    for (const v of world.vehicles) {
      if (v.trail.length < 2) continue;
      ctx.strokeStyle = hexToRgba(specOf(v.type).renk, 0.7);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      v.trail.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
  }

  // Işık çekirdekleri
  for (const light of world.lights) {
    ctx.fillStyle = "#fff4c9";
    ctx.beginPath();
    ctx.arc(light.x, light.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffc43d";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Araçlar
  for (const v of world.vehicles) {
    if (v.id === watchedId) {
      // İzlenen aracın çevresine halka
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(v.x, v.y, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawVehicle(ctx, v, showSensors);
  }
}

function drawVehicle(ctx, v, showSensors) {
  const { renk } = specOf(v.type);
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.heading);

  // Tekerlekler
  ctx.fillStyle = "#04121b";
  roundRect(ctx, -9, -13, 14, 5, 2);
  roundRect(ctx, -9, 8, 14, 5, 2);

  // Gövde
  ctx.fillStyle = renk;
  roundRect(ctx, -12, -9, 22, 18, 5);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Burun
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.moveTo(10, -4);
  ctx.lineTo(15, 0);
  ctx.lineTo(10, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Sensörler (dünya koordinatlarında)
  if (showSensors) {
    for (const side of ["sol", "sag"]) {
      const s = sensorPose(v, side);
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
