"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Slide } from "@/lib/deck";

const W = 1920;
const H = 1080;

type Props = { title: string; slides: Slide[] };

function readHash(total: number): number {
  if (typeof window === "undefined") return 0;
  const m = window.location.hash.match(/slide-(\d+)/);
  const n = m ? parseInt(m[1], 10) - 1 : 0;
  return Math.min(Math.max(n, 0), total - 1);
}

/** สไลด์ 1 หน้า ย่อ/ขยายให้พอดีกล่องที่ครอบ */
function SlideView({ slide, scale, animate }: { slide: Slide; scale: number; animate: boolean }) {
  return (
    <div className="slide-frame" style={{ width: W * scale, height: H * scale }}>
      <div
        className={`slide-canvas${animate ? " slide-enter" : " no-build"}`}
        style={{ transform: `scale(${scale})` }}
        dangerouslySetInnerHTML={{ __html: slide.html }}
      />
    </div>
  );
}

export default function Deck({ title, slides }: Props) {
  const total = slides.length;
  const [index, setIndex] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [scale, setScale] = useState(0.5);
  const [idle, setIdle] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  useEffect(() => { setCanFullscreen(!!document.fullscreenEnabled); }, []);
  const stageRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  // เริ่มที่สไลด์ตาม #slide-N และตามปุ่ม back/forward ของเบราว์เซอร์
  useEffect(() => {
    setIndex(readHash(total));
    const onHash = () => setIndex(readHash(total));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [total]);

  const go = useCallback(
    (n: number) => {
      const next = Math.min(Math.max(n, 0), total - 1);
      setIndex(next);
      const hash = `#slide-${next + 1}`;
      if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
    },
    [total],
  );

  // ย่อขยายสไลด์ให้พอดีจอ
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setScale(Math.max(0.05, Math.min(r.width / W, r.height / H)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [notesOpen]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }, []);

  // คีย์ลัด
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      switch (e.key) {
        case "ArrowRight": case "PageDown": case " ": case "Enter":
          if (overviewOpen) return;
          e.preventDefault(); go(index + 1); break;
        case "ArrowLeft": case "PageUp": case "Backspace":
          if (overviewOpen) return;
          e.preventDefault(); go(index - 1); break;
        case "Home": e.preventDefault(); go(0); break;
        case "End": e.preventDefault(); go(total - 1); break;
        case "n": case "N": setNotesOpen((v) => !v); break;
        case "o": case "O": case "g": case "G": setOverviewOpen((v) => !v); break;
        case "f": case "F": toggleFullscreen(); break;
        case "Escape": setOverviewOpen(false); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, total, overviewOpen, toggleFullscreen]);

  // ซ่อนแถบควบคุมเมื่อไม่ขยับเมาส์ 2.5 วินาที
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 2500);
    };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    window.addEventListener("touchstart", wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("touchstart", wake);
    };
  }, []);

  const slide = slides[index];
  const next = slides[index + 1];

  return (
    <div className={`viewer${idle && !notesOpen && !overviewOpen ? " is-idle" : ""}`}>
      <h1 className="sr-only">{title}</h1>
      <main className="viewer-main">
        <div
          ref={stageRef}
          className="stage"
          role="region"
          aria-roledescription="slide"
          aria-label={`สไลด์ ${index + 1} จาก ${total}: ${slide.title}`}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) return;
            if (window.getSelection()?.toString()) return;
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            go(e.clientX - r.left < r.width / 3 ? index - 1 : index + 1);
          }}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 40) { e.preventDefault(); go(dx < 0 ? index + 1 : index - 1); }
          }}
        >
          <SlideView key={slide.id} slide={slide} scale={scale} animate />
        </div>

        {notesOpen && (
          <aside className="notes" aria-label="โน้ตผู้พูด">
            <div className="notes-head">
              <span>โน้ตผู้พูด · สไลด์ {index + 1}</span>
              <button type="button" onClick={() => setNotesOpen(false)} aria-label="ปิดโน้ต">×</button>
            </div>
            <p className="notes-body">{slide.notes || "— ไม่มีโน้ต —"}</p>
            {next && <p className="notes-next">ถัดไป: {next.title}</p>}
          </aside>
        )}
      </main>

      <div className="progress" aria-hidden="true">
        <div style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <nav className="toolbar" aria-label="ควบคุมสไลด์">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="สไลด์ก่อนหน้า">‹</button>
        <span className="counter">{index + 1} / {total}</span>
        <button type="button" onClick={() => go(index + 1)} disabled={index === total - 1} aria-label="สไลด์ถัดไป">›</button>
        <span className="slide-title" title={slide.title}>{slide.title}</span>
        <button type="button" className={notesOpen ? "on" : ""} onClick={() => setNotesOpen((v) => !v)} aria-pressed={notesOpen}>
          โน้ต <kbd>N</kbd>
        </button>
        <button type="button" onClick={() => setOverviewOpen(true)}>
          ทุกหน้า <kbd>O</kbd>
        </button>
        {canFullscreen && (
          <button type="button" onClick={toggleFullscreen}>
            เต็มจอ <kbd>F</kbd>
          </button>
        )}
      </nav>

      {overviewOpen && (
        <div className="overview" role="dialog" aria-modal="true" aria-label="สไลด์ทั้งหมด">
          <div className="overview-head">
            <span>สไลด์ทั้งหมด {total} หน้า</span>
            <button type="button" onClick={() => setOverviewOpen(false)} aria-label="ปิด">×</button>
          </div>
          <div className="overview-grid">
            {slides.map((s) => (
              <Fragment key={s.id}>
                {s.section && <p className="overview-section">{s.section}</p>}
                <button
                  type="button"
                  className={`thumb${s.index === index ? " current" : ""}`}
                  onClick={() => { go(s.index); setOverviewOpen(false); }}
                  aria-label={`ไปสไลด์ ${s.index + 1}: ${s.title}`}
                >
                  <SlideView slide={s} scale={0.125} animate={false} />
                  <span className="thumb-label">{s.index + 1}. {s.title}</span>
                </button>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
