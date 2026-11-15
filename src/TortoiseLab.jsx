import { useEffect, useRef, useState } from "react";
import TortoiseAnatomy from "./components/TortoiseAnatomy.jsx";
import { drawTWorld } from "./sim/tdraw.js";
import {
  EXPERIMENTS, MODE_INFO, P, acikla, addLamp, addObstacle, removeNearT, tickT,
} from "./sim/tortoise.js";

const ARACLAR = [
  { id: "isik", ad: "Işık koy", ipucu: "Odaya tıklayarak bir lamba koy." },
  { id: "engel", ad: "Engel koy", ipucu: "Odaya tıklayarak bir engel koy." },
  { id: "sil", ad: "Sil", ipucu: "Silmek istediğin lambaya ya da engele tıkla." },
];

const KURALLAR = [
  { no: 1, ad: "Ara", ne: "Işık görünmüyorsa: yavaşça geniş bir daire çizerek yürü, gözünü döndür.", gibi: "Karanlıkta elleriyle yolunu arayan biri gibi." },
  { no: 2, ad: "Yaklaş", ne: "Orta parlaklıkta bir ışık görürsen: gözünü ona kilitle ve ona doğru yürü.", gibi: "Pencereden gelen ışığa dönen bir bitki ya da gece lambasına giden bir güve gibi." },
  { no: 3, ad: "Uzaklaş", ne: "Işık çok parlaksa: dön ve uzaklaş.", gibi: "Gözünü kamaştıran farlardan yüzünü çevirmek gibi. Bu yüzden lambanın içine girmez, çevresinde gidip gelir." },
  { no: 4, ad: "Çarp ve çekil", ne: "Kabuğun anahtarı çalışırsa: geri git ve yön değiştir.", gibi: "Karanlıkta duvara çarpıp bir adım geri çekilmek gibi." },
  { no: 5, ad: "Acıkınca değiş", ne: "Pil azalınca çok parlak ışık bile çekici gelir. Kulübeye gidip şarj olur, dolunca kulübenin lambası yine fazla parlak gelir ve ayrılır.", gibi: "Karnı aç olanın yemek kokusuna gitmesi gibi. Hiçbir yerde \"şarja git\" diye bir komut yok; yalnızca ışığa verilen tepki değişiyor." },
];

const KAYNAKLAR = [
  ["IEEE Spectrum: Meet Roomba's Ancestor, the Cybernetic Tortoise", "https://spectrum.ieee.org/meet-roombas-ancestor-cybernetic-tortoise"],
  ["Nautilus: The Tortoises That Inspired Modern Robotics", "https://nautil.us/the-tortoises-that-inspired-modern-robotics-1268922"],
  ["Science Museum Group: Cybernetic tortoise", "https://collection.sciencemuseumgroup.org.uk/objects/co531614/cybernetic-tortoise-developed-to-help-with-studies-on-brain-function"],
  ["Science Museum blog: Tortoises and Turing", "https://blog.sciencemuseum.org.uk/tortoises-and-turing/"],
];

const ESIK_OLCEK = 1.2; // ışık çubuğunun tam dolduğu parlaklık

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

/** Kaplumbağanın gördüğü ışığı üç bölgeli bir çubukta gösterir: görmüyor, ilgi çekici, çok parlak. */
function IsikOlcer({ seen, aç }) {
  const lo = (P.LOW / ESIK_OLCEK) * 100;
  const hi = (P.BRIGHT / ESIK_OLCEK) * 100;
  const isaret = Math.min(100, (seen / ESIK_OLCEK) * 100);
  return (
    <div className="meter">
      <div className="meter-zones" aria-hidden="true">
        <span style={{ width: `${lo}%` }} className="z-dark" />
        <span style={{ width: `${hi - lo}%` }} className="z-mid" />
        <span style={{ width: `${100 - hi}%` }} className={aç ? "z-mid" : "z-hot"} />
        <i className="meter-mark" style={{ left: `${isaret}%` }} />
      </div>
      <div className="meter-legend">
        <span>görmüyor</span>
        <span>ilgi çekici</span>
        <span>{aç ? "çok parlak ama açken çekici" : "çok parlak"}</span>
      </div>
    </div>
  );
}

