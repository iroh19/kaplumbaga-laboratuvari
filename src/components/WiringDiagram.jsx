// Bir aracın sensör-motor bağlantısını gösteren küçük şema.

/**
 * @param {{spec: import("../sim/vehicles.js").VehicleSpec}} props
 */
export default function WiringDiagram({ spec }) {
  const capraz = spec.baglanti === "capraz";
  const baskilayici = spec.etki === "baskilayici";
  const sensor = { sol: [34, 18], sag: [86, 18] };
  const motor = { sol: [30, 82], sag: [90, 82] };
  const hedef = (kaynak) => (capraz ? (kaynak === "sol" ? motor.sag : motor.sol) : motor[kaynak]);
  const isaret = baskilayici ? "−" : "+";

  return (
    <svg
      viewBox="0 0 120 100"
      className="wiring"
      role="img"
      aria-label={`${spec.ad}: ${capraz ? "çapraz" : "düz"} ve ${baskilayici ? "baskılayıcı" : "uyarıcı"} bağlantı`}
    >
      <rect x="22" y="14" width="76" height="74" rx="12" className="wiring-body" />
      {["sol", "sag"].map((k) => {
        const [x1, y1] = sensor[k];
        const [x2, y2] = hedef(k);
        return (
          <g key={k}>
            <line
              x1={x1}
              y1={y1 + 4}
              x2={x2}
              y2={y2 - 8}
              stroke={spec.renk}
              strokeWidth="2.5"
              strokeDasharray={baskilayici ? "5 4" : undefined}
            />
            <text x={(x1 + x2) / 2 + (k === "sol" ? -9 : 9)} y={(y1 + y2) / 2 + 4} className="wiring-sign">
              {isaret}
            </text>
          </g>
        );
      })}
      {Object.entries(sensor).map(([k, [x, y]]) => (
        <circle key={k} cx={x} cy={y} r="5" className="wiring-sensor" />
      ))}
      {Object.entries(motor).map(([k, [x, y]]) => (
        <rect key={k} x={x - 5} y={y - 9} width="10" height="18" rx="2" className="wiring-wheel" />
      ))}
    </svg>
  );
}
