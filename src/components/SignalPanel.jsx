import { specOf } from "../sim/vehicles.js";

const MOTOR_OLCEK = 150; // çubuğun tam dolduğu tekerlek hızı (px/sn)

/**
 * İzlenen aracın o anki durumunu düz Türkçeyle anlatır.
 * @param {import("../sim/vehicles.js").VehicleSpec} spec
 * @param {{sol:number, sag:number}} goz    sensör okumaları
 * @param {{sol:number, sag:number}} teker  tekerlek hızları
 */
export function acikla(spec, goz, teker) {
  if (goz.sol < 0.02 && goz.sag < 0.02) {
    return spec.etki === "uyarici"
      ? "Araç şu an ışık görmüyor. Tekerleklerine sinyal gitmediği için ağır ağır ilerliyor."
      : "Araç şu an ışık görmüyor. Onu yavaşlatan bir sinyal olmadığı için tam hızla gidiyor.";
  }
  if (teker.sol < 1 && teker.sag < 1) {
    return "İki göz de çok ışık görüyor ve iki tekerleği de durduruyor. Araç ışığın karşısında bekliyor.";
  }
  if (Math.abs(goz.sol - goz.sag) < 0.015) {
    return "İki göz de aynı miktarda ışık görüyor. Tekerlekler eşit döndüğü için araç düz gidiyor.";
  }
  const gorenGoz = goz.sol > goz.sag ? "sol" : "sag";
  const ad = { sol: "sol", sag: "sağ" };
  const hedef = spec.baglanti === "duz" ? gorenGoz : gorenGoz === "sol" ? "sag" : "sol";
  const fiil = spec.etki === "uyarici" ? "hızlandırıyor" : "yavaşlatıyor";
  // Hızlı tekerlek soldaysa araç sağa döner
  const donus = teker.sol > teker.sag ? "sag" : "sol";
  const nereye = donus === gorenGoz ? "ışığa doğru" : "ışıktan uzağa";
  const Bas = ad[gorenGoz][0].toUpperCase() + ad[gorenGoz].slice(1);
  return `${Bas} göz daha çok ışık görüyor ve ${ad[hedef]} tekerleği ${fiil}. Araç ${ad[donus]}a, yani ${nereye} dönüyor.`;
}

function Cubuk({ etiket, oran, renk }) {
  const yuzde = Math.round(Math.min(1, Math.max(0, oran)) * 100);
  return (
    <div className="bar-row">
      <span className="bar-label">{etiket}</span>
      <span className="bar-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={yuzde} aria-label={etiket}>
        <span className="bar-fill" style={{ width: `${yuzde}%`, background: renk }} />
      </span>
    </div>
  );
}

/**
 * @param {{
 *   vehicles: {id:number, type:string}[],
 *   watchedId: number | null,
 *   onWatch: (id:number) => void,
 *   signal: null | {type:string, goz:{sol:number,sag:number}, teker:{sol:number,sag:number}}
 * }} props
 */
export default function SignalPanel({ vehicles, watchedId, onWatch, signal }) {
  if (!signal) {
    return (
      <>
        <h2>Araç ne görüyor?</h2>
        <p className="panel-empty">Sahnede araç yok. Bir araç koyduğunda gözlerinin gördüğü ışığı ve tekerleklerinin hızını burada canlı izleyebilirsin.</p>
      </>
    );
  }
  const spec = specOf(signal.type);
  const sayac = {};
  return (
    <>
      <h2>Araç ne görüyor?</h2>
      <div className="watch-list" role="radiogroup" aria-label="İzlenen araç">
        {vehicles.map((v) => {
          const s = specOf(v.type);
          sayac[v.type] = (sayac[v.type] ?? 0) + 1;
          return (
            <button
              key={v.id}
              role="radio"
              aria-checked={v.id === watchedId}
              className={v.id === watchedId ? "active" : ""}
              onClick={() => onWatch(v.id)}
            >
              <span className="dot" style={{ background: s.renk }} />
              {s.ad}
              {vehicles.filter((o) => o.type === v.type).length > 1 ? ` ${sayac[v.type]}` : ""}
            </button>
          );
        })}
      </div>

      <div className="bars">
        <Cubuk etiket="Sol göz" oran={signal.goz.sol} renk="var(--lamp)" />
        <Cubuk etiket="Sağ göz" oran={signal.goz.sag} renk="var(--lamp)" />
        <Cubuk etiket="Sol tekerlek" oran={signal.teker.sol / MOTOR_OLCEK} renk={spec.renk} />
        <Cubuk etiket="Sağ tekerlek" oran={signal.teker.sag / MOTOR_OLCEK} renk={spec.renk} />
      </div>

      <p className="explain" aria-live="off">{acikla(spec, signal.goz, signal.teker)}</p>
    </>
  );
}