export default function TortoiseLab() {
  const [deneyId, setDeneyId] = useState(EXPERIMENTS[0].id);
  const worldRef = useRef(EXPERIMENTS[0].build());
  const startRef = useRef(worldRef.current);
  const canvasRef = useRef(null);
  const watchedRef = useRef(null);

  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [tool, setTool] = useState("isik");
  const [showTrails, setShowTrails] = useState(true);
  const [snap, setSnap] = useState(() => ozet(worldRef.current, watchedRef));
  const ayar = useRef({ running, speed, showTrails });
  ayar.current = { running, speed, showTrails };

  const deney = EXPERIMENTS.find((e) => e.id === deneyId);

  // Canvas'ı piksel yoğunluğuna göre kur
  useEffect(() => {
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = worldRef.current.width * dpr;
    c.height = worldRef.current.height * dpr;
    c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  function ciz() {
    const c = canvasRef.current;
    if (!c) return;
    drawTWorld(c.getContext("2d"), worldRef.current, { showTrails: ayar.current.showTrails, watchedId: watchedRef.current });
  }

  // Döngü: her karede ilerlet, çiz, ara sıra paneli güncelle
  useEffect(() => {
    let kare = 0, onceki = performance.now(), istek;
    const dongu = (simdi) => {
      const gecen = Math.min(0.05, (simdi - onceki) / 1000);
      onceki = simdi;
      if (ayar.current.running) {
        let kalan = gecen * ayar.current.speed;
        while (kalan > 1e-6) { const dt = Math.min(1 / 60, kalan); worldRef.current = tickT(worldRef.current, dt); kalan -= dt; }
      }
      ciz();
      if (++kare % 4 === 0) setSnap(ozet(worldRef.current, watchedRef));
      istek = requestAnimationFrame(dongu);
    };
    istek = requestAnimationFrame(dongu);
    return () => cancelAnimationFrame(istek);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tus = (e) => {
      if (e.code !== "Space" || ["INPUT", "TEXTAREA", "BUTTON", "SUMMARY"].includes(e.target.tagName)) return;
      e.preventDefault();
      setRunning((r) => !r);
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, []);

  function yukle(id) {
    const e = EXPERIMENTS.find((x) => x.id === id);
    worldRef.current = e.build();
    startRef.current = worldRef.current;
    watchedRef.current = null;
    setDeneyId(id);
    setRunning(true);
    setSnap(ozet(worldRef.current, watchedRef));
    ciz();
  }

  function odayaTiklandi(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * worldRef.current.width;
    const y = ((e.clientY - r.top) / r.height) * worldRef.current.height;
    const w = worldRef.current;
    worldRef.current = tool === "isik" ? addLamp(w, x, y) : tool === "engel" ? addObstacle(w, x, y) : removeNearT(w, x, y);
    startRef.current = { ...startRef.current, lights: worldRef.current.lights, obstacles: worldRef.current.obstacles };
    setSnap(ozet(worldRef.current, watchedRef));
    ciz();
  }

  function basaSar() {
    // Kullanıcının eklediği lamba ve engeller kalır; kaplumbağalar ilk konumuna döner
    worldRef.current = { ...startRef.current, lights: worldRef.current.lights, obstacles: worldRef.current.obstacles };
    setSnap(ozet(worldRef.current, watchedRef));
    ciz();
  }

  const t = snap.izlenen;
  const info = t ? MODE_INFO[t.mode] : null;

  return (
    <div className="app">
      <main className="tbento">
        <header className="cell cell-title">
          <h1>Elmer ve Elsie: ilk kaplumbağa robotlar</h1>
          <p className="lede">
            1948'de bir doktor, iki vakum tüpünden bir &quot;beyin&quot; yaptı ve onu üç tekerlekli, plastik kabuklu bir robota taktı. Robot kendi kendine
            dolaştı, ışığa gitti, engelden döndü ve pili bitince şarj olmaya gitti. Aşağıda onu çalıştırabilir, odasını değiştirebilir ve
            neden öyle davrandığını canlı olarak görebilirsin. Hiçbir ön bilgi gerekmiyor.
          </p>
        </header>

        <section className="cell cell-how" aria-labelledby="t-anat">
          <h2 id="t-anat">İçinde ne var?</h2>
          <TortoiseAnatomy />
        </section>

        <article className="cell cell-what">
          <h2>Bu nedir?</h2>
          <p>
            Nörofizyolog William Grey Walter, 1948-49'da İngiltere'de Bristol'daki Burden Nöroloji Enstitüsü'nde Elmer ve Elsie adlı iki robot yaptı.
            Yavaş yürüyen, üç tekerlekli, şeffaf plastik kabuklu makinelerdi. Tepelerinde ışığı arayan dönen bir göz, kabuklarında da bir çarpma
            anahtarı vardı. Walter onlara <em>Machina speculatrix</em>, yani &quot;keşfeden makine&quot; adını verdi. &quot;Kaplumbağa&quot; denmesinin nedeni
            kabuklarıydı.
          </p>
        </article>
        <article className="cell cell-why">
          <h2>Neden yapıldı?</h2>
          <p>
            Walter bir soruyu merak ediyordu: beyinde milyarlarca sinir hücresi var, ama karmaşık davranış gerçekten bu kadar hücre mi
            gerektiriyor? Yoksa birkaç hücre ve doğru bağlantılar yetebilir mi? Bunu denemek için yapabileceği en küçük &quot;beyni&quot; kurdu: iki yapay
            sinir hücresi yerine geçen iki vakum tüpü. Amaç bir ürün yapmak değil, beynin nasıl çalıştığı hakkında bir fikri sınamaktı.
          </p>
        </article>
        <article className="cell cell-res">
          <h2>Ne sonuç çıktı?</h2>
          <ul className="plain">
            <li>Robotlar ışık arıyor, ona yaklaşıyor, engelden dönüyor ve pilleri bitince şarja gidiyor gibi görünüyordu. Hiçbirine bunu yapması söylenmemişti.</li>
            <li>Aynada kendi gösterge lambasını görünce titrediler. İki robot birbirini görünce bir tür dans ettiler.</li>
            <li>Sonuç: birkaç basit kural, dışarıdan bakan biri için akıllı, hatta isteği olan bir canlı gibi görünebiliyor.</li>
            <li>Sınır: Elmer ve Elsie hiçbir şey öğrenemiyordu. Walter sonradan öğrenebilen bir robot (<em>Machina docilis</em>) yaptı.</li>
          </ul>
        </article>

        <section className="cell cell-stage" aria-label="Deney odası">
          <div className="toolbar">
            <div className="segmented" role="radiogroup" aria-label="Tıklayınca ne olsun">
              {ARACLAR.map((a) => (
                <button key={a.id} role="radio" aria-checked={tool === a.id} className={tool === a.id ? "active" : ""} onClick={() => setTool(a.id)}>
                  {a.ad}
                </button>
              ))}
            </div>
            <div className="controls">
              <button className="primary" onClick={() => setRunning((r) => !r)}>{running ? "Duraklat" : "Oynat"}</button>
              <button onClick={basaSar}>Başa sar</button>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            className={`world ${tool === "sil" ? "cursor-erase" : "cursor-light"}`}
            style={{ aspectRatio: "900 / 560" }}
            onClick={odayaTiklandi}
            role="img"
            aria-label="Deney odası. Kaplumbağa robot, lambalar, engeller, şarj kulübesi ve ayna görülür. Tıklayarak lamba ya da engel ekleyebilirsin."
          />
          <div className="statusbar">
            <span>{snap.sure.toFixed(1).replace(".", ",")} sn</span>
            <span className="tool-hint">{ARACLAR.find((a) => a.id === tool)?.ipucu}</span>
          </div>
          <div className="options">
            <label className="slider">
              Hız
              <input type="range" min="0.25" max="4" step="0.25" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
              <output>{String(speed).replace(".", ",")}×</output>
            </label>
            <label>
              <input type="checkbox" checked={showTrails} onChange={(e) => setShowTrails(e.target.checked)} />
              İzleri göster
            </label>
          </div>
        </section>

        <section className="cell cell-signal" aria-label="Kaplumbağa şu an ne yapıyor">
          <h2>Kaplumbağa şu an ne yapıyor?</h2>
          {snap.liste.length > 1 && (
            <div className="watch-list">
              {snap.liste.map((k) => (
                <button key={k.id} className={k.id === snap.watchedId ? "active" : ""} onClick={() => { watchedRef.current = k.id; setSnap(ozet(worldRef.current, watchedRef)); }}>
                  {k.name}
                </button>
              ))}
            </div>
          )}
          {t ? (
            <>
              <p className="state-chip" style={{ "--c": info.renk }}><i />{info.ad}</p>
              <p className="explain">{acikla(t)}</p>
              <div className="bars">
                <Cubuk etiket="Pil" oran={t.battery} renk={t.hungry ? "#e5484d" : "#7fd18b"} />
              </div>
              <p className="meter-title">Gördüğü ışık</p>
              <IsikOlcer seen={t.seen} aç={t.hungry} />
              <p className="facts">
                Gösterge lambası: <b>{t.lampOn ? "yanık (arıyorum)" : "sönük"}</b> · Aç mı: <b>{t.hungry ? "evet" : "hayır"}</b>
              </p>
            </>
          ) : (
            <p className="panel-empty">Odada kaplumbağa yok.</p>
          )}
        </section>

        <section className="cell cell-experiments">
          <h2>Dene: altı deney</h2>
          <p className="hint">Önce soruyu oku, odayı izle, sonra &quot;Cevabı göster&quot;e bas. Odaya kendi lamba ve engellerini de koyabilirsin.</p>
          <div className="presets">
            {EXPERIMENTS.map((e) => (
              <button key={e.id} className={deneyId === e.id ? "active" : ""} onClick={() => yukle(e.id)}>{e.ad}</button>
            ))}
          </div>
          <p className="question">{deney.soru}</p>
          <p className="watch-note"><b>Neyi izle?</b> {deney.izle}</p>
          <details key={deney.id} className="answer">
            <summary>Cevabı göster</summary>
            <p>{deney.sonuc}</p>
          </details>
        </section>

        <section className="cell cell-legend">
          <h2>Odada neler var?</h2>
          <ul className="legend-list">
            <li><span className="sw sw-lamp" />Sarı parlak nokta: lamba</li>
            <li><span className="sw sw-box" />Gri kutu: engel</li>
            <li><span className="sw sw-hutch" />Mavi çerçeve: şarj kulübesi (içinde çok parlak bir lamba var)</li>
            <li><span className="sw sw-mirror" />Açık mavi çizgi: ayna</li>
            <li><span className="sw sw-eye" />Beyaz nokta ve soluk dilim: dönen göz ve baktığı yer</li>
            <li><span className="sw sw-pilot" />Yeşil nokta: gösterge lambası yanık</li>
            <li><span className="sw sw-ring" />Robotun çevresindeki halka: o anki davranışı (renk anlamı sağdaki panelde)</li>
          </ul>
        </section>

        <section className="cell cell-rules">
          <h2>Beş kural: bütün &quot;zekâsı&quot; bu kadar</h2>
          <ol className="rules">
            {KURALLAR.map((k) => (
              <li key={k.no}>
                <span className="rule-no">{k.no}</span>
                <div>
                  <h3>{k.ad}</h3>
                  <p>{k.ne}</p>
                  <p className="rule-like">{k.gibi}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="rules-note">Bunların hiçbiri plan ya da hafıza değil. Robot her an yalnızca o anda gördüğü ışığa ve kabuğunun değip değmediğine bakıyor. Karmaşık görünen davranış, bu kuralların odayla çarpışmasından çıkıyor.</p>
        </section>

        <section className="cell cell-limits">
          <h2>Bu benzetmenin sınırları</h2>
          <p>
            Buradaki kaplumbağa Walter'ın devresinin birebir kopyası değil; kaynaklarda anlatılan davranışlara dayanan basit bir model. Hızlar,
            &quot;ne kadar parlak çok parlaktır&quot; eşiği ve pilin boşalma hızı bu projenin ayarlarıdır. Gerçek robotlar tüplü devrelerle çalışıyordu ve her
            zaman beklendiği gibi davranmıyordu: 1951'de bir gösteri gününde Elmer tepkisiz kalmıştı. Gösterge lambasının aynadaki dansı da
            robotun &quot;kendini tanıması&quot; değil, iki kuralın birbirini tetiklemesi.
          </p>
        </section>

        <section className="cell cell-src">
          <h2>Kaynaklar</h2>
          <ul className="plain">
            {KAYNAKLAR.map(([ad, url]) => (
              <li key={url}><a href={url} target="_blank" rel="noreferrer">{ad}</a></li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function ozet(world, watchedRef) {
  const izlenen = world.tortoises.find((k) => k.id === watchedRef.current) ?? world.tortoises[0] ?? null;
  watchedRef.current = izlenen ? izlenen.id : null;
  return {
    sure: world.time,
    izlenen,
    watchedId: watchedRef.current,
    liste: world.tortoises.map((k) => ({ id: k.id, name: k.name })),
  };
}
