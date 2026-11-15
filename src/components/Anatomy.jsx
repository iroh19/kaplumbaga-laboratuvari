// Bir aracın parçalarını etiketleriyle gösteren şema (ilk kez gelenler için).

export default function Anatomy() {
  return (
    <svg viewBox="0 0 300 170" className="anatomy" role="img" aria-label="Bir aracın parçaları: önde iki göz, arkada iki tekerlek, aralarında iki kablo. Karşısında bir ışık.">
      {/* ışık */}
      <circle cx="262" cy="86" r="26" className="an-glow" />
      <circle cx="262" cy="86" r="8" className="an-lamp" />
      <text x="262" y="132" className="an-label" textAnchor="middle">ışık</text>

      {/* araç gövdesi (sağa bakıyor) */}
      <rect x="62" y="48" width="112" height="76" rx="16" className="an-body" />
      {/* tekerlekler */}
      <rect x="70" y="34" width="44" height="12" rx="4" className="an-wheel" />
      <rect x="70" y="126" width="44" height="12" rx="4" className="an-wheel" />
      {/* kablolar */}
      <path d="M160 64 C 130 64, 120 52, 96 46" className="an-wire" />
      <path d="M160 108 C 130 108, 120 120, 96 126" className="an-wire" />
      {/* gözler */}
      <circle cx="164" cy="64" r="8" className="an-eye" />
      <circle cx="164" cy="108" r="8" className="an-eye" />

      {/* etiketler */}
      <line x1="172" y1="60" x2="196" y2="30" className="an-lead" />
      <text x="198" y="26" className="an-label">göz (ışık sensörü)</text>
      <line x1="76" y1="34" x2="58" y2="18" className="an-lead" />
      <text x="8" y="14" className="an-label">tekerlek</text>
      <line x1="126" y1="112" x2="150" y2="150" className="an-lead" />
      <text x="154" y="158" className="an-label">kablo</text>
    </svg>
  );
}
