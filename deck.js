// ตัวเปิดสไลด์แบบเว็บล้วน ไม่มี framework
// 1. แปลงแต่ละ <section> ใน #slides ให้แสดงผลได้ (x-icon, x-shape, x-connector, โน้ตใน <aside>)
// 2. วางสไลด์เรียงเป็นแถวแนวนอน เลื่อนลื่น ๆ มีแรงเฉื่อย ล้อเมาส์/ทัชแพด/นิ้ว ทุกทิศพาไปด้านข้าง แล้วจอดที่สไลด์ใกล้สุด
// 3. ปุ่มลัด โน้ตผู้พูด ดูทุกหน้า เต็มจอ และลิงก์ #slide-N
(() => {
  "use strict";

  const W = 1920;
  const H = 1080;
  const ICONS = window.DECK_ICONS || {};
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ===================== แปลงสไลด์ =====================

  const SHAPES = {
    "arrow-right": "polygon(0 25%, 60% 25%, 60% 0, 100% 50%, 60% 100%, 60% 75%, 0 75%)",
    "arrow-left": "polygon(100% 25%, 40% 25%, 40% 0, 0 50%, 40% 100%, 40% 75%, 100% 75%)",
    "arrow-up": "polygon(25% 100%, 25% 40%, 0 40%, 50% 0, 100% 40%, 75% 40%, 75% 100%)",
    "arrow-down": "polygon(25% 0, 25% 60%, 0 60%, 50% 100%, 100% 60%, 75% 60%, 75% 0)",
    diamond: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
  };

  function styleMap(style) {
    const out = {};
    for (const part of (style || "").split(";")) {
      const i = part.indexOf(":");
      if (i < 0) continue;
      out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
    }
    return out;
  }

  function styleString(map) {
    return Object.entries(map).map(([k, v]) => `${k}:${v}`).join(";");
  }

  function fromHtml(html) {
    const t = document.createElement("template");
    t.innerHTML = html;
    return t.content.firstElementChild;
  }

  let markerSeq = 0;

  function connectorSvg(el) {
    const a = (name, fallback) => el.getAttribute(name) ?? fallback;
    const st = styleMap(el.getAttribute("style"));
    const color = st.color || "#000000";
    const width = parseFloat(st["border-width"] || "2") || 2;
    const borderStyle = st["border-style"] || "";
    const dash = /dashed/.test(borderStyle) ? `stroke-dasharray="${width * 3} ${width * 2}"`
      : /dotted/.test(borderStyle) ? `stroke-dasharray="${width} ${width * 1.5}" stroke-linecap="round"` : "";
    const head = a("head", "end");
    const startKind = a("head-start", head === "both" ? "filled" : "none");
    const endKind = a("head-end", head === "none" ? "none" : "filled");
    const size = 8 + width * 2;
    const id = `m${++markerSeq}`;
    const marker = (kind, name) =>
      kind === "none" ? "" :
        `<marker id="${id}${name}" markerUnits="userSpaceOnUse" markerWidth="${size}" markerHeight="${size}" ` +
        `viewBox="0 0 10 10" refX="9" refY="5" orient="auto-start-reverse">` +
        (kind === "open"
          ? `<path d="M1 1 L9 5 L1 9" fill="none" stroke="${color}" stroke-width="1.6"/>`
          : `<path d="M0 0 L10 5 L0 10 Z" fill="${color}"/>`) + `</marker>`;
    const [x1, y1, x2, y2] = ["x1", "y1", "x2", "y2"].map((k) => a(k, "0"));
    const route = a("route", "straight");
    const line = route === "straight"
      ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"`
      : `<polyline fill="none" points="${route === "vh" ? `${x1},${y1} ${x1},${y2} ${x2},${y2}` : `${x1},${y1} ${x2},${y1} ${x2},${y2}`}"`;
    return fromHtml(
      `<svg class="x-connector" aria-hidden="true" style="position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none">` +
      `<defs>${marker(startKind, "s")}${marker(endKind, "e")}</defs>` +
      `${line} stroke="${color}" stroke-width="${width}" ${dash} ` +
      `${startKind !== "none" ? `marker-start="url(#${id}s)"` : ""} ${endKind !== "none" ? `marker-end="url(#${id}e)"` : ""}/></svg>`,
    );
  }

  function iconSvg(el) {
    const body = ICONS[el.getAttribute("name")] || ICONS.circle || "";
    const style = styleString({ display: "block", flex: "none", ...styleMap(el.getAttribute("style")) });
    return fromHtml(
      `<svg aria-hidden="true" style="${style}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" ` +
      `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`,
    );
  }

  function shapeDiv(el) {
    const kind = el.getAttribute("kind") || "rect";
    const st = styleMap(el.getAttribute("style"));
    if (kind === "ellipse") st["border-radius"] = "50%";
    else if (kind === "rounded") st["border-radius"] = st["border-radius"] || "24px";
    else if (kind === "line") {
      const color = st.background || st.color || "#000000";
      st.background = "transparent";
      st["border-top"] = st.border || `2px solid ${color}`;
      delete st.border;
    } else if (SHAPES[kind]) st["clip-path"] = SHAPES[kind];
    const div = document.createElement("div");
    div.className = "x-shape";
    div.dataset.kind = kind;
    div.setAttribute("style", styleString(st));
    return div;
  }

  const isPinned = (el) => /position\s*:\s*absolute/.test(el.getAttribute("style") || "");

  /** แปลง <section> ต้นฉบับให้เบราว์เซอร์แสดงได้เหมือนเดคจริง แล้วคืนโน้ตผู้พูด */
  function transform(section) {
    const asides = [...section.children].filter((c) => c.tagName === "ASIDE");
    const notes = asides.map((a) => a.textContent.trim()).join("\n\n");
    asides.forEach((a) => a.remove());

    // ในเดคจริง ลูกที่มาทีหลังทับลูกที่มาก่อนเสมอ ให้ลูกแบบ flow เป็น position:relative จะได้ทับกันตามลำดับเหมือนกัน
    for (const el of section.children) {
      const style = el.getAttribute("style") || "";
      if (isPinned(el) || el.tagName === "X-CONNECTOR" || /position\s*:\s*relative/.test(style)) continue;
      const pinnedInside = [...el.querySelectorAll("*")].some((d) => isPinned(d) || d.tagName === "X-CONNECTOR");
      if (!pinnedInside) el.setAttribute("style", `position:relative;${style}`);
    }

    // <div> หรือ <section> ที่ไม่ได้ตั้ง display = คอลัมน์ (กติกาของเดค)
    for (const el of [section, ...section.querySelectorAll("section, div")]) {
      const style = el.getAttribute("style") || "";
      if (!/(^|;)\s*display\s*:/.test(style)) el.setAttribute("style", `display:flex;flex-direction:column;${style}`);
    }

    section.querySelectorAll("x-connector").forEach((el) => el.replaceWith(connectorSvg(el)));
    section.querySelectorAll("x-icon").forEach((el) => el.replaceWith(iconSvg(el)));
    section.querySelectorAll("x-shape").forEach((el) => el.replaceWith(shapeDiv(el)));
    section.querySelectorAll("img").forEach((img) => {
      img.loading = "lazy";
      img.draggable = false;
    });
    section.querySelectorAll("[data-build-in]").forEach((el) => {
      const [kind, order] = el.getAttribute("data-build-in").split(/\s+/);
      el.dataset.build = kind || "fade";
      el.style.setProperty("--build-order", String(Number(order) || 1));
      el.removeAttribute("data-build-in");
    });

    section.dataset.slide = section.id;
    section.removeAttribute("id");
    section.removeAttribute("hidden");
    return notes;
  }

  function titleOf(section, fallback) {
    const h = section.querySelector("h1, h2");
    if (!h) return fallback;
    const copy = h.cloneNode(true);
    copy.querySelectorAll("br").forEach((br) => br.replaceWith(" "));
    return copy.textContent.replace(/\s+/g, " ").trim() || fallback;
  }

  /** กล่องย่อขยายสไลด์: .frame (ขนาดหลังย่อ) > .canvas (ผืน 1920×1080 ที่ scale ลง) > section */
  function framed(section) {
    const frame = document.createElement("div");
    frame.className = "frame";
    const canvas = document.createElement("div");
    canvas.className = "canvas";
    canvas.append(section);
    frame.append(canvas);
    return frame;
  }

  // ===================== สร้างแถบสไลด์ =====================

  const track = document.getElementById("slides");
  const strip = document.createElement("div");
  strip.className = "strip";
  const slides = [...track.querySelectorAll(":scope > section")].map((section, index) => {
    const id = section.id || `slide-${index + 1}`;
    const part = section.dataset.part;
    const notes = transform(section);
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.setAttribute("role", "group");
    slot.setAttribute("aria-roledescription", "slide");
    slot.append(framed(section));
    strip.append(slot);
    const title = titleOf(section, id);
    slot.setAttribute("aria-label", `สไลด์ ${index + 1}: ${title}`);
    return { index, id, title, notes, part, slot, section };
  });
  track.append(strip);
  const total = slides.length;
  track.classList.add("ready");

  // ===================== สถานะ + หน้าจอ =====================

  const $ = (id) => document.getElementById(id);
  const ui = {
    counter: $("counter"),
    title: $("slide-title"),
    bar: $("progress-bar"),
    notes: $("notes"),
    notesLabel: $("notes-label"),
    notesBody: $("notes-body"),
    notesNext: $("notes-next"),
    overview: $("overview"),
    grid: $("overview-grid"),
    prev: document.querySelector('[data-action="prev"]'),
    next: document.querySelector('[data-action="next"]'),
    notesBtn: document.querySelector('.toolbar [data-action="notes"]'),
    fullBtn: document.querySelector('[data-action="fullscreen"]'),
  };

  let current = -1; // หน้าที่อยู่ตรงกลางจอตอนนี้ (เปลี่ยนระหว่างเลื่อน)
  let target = 0;   // หน้าที่กำลังจะไปหยุด

  const clamp = (n) => Math.min(Math.max(n, 0), total - 1);

  function render(i) {
    if (i === current) return;
    current = i;
    const s = slides[i];
    ui.counter.textContent = `${i + 1} / ${total}`;
    ui.title.textContent = s.title;
    ui.title.title = s.title;
    ui.prev.disabled = i === 0;
    ui.next.disabled = i === total - 1;
    ui.notesLabel.textContent = `โน้ตผู้พูด · สไลด์ ${i + 1}`;
    ui.notesBody.textContent = s.notes || "— ไม่มีโน้ต —";
    ui.notesNext.textContent = slides[i + 1] ? `ถัดไป: ${slides[i + 1].title}` : "";
  }

  // ===================== เครื่องเลื่อนแนวนอน =====================
  // แถบสไลด์ขยับด้วย transform ไม่ใช่ scrollbar: ทุกการเลื่อน (ล้อเมาส์ ทัชแพด นิ้ว ปุ่ม) แค่ย้าย "goal"
  // แล้วทุกเฟรมตำแหน่งจริง "pos" ค่อย ๆ ไหลตามไปแบบมีแรงเฉื่อย พอหยุดมือก็ไหลไปจอดที่สไลด์ใกล้สุด

  let step = 1;     // ระยะห่างสไลด์ละหน้า (px)
  let center = 0;   // ระยะจากขอบซ้ายถึงกึ่งกลางจอ
  let pos = 0;      // ตำแหน่งที่แสดงอยู่ (px ตามแนวแถบ)
  let goal = 0;     // ตำแหน่งที่กำลังไหลไปหา
  let anchor = 0;   // สไลด์ที่อยู่ตอนเริ่มเลื่อนรอบนี้ ใช้ตัดสินว่าจะจอดหน้าไหน
  let frame = 0;
  let lastTime = 0;
  let idleTimer = 0;

  const maxPos = () => (total - 1) * step;
  const clampPos = (x) => Math.min(Math.max(x, 0), maxPos());

  /** ขยับเกินครึ่งทางไม่จำเป็น: เลื่อนไปทางไหนเกิน 10% ของหน้า ก็จอดหน้าถัดไปทางนั้นเลย */
  function snapIndex(x) {
    const rel = x / step;
    if (rel > anchor) return clamp(Math.ceil(rel - 0.1));
    if (rel < anchor) return clamp(Math.floor(rel + 0.1));
    return anchor;
  }

  function paint() {
    strip.style.transform = `translate3d(${(center - step / 2 - pos).toFixed(2)}px,0,0)`;
    ui.bar.style.width = `${((pos / Math.max(1, maxPos())) * (total - 1) + 1) / total * 100}%`;
    const at = pos / step;
    render(clamp(Math.round(at)));
    // สไลด์ข้าง ๆ ย่อและจางลงนิดหน่อย ให้รู้ว่าหน้าไหนอยู่ตรงกลาง
    const from = Math.max(0, Math.floor(at) - 2);
    const to = Math.min(total - 1, Math.ceil(at) + 2);
    for (let i = from; i <= to; i++) {
      const d = i - at;
      const a = Math.min(Math.abs(d), 1.5);
      const s = slides[i];
      s.slot.style.setProperty("--k", (1 - a * 0.07).toFixed(4));
      s.slot.style.setProperty("--o", (1 - a * 0.4).toFixed(3));
    }
  }

  function tick(now) {
    const dt = Math.min(64, now - (lastTime || now));
    lastTime = now;
    const ease = reduceMotion ? 1 : 1 - Math.exp(-dt / 110);
    pos += (goal - pos) * ease;
    if (Math.abs(goal - pos) < 0.4) pos = goal;
    paint();
    if (pos !== goal || dragging) frame = requestAnimationFrame(tick);
    else { frame = 0; lastTime = 0; settle(); }
  }

  function run() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  /** หยุดสนิทแล้ว: เล่นแอนิเมชันของสไลด์นั้น และจำหน้าไว้ใน URL */
  function settle() {
    const i = clamp(Math.round(pos / step));
    target = anchor = i;
    slides[i].slot.classList.add("seen");
    const hash = `#slide-${i + 1}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }

  function go(n, smooth = true) {
    target = anchor = clamp(n);
    goal = target * step;
    clearTimeout(idleTimer);
    if (!smooth || reduceMotion) { pos = goal; paint(); settle(); return; }
    run();
  }

  /** หยุดมือ: ไหลไปจอดที่สไลด์ */
  function snapSoon(delay) {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => go(snapIndex(goal)), delay);
  }

  // ย่อขยายสไลด์ให้พอดีจอ สไลด์ข้าง ๆ โผล่ให้เห็นขอบ และคงหน้าเดิมไว้ตอนเปลี่ยนขนาดจอ
  function fit() {
    const w = track.clientWidth;
    const h = track.clientHeight;
    const peek = w > 700 ? 0.82 : 0.9;
    const s = Math.max(0.05, Math.min((w * peek) / W, (h - 32) / H));
    track.style.setProperty("--s", s.toFixed(4));
    step = W * s + Math.max(16, w * 0.03);
    track.style.setProperty("--step", `${step.toFixed(2)}px`);
    center = w / 2;
    pos = goal = target * step;
    paint();
  }
  new ResizeObserver(fit).observe(track);
  fit();

  // ===================== เมาส์ / ทัชแพด / นิ้ว =====================

  // ล้อเมาส์หรือทัชแพด ทั้งแนวตั้งและแนวนอน = เลื่อนแถบไปด้านข้าง (ลง/ขวา = ไปหน้าถัดไป)
  track.addEventListener("wheel", (e) => {
    if (e.ctrlKey) return; // ปล่อยให้ซูมได้
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? step : 1;
    const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit;
    goal = clampPos(goal + delta * 1.6);
    run();
    snapSoon(140);
  }, { passive: false });

  // นิ้ว: ลากตามนิ้วทันที ปัดได้ทั้งแนวนอนและแนวตั้ง ปล่อยแล้วไหลต่อตามแรงปัด
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let velocity = 0;
  let axis = "";
  track.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    dragging = true;
    moved = false;
    axis = "";
    lastX = t.clientX;
    lastY = t.clientY;
    lastT = performance.now();
    velocity = 0;
    clearTimeout(idleTimer);
    goal = pos;
  }, { passive: true });

  track.addEventListener("touchmove", (e) => {
    if (!dragging || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = lastX - t.clientX;
    const dy = lastY - t.clientY;
    if (!axis && Math.hypot(dx, dy) > 6) axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    if (!axis) return;
    e.preventDefault();
    moved = true;
    const now = performance.now();
    const d = axis === "x" ? dx : dy;
    velocity = d / Math.max(1, now - lastT);
    lastX = t.clientX;
    lastY = t.clientY;
    lastT = now;
    pos = goal = clampPos(pos + d);
    paint();
  }, { passive: false });

  function endTouch() {
    if (!dragging) return;
    dragging = false;
    if (!moved) return;
    go(snapIndex(clampPos(pos + velocity * 180)));
  }
  track.addEventListener("touchend", endTouch);
  track.addEventListener("touchcancel", endTouch);

  // คลิก/แตะด้านซ้าย 1/3 = ย้อน, ที่เหลือ = ถัดไป (ไม่นับตอนเพิ่งลากนิ้ว)
  track.addEventListener("click", (e) => {
    if (moved) { moved = false; return; }
    if (e.target.closest("a") || getSelection().toString()) return;
    const r = track.getBoundingClientRect();
    go(e.clientX - r.left < r.width / 3 ? target - 1 : target + 1);
  });

  // ===================== ปุ่ม =====================

  function toggleNotes(force) {
    const open = force ?? ui.notes.hidden;
    ui.notes.hidden = !open;
    ui.notesBtn.setAttribute("aria-pressed", String(open));
  }

  function buildOverview() {
    if (ui.grid.childElementCount) return;
    for (const s of slides) {
      if (s.part) {
        const p = document.createElement("p");
        p.className = "overview-section";
        p.textContent = s.part;
        ui.grid.append(p);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "thumb";
      btn.dataset.index = String(s.index);
      btn.setAttribute("aria-label", `ไปสไลด์ ${s.index + 1}: ${s.title}`);
      const copy = s.section.cloneNode(true);
      copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      btn.append(framed(copy));
      const label = document.createElement("span");
      label.className = "thumb-label";
      label.textContent = `${s.index + 1}. ${s.title}`;
      btn.append(label);
      ui.grid.append(btn);
    }
  }

  function openOverview() {
    buildOverview();
    ui.grid.querySelectorAll(".thumb").forEach((t) => t.classList.toggle("current", Number(t.dataset.index) === current));
    ui.overview.showModal();
    ui.grid.querySelector(".thumb.current")?.scrollIntoView({ block: "center" });
  }

  ui.grid.addEventListener("click", (e) => {
    const t = e.target.closest(".thumb");
    if (!t) return;
    ui.overview.close();
    go(Number(t.dataset.index), false);
  });

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }
  ui.fullBtn.hidden = !document.fullscreenEnabled;

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    switch (btn.dataset.action) {
      case "prev": go(target - 1); break;
      case "next": go(target + 1); break;
      case "notes": toggleNotes(); break;
      case "overview": openOverview(); break;
      case "overview-close": ui.overview.close(); break;
      case "fullscreen": toggleFullscreen(); break;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.("input, textarea, [contenteditable]")) return;
    const overviewOpen = ui.overview.open;
    switch (e.key) {
      case "ArrowRight": case "ArrowDown": case "PageDown": case " ": case "Enter":
        if (overviewOpen || (e.key === "Enter" && e.target.closest("button"))) return;
        e.preventDefault(); go(target + 1); break;
      case "ArrowLeft": case "ArrowUp": case "PageUp": case "Backspace":
        if (overviewOpen) return;
        e.preventDefault(); go(target - 1); break;
      case "Home": if (!overviewOpen) { e.preventDefault(); go(0); } break;
      case "End": if (!overviewOpen) { e.preventDefault(); go(total - 1); } break;
      case "n": case "N": toggleNotes(); break;
      case "o": case "O": case "g": case "G":
        if (overviewOpen) ui.overview.close(); else openOverview();
        break;
      case "f": case "F": toggleFullscreen(); break;
    }
  });

  // ซ่อนแถบควบคุมเมื่อไม่ขยับเมาส์ 2.5 วินาที
  let hideTimer;
  function wake() {
    document.body.classList.remove("is-idle");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (ui.notes.hidden && !ui.overview.open) document.body.classList.add("is-idle");
    }, 2500);
  }
  ["mousemove", "keydown", "touchstart"].forEach((t) => addEventListener(t, wake, { passive: true }));
  wake();

  // ===================== เริ่มที่ #slide-N =====================

  function fromHash() {
    const m = location.hash.match(/slide-(\d+)/);
    return m ? clamp(parseInt(m[1], 10) - 1) : 0;
  }
  addEventListener("hashchange", () => go(fromHash(), false));

  go(fromHash(), false);
  track.focus({ preventScroll: true });
})();
