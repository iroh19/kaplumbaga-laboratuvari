/**
 * Walter'ın kaplumbağasının yandan kesiti. Her parça düz Türkçeyle etiketli.
 * Çizim şematiktir; ölçekli bir teknik resim değildir.
 */
export default function TortoiseAnatomy() {
  return (
    <svg className="tanatomy" viewBox="0 0 540 280" role="img" aria-label="Kaplumbağa robotun yandan kesiti: dönen göz, kabuk, çarpma anahtarı, iki vakum tüpü, pil, motorlar, tekerlekler ve gösterge lambası">
      <g transform="translate(150,0)">
        <line x1="10" y1="236" x2="380" y2="236" className="an-lead" />
        <circle cx="120" cy="222" r="14" className="an-wheel" />
        <circle cx="270" cy="222" r="14" className="an-wheel" />
        <circle cx="338" cy="226" r="10" className="an-wheel" />
        <rect x="92" y="170" width="260" height="38" rx="8" className="an-body" />
        <path d="M88 172 C100 92 300 92 356 172 Z" className="an-shell" />
        <line x1="88" y1="172" x2="356" y2="172" className="an-gap" />
        <line x1="215" y1="112" x2="215" y2="96" className="an-wire" />
        <circle cx="215" cy="90" r="9" className="an-eye" />
        <path d="M224 86 L262 70 M224 94 L262 110" className="an-beam" />
        <rect x="150" y="124" width="16" height="38" rx="8" className="an-tube" />
        <rect x="176" y="124" width="16" height="38" rx="8" className="an-tube" />
        <rect x="258" y="132" width="56" height="30" rx="4" className="an-batt" />
        <circle cx="350" cy="150" r="5" className="an-pilot" />
      </g>

      <g className="an-label">
        <text x="150" y="40">dönen göz (fotosel):</text>
        <text x="150" y="54">ışığı arar</text>
        <line x1="236" y1="58" x2="354" y2="82" className="an-lead" />

        <text x="526" y="28" textAnchor="end">gösterge lambası</text>
        <text x="526" y="42" textAnchor="end">(ne yaptığını gösterir)</text>
        <line x1="500" y1="48" x2="500" y2="143" className="an-lead" />

        <text x="8" y="112">&quot;beyin&quot;: yalnızca</text>
        <text x="8" y="126">iki vakum tüpü</text>
        <line x1="108" y1="122" x2="296" y2="140" className="an-lead" />

        <text x="420" y="118">pil</text>
        <line x1="430" y1="122" x2="430" y2="130" className="an-lead" />

        <text x="8" y="178">kabuk: gövdeye gevşek</text>
        <text x="8" y="192">bağlı. Bir şeye çarpınca</text>
        <text x="8" y="206">içeri itilir ve anahtarı</text>
        <text x="8" y="220">çalıştırır</text>
        <line x1="150" y1="172" x2="236" y2="172" className="an-lead" />

        <text x="170" y="262">üç tekerlek, iki motor: biri yürütür, biri yönlendirir</text>
      </g>
    </svg>
  );
}
