import { useCallback, useEffect, useRef, useState } from "react";
import TortoiseLab from "./TortoiseLab.jsx";
import WorldCanvas from "./components/WorldCanvas.jsx";
import WiringDiagram from "./components/WiringDiagram.jsx";
import SignalPanel from "./components/SignalPanel.jsx";
import Anatomy from "./components/Anatomy.jsx";
import { VEHICLE_TYPES, specOf } from "./sim/vehicles.js";
import { drawWorld } from "./sim/draw.js";
import { emptyWorld, fromScene, handleClick, motors, readSensors, tick, toScene } from "./sim/world.js";
import { PRESETS } from "./presets.js";
import {
  deleteSaved, listSaved, loadLast, saveLast, saveScene, sceneFromHash, shareUrl,
} from "./storage.js";

const ARACLAR = [
  { id: "isik", ad: "Işık koy", ipucu: "Sahneye tıklayarak ışık koy." },
  { id: "arac", ad: "Araç koy", ipucu: "Sağdan bir araç seç, sonra sahneye tıkla." },
  { id: "sil", ad: "Sil", ipucu: "Silmek istediğin ışığa ya da araca tıkla." },
];

/** Açılışta hangi sahne yüklensin: önce paylaşılan bağlantı, sonra son çalışma, sonra ilk deney. */
function baslangic() {
  const paylasilan = sceneFromHash();
  if (paylasilan) return { scene: paylasilan, preset: null, kaynak: "baglanti" };
  const son = loadLast();
  if (son) return { scene: son, preset: null, kaynak: "son" };
  return { scene: PRESETS[0].scene, preset: PRESETS[0].id, kaynak: "deney" };
}

