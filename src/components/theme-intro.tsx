"use client";

import { useEffect, useRef, useState } from "react";
import type { Theme } from "@/lib/products";

// Full-screen logo video that plays before the theme actually switches.
export function ThemeIntro({ theme, onSwitch, onClose }: { theme: Theme; onSwitch: () => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const finished = useRef(false);
  const [leaving, setLeaving] = useState(false);

  function finish() {
    if (finished.current) return;
    finished.current = true;
    onSwitch();
    setLeaving(true);
    window.setTimeout(onClose, 750);
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    const v = video.current;
    if (v) {
      v.muted = false;
      v.play().catch(() => { v.muted = true; v.play().catch(finish); });
    }
    const safety = window.setTimeout(finish, 7000); // never get stuck if the video can't load
    return () => { window.clearTimeout(safety); document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className={`theme-intro ${leaving ? "leaving" : ""}`} role="dialog" aria-label={`Entering ${theme} collection`}>
    <video ref={video} src={`/videos/intro-${theme}.mp4`} playsInline preload="auto" onEnded={finish} onError={finish} />
    <button className="intro-skip" onClick={finish}>SKIP</button>
  </div>;
}
