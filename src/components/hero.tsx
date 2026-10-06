"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";

const classicLooks = [
  { title: "THE LINEN EDIT", detail: "Easy, breathable, effortless.", image: "/images/hero-look-1.png" },
  { title: "THE OXBLOOD EDIT", detail: "A little edge. A lot of you.", image: "/images/hero-look-2.png" },
  { title: "THE KNIT POLO EDIT", detail: "Less effort. More you.", image: "/images/hero-look-3.png" },
];

const monsterLooks = [
  { title: "THE WAFFLE EDIT", detail: "Texture that bites back.", image: "/images/monster/hero-look-1.png" },
  { title: "THE STARBOY EDIT", detail: "Main character after dark.", image: "/images/monster/hero-look-2.png" },
  { title: "THE NIGHT CREATURE EDIT", detail: "Loud. Layered. Unbothered.", image: "/images/monster/hero-look-3.png" },
];

export function Hero({ theme = "classic" }: { theme?: "classic" | "monster" }) {
  const looks = theme === "monster" ? monsterLooks : classicLooks;
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    if (media.matches) setPlaying(false);
    const change = () => { setReducedMotion(media.matches); if (media.matches) setPlaying(false); };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    const timer = window.setTimeout(() => setActive((value) => (value + 1) % looks.length), 5800);
    return () => window.clearTimeout(timer);
  }, [active, playing, reducedMotion]);

  function changeLook(direction: number) {
    setActive((value) => (value + direction + looks.length) % looks.length);
  }

  return (
    <section className="hero" aria-label="NIKHATU new season collection" onPointerMove={(event) => {
      if (reducedMotion || event.pointerType === "touch") return;
      const rect = event.currentTarget.getBoundingClientRect();
      setTilt({ x: ((event.clientX - rect.left) / rect.width - .5) * 5, y: ((event.clientY - rect.top) / rect.height - .5) * -3 });
    }} onPointerLeave={() => setTilt({ x: 0, y: 0 })} style={{ "--rotate-x": `${tilt.y}deg`, "--rotate-y": `${tilt.x}deg` } as CSSProperties}>
      <div className="hero-top-note"><span className="eyebrow">{theme === "monster" ? <>UNLEASH THE<br />MONSTER IN YOU.</> : <>FASHION THAT<br />MOVES WITH YOU.</>}</span><span className="short-rule" /></div>
      <div className="hero-edition"><span className="new-dot" /> A NEW PERSPECTIVE<br /><span>{theme === "monster" ? "THE MONSTER DROP" : "THE 2026 COLLECTION"}</span></div>
      <div className="hero-depth">
        {theme === "monster" ? <h1 className="hero-wordmark hero-logo" aria-label="NIKHATU"><img src="/images/monster/logo.png" alt="NIKHATU" /></h1> : <h1 className="hero-wordmark hero-logo classic" aria-label="NIKHATU"><img src="/images/logo-classic.png" alt="NIKHATU" /></h1>}
        <div className="model-stage">
          <div className="model-shadow" />
          {looks.map((look, index) => <img key={look.image} className={`hero-model ${active === index ? "is-active" : ""}`} src={look.image} fetchPriority={index === 0 ? "high" : "low"} decoding="async" alt={`NIKHATU model wearing ${look.title.toLowerCase()}`} aria-hidden={active !== index} />)}
          <span className="look-caption" key={active}><span className="caption-dot" /> LOOK 0{active + 1} — {looks[active].title.replace("THE ", "").replace(" EDIT", "")}</span>
        </div>
      </div>
      <div className="hero-copy"><p>{theme === "monster" ? <>Distressed denim. Gothic prints.<br />Built for the night.</> : <>Rooted in India.<br />Ready for everywhere.</>}</p><div className="hero-actions"><Link className="button button-dark" href="/shop">{theme === "monster" ? "SHOP THE MONSTER DROP" : "SHOP THE COLLECTION"} <ArrowRight size={16} /></Link><Link className="underlined-link" href="/shop?sort=new">EXPLORE NEW IN <ArrowUpRightSmall /></Link></div></div>
      <div className="look-controls"><div className="look-heading"><span className="look-title">{looks[active].title}</span><span className="look-count">0{active + 1}<span> / 03</span></span></div><div className="look-controls-bottom"><div className="look-bars">{looks.map((_, index) => <button key={index} aria-label={`View outfit ${index + 1}`} aria-pressed={active === index} onClick={() => setActive(index)} className={`look-bar ${active === index ? "active" : ""}`}><span key={`${index}-${active}`} className={active === index && playing ? "progress-fill" : ""} /></button>)}</div><div className="look-arrows"><button aria-label="Previous outfit" onClick={() => changeLook(-1)}><ArrowLeft size={17} /></button><button aria-label={playing ? "Pause outfit slideshow" : "Play outfit slideshow"} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={12} /> : <Play size={12} />}</button><button aria-label="Next outfit" onClick={() => changeLook(1)}><ArrowRight size={17} /></button></div></div></div>
      <div className="hero-bottom"><a href="#categories"><ArrowDown size={13} /> SCROLL TO DISCOVER</a><span>THOUGHTFULLY DESIGNED. EFFORTLESSLY YOU.</span></div>
    </section>
  );
}

function ArrowUpRightSmall() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.3" /></svg>;
}