function BraitenbergLab() {
  const ilk = useRef(null);
  if (ilk.current === null) ilk.current = baslangic();

  // Dünya bir ref'te tutulur: saniyede 60 kez değişiyor, React'in her karede yeniden çizmesine gerek yok
  const worldRef = useRef(fromScene(ilk.current.scene));
  const startSceneRef = useRef(toScene(worldRef.current));
  const canvasRef = useRef(null);

  const [running, setRunning] = useState(ilk.current.kaynak !== "son");
  const [speed, setSpeed] = useState(1);
  const [tool, setTool] = useState("isik");
  const [selectedType, setSelectedType] = useState("sevgi");
  const [showTrails, setShowTrails] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const watchedRef = useRef(null);
  const [stats, setStats] = useState(() => ozet(worldRef.current, watchedRef));
  const [saved, setSaved] = useState(() => listSaved());
  const [sceneName, setSceneName] = useState("");
  const [activePreset, setActivePreset] = useState(ilk.current.preset);
  const [shareLink, setShareLink] = useState("");
  const [notice, setNotice] = useState(
    ilk.current.kaynak === "baglanti" ? "Paylaşılan sahne yüklendi." : "",
  );

  // Döngünün okuduğu güncel ayarlar (döngüyü her ayar değişiminde yeniden başlatmamak için)
  const ayarlar = useRef({ running, speed, showTrails, showSensors });
  ayarlar.current = { running, speed, showTrails, showSensors };

  const ciz = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { showTrails: iz, showSensors: sensor } = ayarlar.current;
    drawWorld(ctx, worldRef.current, { showTrails: iz, showSensors: sensor, watchedId: watchedRef.current });
  }, []);

  // SPD big-bang döngüsü: her karede on-tick, sonra to-draw
  useEffect(() => {
    let kare = 0;
    let onceki = performance.now();
    let istek;
    const dongu = (simdi) => {
      const gecen = Math.min(0.05, (simdi - onceki) / 1000);
      onceki = simdi;
      if (ayarlar.current.running) {
        let kalan = gecen * ayarlar.current.speed;
        while (kalan > 1e-6) {
          const dt = Math.min(1 / 60, kalan);
          worldRef.current = tick(worldRef.current, dt);
          kalan -= dt;
        }
      }
      ciz();
      kare += 1;
      if (kare % 4 === 0) setStats(ozet(worldRef.current, watchedRef));
      istek = requestAnimationFrame(dongu);
    };
    istek = requestAnimationFrame(dongu);
    return () => cancelAnimationFrame(istek);
  }, [ciz]);

  // Boşluk tuşu: oynat / duraklat
  useEffect(() => {
    const tus = (e) => {
      if (e.code !== "Space" || ["INPUT", "TEXTAREA", "BUTTON"].includes(e.target.tagName)) return;
      e.preventDefault();
      setRunning((r) => !r);
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, []);

  /** Kullanıcının yaptığı her değişiklikten sonra: dünyayı güncelle, başlangıç sahnesini ve son çalışmayı kaydet. */
  function degistir(yeniDunya) {
    worldRef.current = yeniDunya;
    startSceneRef.current = toScene(yeniDunya);
    saveLast(startSceneRef.current);
    setStats(ozet(yeniDunya, watchedRef));
    setShareLink("");
    ciz();
  }

  function sahneYukle(scene, presetId = null, mesaj = "") {
    watchedRef.current = null;
    degistir(fromScene(scene));
    setActivePreset(presetId);
    setRunning(true);
    setNotice(mesaj);
  }

  function dunyayaTiklandi(x, y) {
    degistir(handleClick(worldRef.current, x, y, tool, selectedType));
  }

  function basaSar() {
    worldRef.current = fromScene(startSceneRef.current);
    setStats(ozet(worldRef.current, watchedRef));
    ciz();
  }

  function temizle() {
    degistir(emptyWorld());
    setActivePreset(null);
    setRunning(false);
    setTool("isik");
  }

  function birAdim() {
    setRunning(false);
    for (let i = 0; i < 6; i++) worldRef.current = tick(worldRef.current, 1 / 60);
    setStats(ozet(worldRef.current, watchedRef));
    ciz();
  }

  function kaydet(e) {
    e.preventDefault();
    setSaved(saveScene(sceneName, startSceneRef.current));
    setNotice(`"${sceneName.trim() || "Adsız sahne"}" kaydedildi.`);
    setSceneName("");
  }

  async function paylas() {
    const link = shareUrl(startSceneRef.current);
    setShareLink(link);
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Bağlantı panoya kopyalandı.");
    } catch {
      setNotice("Bağlantıyı aşağıdan kopyalayabilirsin.");
    }
  }

  function izle(id) {
    watchedRef.current = id;
    setStats(ozet(worldRef.current, watchedRef));
    ciz();
  }

  function aracSec(id) {
    setSelectedType(id);
    setTool("arac");
  }

  const aktifDeney = PRESETS.find((p) => p.id === activePreset);
  const aracIpucu = ARACLAR.find((a) => a.id === tool)?.ipucu;

  return (
    <div className="app">
      <main className="bento">
        <header className="cell cell-title">
          <h1>Kaplumbağa Laboratuvarı</h1>
          <p className="lede">
            Ekrandaki küçük araçların beyni yok. Yalnızca ışığı gören iki gözleri ve bu gözlere kabloyla bağlı iki
            tekerlekleri var. Yine de biri ışıktan kaçıyor, biri ışığa saldırıyor, biri de yanına gidip bekliyor.
            Aradaki tek fark, kabloların nasıl bağlandığı.
          </p>
        </header>

        <section className="cell cell-how" aria-labelledby="how-h">
          <h2 id="how-h">Bir araç nasıl çalışır?</h2>
          <Anatomy />
          <ol className="steps">
            <li>Her göz, gördüğü ışık kadar sinyal üretir. Işık yakınsa ve gözün baktığı yöndeyse sinyal güçlüdür.</li>
            <li>Sinyal kablodan bir tekerleğe gider ve onu ya hızlandırır ya da yavaşlatır.</li>
            <li>Tekerleklerden biri daha hızlı dönünce araç döner. Yeri değişince gördüğü ışık da değişir ve her şey baştan başlar.</li>
          </ol>
        </section>

        <section className="cell cell-stage stage" aria-label="Deney odası">
          <div className="toolbar">
            <div className="segmented" role="radiogroup" aria-label="Tıklayınca ne olsun">
              {ARACLAR.map((a) => (
                <button
                  key={a.id}
                  role="radio"
                  aria-checked={tool === a.id}
                  className={tool === a.id ? "active" : ""}
                  onClick={() => setTool(a.id)}
                >
                  {a.ad}
                  {a.id === "arac" && <span className="dot" style={{ background: specOf(selectedType).renk }} />}
                </button>
              ))}
            </div>

            <div className="controls">
              <button className="primary" onClick={() => setRunning((r) => !r)}>
                {running ? "Duraklat" : "Oynat"}
              </button>
              <button onClick={birAdim} title="Duraklat ve kısa bir adım ilerlet">Adım</button>
              <button onClick={basaSar} title="Araçları başlangıç konumlarına döndür">Başa sar</button>
              <button onClick={temizle}>Temizle</button>
            </div>
          </div>

          <WorldCanvas
            world={worldRef.current}
            canvasRef={canvasRef}
            onWorldClick={dunyayaTiklandi}
            tool={tool}
            options={{ showTrails, showSensors }}
          />

          <div className="statusbar">
            <span>
              {stats.lights} ışık, {stats.vehicles} araç, {stats.time.toFixed(1).replace(".", ",")} sn
            </span>
            <span className="tool-hint">{aracIpucu}</span>
          </div>

          <div className="options">
            <label className="slider">
              Hız
              <input
                type="range"
                min="0.25"
                max="3"
                step="0.25"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
              <output>{String(speed).replace(".", ",")}×</output>
            </label>
            <label>
              <input type="checkbox" checked={showTrails} onChange={(e) => setShowTrails(e.target.checked)} />
              İzleri göster
            </label>
            <label>
              <input type="checkbox" checked={showSensors} onChange={(e) => setShowSensors(e.target.checked)} />
              Gözleri göster
            </label>
          </div>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
        </section>

        <section className="cell cell-signal" aria-label="İzlenen aracın sinyalleri">
          <SignalPanel vehicles={stats.list} watchedId={stats.watchedId} onWatch={izle} signal={stats.signal} />
        </section>

        <section className="cell cell-vehicles">
          <h2>Dört bağlantı, dört karakter</h2>
          <p className="hint">Birini seç, sonra odaya tıklayarak yerleştir.</p>
          <div className="cards">
            {VEHICLE_TYPES.map((t) => (
              <button
                key={t.id}
                className={`card ${selectedType === t.id && tool === "arac" ? "selected" : ""}`}
                style={{ "--accent": t.renk }}
                onClick={() => aracSec(t.id)}
                aria-pressed={selectedType === t.id && tool === "arac"}
              >
                <WiringDiagram spec={t} />
                <span className="card-text">
                  <span className="card-title">{t.ad}</span>
                  <span className="card-wiring">
                    {t.baglanti === "duz" ? "Düz" : "Çapraz"} kablo, {t.etki === "uyarici" ? "hızlandıran" : "yavaşlatan"} sinyal
                  </span>
                  <span className="card-desc">{t.davranis}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="legend">
            <span className="legend-solid" /> düz çizgi: ışık arttıkça tekerlek hızlanır
            <br />
            <span className="legend-dashed" /> kesik çizgi: ışık arttıkça tekerlek yavaşlar
          </p>
        </section>

        <section className="cell cell-experiments">
          <h2>Hazır deneyler</h2>
          <div className="presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={activePreset === p.id ? "active" : ""}
                onClick={() => sahneYukle(p.scene, p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
          {aktifDeney ? (
            <p className="question">{aktifDeney.soru}</p>
          ) : (
            <p className="question muted">Kendi deneyini kuruyorsun. Hazır bir deneye dönmek için yukarıdan birini seç.</p>
          )}
        </section>

        <section className="cell cell-saved">
          <h2>Sahnelerim</h2>
          <form className="save-form" onSubmit={kaydet}>
            <input
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              placeholder="Sahneye bir ad ver"
              aria-label="Sahne adı"
              maxLength={40}
            />
            <button type="submit">Kaydet</button>
          </form>
          {saved.length === 0 ? (
            <p className="hint">Kurduğun sahneyi kaydet, sonra buradan tek tıkla geri aç. Kayıtlar yalnızca bu tarayıcıda durur.</p>
          ) : (
            <ul className="saved">
              {saved.map((k) => (
                <li key={k.id}>
                  <button className="link" onClick={() => sahneYukle(k.scene, null, `"${k.name}" yüklendi.`)}>
                    {k.name}
                  </button>
                  <span className="meta">
                    {k.scene.lights.length} ışık, {k.scene.vehicles.length} araç
                  </span>
                  <button
                    className="ghost"
                    aria-label={`${k.name} sahnesini sil`}
                    onClick={() => setSaved(deleteSaved(k.id))}
                  >
                    Sil
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button className="share" onClick={paylas}>
            Bu sahnenin bağlantısını kopyala
          </button>
          {shareLink && (
            <input className="share-link" readOnly value={shareLink} onFocus={(e) => e.target.select()} aria-label="Paylaşım bağlantısı" />
          )}
        </section>

        <article className="cell cell-b1">
          <h2>Bu fikir nereden geliyor?</h2>
          <p>
            Nörobilimci Valentino Braitenberg, 1984 tarihli <em>Vehicles</em> kitabında bu araçları bir düşünce deneyi
            olarak tarif etti. Gösterdiği şey şuydu: içi son derece basit olan bir makine, dışarıdan izleyene korkuyor,
            seviyor ya da merak ediyor gibi görünebilir.
          </p>
        </article>
        <article className="cell cell-b2">
          <h2>Neden kaplumbağa?</h2>
          <p>
            1940'ların sonunda W. Grey Walter, Bristol'da Elmer ve Elsie adını verdiği iki küçük robot yaptı. Kabukları
            yüzünden kaplumbağa denen bu robotlar ışığa yöneliyor, engele çarpınca yön değiştiriyordu.
          </p>
        </article>
        <article className="cell cell-b3">
          <h2>Sibernetik bunun neresinde?</h2>
          <p>
            Sibernetik, canlıların ve makinelerin kendini nasıl yönettiğini inceler. Adı Yunanca dümenci demek olan{" "}
            <em>kybernetes</em>'ten gelir. Bir dümenci gibi bu araçlar da sürekli aynı döngüyü tekrarlar: bak, düzelt,
            yeniden bak. Buna geri besleme denir.
          </p>
        </article>
      </main>

      <footer className="footer">Sahnelerin ve kayıtların yalnızca bu tarayıcıda saklanır, hiçbir yere gönderilmez.</footer>
    </div>
  );
}

function ozet(world, watchedRef) {
  // İzlenen araç silindiyse ilk araca geç
  let watched = world.vehicles.find((v) => v.id === watchedRef.current) ?? world.vehicles[0] ?? null;
  watchedRef.current = watched ? watched.id : null;
  let signal = null;
  if (watched) {
    const goz = readSensors(watched, world.lights);
    signal = { type: watched.type, goz, teker: motors(watched.type, goz) };
  }
  return {
    lights: world.lights.length,
    vehicles: world.vehicles.length,
    time: world.time,
    list: world.vehicles.map((v) => ({ id: v.id, type: v.type })),
    watchedId: watchedRef.current,
    signal,
  };
}

/** Üst düzey sayfa: iki laboratuvar arasında sekmeyle geçiş. Paylaşılan Braitenberg bağlantısı (#s=...) doğrudan ikinci sekmeyi açar. */
export default function App() {
  const [sayfa, setSayfa] = useState(() => (sceneFromHash() ? "braitenberg" : "kaplumbaga"));
  const sekmeler = [
    { id: "kaplumbaga", ad: "1. Gerçek kaplumbağa: Walter'ın robotu" },
    { id: "braitenberg", ad: "2. Braitenberg araçları" },
  ];
  return (
    <>
      <nav className="tabs" aria-label="Laboratuvar seçimi">
        <div className="tabs-inner" role="tablist">
          {sekmeler.map((k) => (
            <button key={k.id} role="tab" aria-selected={sayfa === k.id} className={sayfa === k.id ? "active" : ""} onClick={() => setSayfa(k.id)}>
              {k.ad}
            </button>
          ))}
        </div>
      </nav>
      {sayfa === "kaplumbaga" ? <TortoiseLab /> : <BraitenbergLab />}
    </>
  );
}
