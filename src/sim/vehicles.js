// Braitenberg araç tipleri.
// Her araçta iki ışık sensörü (ön sol, ön sağ) ve iki tekerlek motoru var.
// Tip, sensörlerin motorlara nasıl bağlandığını belirler:
//   bağlantı: "duz"    → sol sensör sol motora, sağ sensör sağ motora
//             "capraz" → sol sensör sağ motora, sağ sensör sol motora
//   etki:     "uyarici"    → daha çok ışık, daha hızlı motor
//             "baskilayici" → daha çok ışık, daha yavaş motor

/**
 * @typedef {"korku" | "saldirganlik" | "sevgi" | "kasif"} VehicleType
 *
 * @typedef {Object} VehicleSpec
 * @property {VehicleType} id
 * @property {string} ad          Kullanıcıya gösterilen ad
 * @property {string} kod         Braitenberg'in kitabındaki numara
 * @property {"duz" | "capraz"} baglanti
 * @property {"uyarici" | "baskilayici"} etki
 * @property {string} renk
 * @property {string} davranis    Tek cümlelik açıklama
 */

/** @type {VehicleSpec[]} */
export const VEHICLE_TYPES = [
  {
    id: "korku",
    ad: "Korku",
    kod: "2a",
    baglanti: "duz",
    etki: "uyarici",
    renk: "#f08a4b",
    davranis:
      "Işık hangi taraftaysa o taraftaki tekerlek hızlanır; araç ışıktan uzağa döner ve kaçar.",
  },
  {
    id: "saldirganlik",
    ad: "Saldırganlık",
    kod: "2b",
    baglanti: "capraz",
    etki: "uyarici",
    renk: "#e5484d",
    davranis:
      "Çapraz bağlantı aracı ışığa doğru çevirir; yaklaştıkça hızlanır ve ışığın üstüne atılır.",
  },
  {
    id: "sevgi",
    ad: "Sevgi",
    kod: "3a",
    baglanti: "duz",
    etki: "baskilayici",
    renk: "#35b38a",
    davranis:
      "Işığa doğru döner ama yaklaştıkça yavaşlar; sonunda ışığın yanında durup ona bakar.",
  },
  {
    id: "kasif",
    ad: "Kâşif",
    kod: "3b",
    baglanti: "capraz",
    etki: "baskilayici",
    renk: "#6aa9f2",
    davranis:
      "Işığı fark edince yavaşlar ama ondan yüz çevirir ve başka ışıkları aramaya gider.",
  },
];

/**
 * Tip kimliğinden araç tanımını döndürür.
 * @param {VehicleType} id
 * @returns {VehicleSpec}
 */
export function specOf(id) {
  const spec = VEHICLE_TYPES.find((t) => t.id === id);
  if (!spec) throw new Error(`Bilinmeyen araç tipi: ${id}`);
  return spec;
}
