import { useEffect } from "react";
import { drawWorld } from "../sim/draw.js";

/**
 * Dünyayı çizen canvas. Çizim döngüsü App'te; bu bileşen yalnızca canvas'ı hazırlar
 * ve tıklamaları dünya koordinatlarına çevirir.
 *
 * @param {{
 *   world: import("../sim/world.js").World,
 *   canvasRef: React.RefObject<HTMLCanvasElement>,
 *   onWorldClick: (x:number, y:number) => void,
 *   tool: string,
 *   options: {showTrails:boolean, showSensors:boolean}
 * }} props
 */
export default function WorldCanvas({ world, canvasRef, onWorldClick, tool, options }) {
  // Yüksek çözünürlüklü ekranlarda net görünmesi için canvas'ı piksel yoğunluğuna göre büyüt
  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = world.width * dpr;
    canvas.height = world.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWorld(ctx, world, options);
    // yalnızca boyut değişince yeniden kur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.width, world.height]);

  function tiklandi(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * world.width;
    const y = ((e.clientY - rect.top) / rect.height) * world.height;
    onWorldClick(x, y);
  }

  const imlecler = { isik: "cursor-light", arac: "cursor-add", sil: "cursor-erase" };

  return (
    <canvas
      ref={canvasRef}
      className={`world ${imlecler[tool] ?? ""}`}
      style={{ aspectRatio: `${world.width} / ${world.height}` }}
      onClick={tiklandi}
      aria-label="Simülasyon alanı. Seçili araca göre tıklayarak ışık ya da araç ekleyin, veya silin."
      role="img"
    />
  );
}
