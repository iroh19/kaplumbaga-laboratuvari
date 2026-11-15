// Hazır deney sahneleri. Dünya 900 × 560 piksel.

const D = Math.PI / 180;

/** @type {{id:string, name:string, soru:string, scene:import("./sim/world.js").Scene}[]} */
export const PRESETS = [
  {
    id: "ilk-karsilasma",
    name: "İlk karşılaşma",
    soru: "Dört araç da aynı ışığı görüyor. Neden her biri başka bir şey yapıyor?",
    scene: {
      lights: [{ x: 450, y: 280, strength: 1 }],
      vehicles: [
        { type: "korku", x: 250, y: 150, heading: 20 * D },
        { type: "saldirganlik", x: 660, y: 140, heading: 160 * D },
        { type: "sevgi", x: 230, y: 430, heading: -30 * D },
        { type: "kasif", x: 680, y: 430, heading: -150 * D },
      ],
    },
  },
  {
    id: "iki-isik",
    name: "İki ışık arasında",
    soru: "Sevgi araçları hangi ışığı seçiyor? Başlangıç yönleri kararı nasıl etkiliyor?",
    scene: {
      lights: [
        { x: 270, y: 280, strength: 1 },
        { x: 630, y: 280, strength: 1 },
      ],
      vehicles: [
        { type: "sevgi", x: 450, y: 120, heading: 90 * D },
        { type: "sevgi", x: 450, y: 440, heading: -95 * D },
        { type: "sevgi", x: 450, y: 280, heading: 5 * D },
      ],
    },
  },
  {
    id: "kacis",
    name: "Kaçış",
    soru: "Korku araçları ışıktan kaçıyor. Ama ışığa sırtı dönük olan neden hiç acele etmiyor?",
    scene: {
      lights: [{ x: 450, y: 280, strength: 1 }],
      vehicles: [
        { type: "korku", x: 380, y: 230, heading: 0 },
        { type: "korku", x: 520, y: 240, heading: 200 * D },
        { type: "korku", x: 450, y: 370, heading: -80 * D },
        { type: "korku", x: 560, y: 360, heading: 60 * D },
      ],
    },
  },
  {
    id: "kasiflerin-turu",
    name: "Kâşiflerin turu",
    soru: "Kâşifler ışıkları fark ediyor ama hiçbirine yerleşmiyor. Zamanla odanın en çok neresinde dolaşıyorlar, neden?",
    scene: {
      lights: [
        { x: 180, y: 140, strength: 1 },
        { x: 620, y: 110, strength: 1 },
        { x: 760, y: 400, strength: 1 },
        { x: 300, y: 450, strength: 1 },
      ],
      vehicles: [
        { type: "kasif", x: 450, y: 280, heading: 30 * D },
        { type: "kasif", x: 120, y: 300, heading: -60 * D },
        { type: "kasif", x: 800, y: 250, heading: 200 * D },
      ],
    },
  },
  {
    id: "av",
    name: "Av",
    soru: "Saldırganlık araçları ışığa çarpıyor. Çarptıktan sonra neden yavaşlıyorlar?",
    scene: {
      lights: [
        { x: 330, y: 280, strength: 1 },
        { x: 600, y: 200, strength: 1.3 },
      ],
      vehicles: [
        { type: "saldirganlik", x: 120, y: 120, heading: 30 * D },
        { type: "saldirganlik", x: 800, y: 470, heading: 210 * D },
        { type: "saldirganlik", x: 150, y: 470, heading: -20 * D },
      ],
    },
  },
];
