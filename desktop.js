// หน้าแนะนำตัวแบบคอมพิวเตอร์จริง:
// เปิดเครื่อง (โลโก้ + วงหมุน) → เดสก์ท็อป → หน้าต่างเด้งขึ้นทีละบาน
// หน้าต่างลากได้ · ย่อ/ขยาย/ปิด · แถบงานพร้อมไอคอนแอป · เมนู start · คลิกขวา · นาฬิกาและวันที่
(() => {
  "use strict";

  const desk = document.querySelector("[data-desktop]");
  if (!desk) return;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const roomy = matchMedia("(min-width: 901px)");
  const wins = [...desk.querySelectorAll(".desk-win")];
  const tasks = desk.querySelector("[data-tasks]");
  const ctx = desk.querySelector(".ctx-menu");
  const startBtn = desk.querySelector("[data-start]");
  const menu = desk.querySelector(".start-menu");
  let z = 10;

  function say(title, text) {
    const box = document.querySelector(".toasts");
    if (!box) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = '<div class="toast-bar"><span></span><i>×</i></div><p></p>';
    t.querySelector("span").textContent = title;
    t.querySelector("p").textContent = text;
    box.append(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 2800);
  }

  // ---------- ปุ่มแอปบนแถบงาน ----------
  const taskBtn = new Map();
  wins.forEach((w) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "task";
    b.title = w.dataset.title;
    b.setAttribute("aria-label", w.dataset.title);
    const ico = w.querySelector(".app-ico");
    if (ico) b.append(ico.cloneNode(true));
    b.hidden = true;
    b.addEventListener("click", () => {
      if (w.classList.contains("is-open") && !w.classList.contains("is-min") && w.classList.contains("is-front")) minimize(w);
      else open(w);
    });
    tasks.append(b);
    taskBtn.set(w, b);
  });

  function front(w) {
    wins.forEach((x) => { x.classList.remove("is-front"); taskBtn.get(x).classList.remove("on"); });
    w.style.zIndex = String(++z);
    w.classList.add("is-front");
    taskBtn.get(w).classList.add("on");
  }

  function typeLines(w) {
    const box = w.querySelector("[data-type-lines]");
    if (!box || box.dataset.typed) return;
    box.dataset.typed = "1";
    if (reduceMotion) return;
    const lines = [...box.children];
    lines.forEach((l) => l.classList.add("tl"));
    let t = 250;
    lines.forEach((l) => {
      setTimeout(() => l.classList.add("tl-in"), t);
      t += l.classList.contains("sh") ? 420 : 260;
    });
  }

  function open(w) {
    w.classList.remove("is-min", "is-closed");
    w.classList.add("is-open");
    const b = taskBtn.get(w);
    b.hidden = false;
    b.classList.add("running");
    front(w);
    typeLines(w);
  }
  function minimize(w) {
    w.classList.add("is-min");
    w.classList.remove("is-front");
    taskBtn.get(w).classList.remove("on");
  }
  function close(w) {
    w.classList.remove("is-open", "is-max", "is-front", "is-min");
    w.classList.add("is-closed");
    const b = taskBtn.get(w);
    b.hidden = true;
    b.classList.remove("on", "running");
  }

  wins.forEach((w) => {
    w.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === "min") minimize(w);
        if (act === "max") { w.classList.toggle("is-max"); front(w); }
        if (act === "close") close(w);
      });
    });
    w.addEventListener("pointerdown", () => front(w));
    w.querySelector(".win-bar").addEventListener("dblclick", (e) => {
      if (e.target.closest("[data-act]")) return;
      w.classList.toggle("is-max");
    });
  });

  // ---------- ลากหน้าต่างด้วยแถบชื่อ (เฉพาะจอกว้าง) ----------
  wins.forEach((w) => {
    const handle = w.querySelector(".win-bar");
    handle.addEventListener("pointerdown", (e) => {
      if (!roomy.matches || e.button !== 0 || e.target.closest("[data-act]") || w.classList.contains("is-max")) return;
      e.preventDefault();
      const d = desk.getBoundingClientRect();
      const r = w.getBoundingClientRect();
      const dx = e.clientX - r.left;
      const dy = e.clientY - r.top;
      handle.setPointerCapture(e.pointerId);
      w.classList.add("dragging");
      const move = (ev) => {
        const x = Math.min(Math.max(ev.clientX - d.left - dx, -r.width + 90), d.width - 90);
        const y = Math.min(Math.max(ev.clientY - d.top - dy, 0), d.height - 90);
        w.style.setProperty("--x", `${x}px`);
        w.style.setProperty("--y", `${y}px`);
      };
      const up = () => {
        w.classList.remove("dragging");
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    });
  });

  // ---------- เมนู start ----------
  function toggleMenu(show) {
    menu.hidden = !show;
    startBtn.setAttribute("aria-expanded", String(show));
    startBtn.classList.toggle("on", show);
  }
  startBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(menu.hidden); });
  desk.querySelector("[data-start-search]")?.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(true); });
  menu.addEventListener("click", (e) => { if (e.target.closest("a, [data-open]")) toggleMenu(false); });
  menu.querySelector("[data-shutdown]").addEventListener("click", () => { toggleMenu(false); say("ปิดเครื่อง", "ยังปิดไม่ได้ วันนี้ยังอีกยาว 2 ชั่วโมงครึ่ง"); });

  // ---------- คลิกขวาบนเดสก์ท็อป ----------
  function hideCtx() { ctx.hidden = true; }
  desk.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".desk-win, .taskbar, .start-menu")) return;
    e.preventDefault();
    const d = desk.getBoundingClientRect();
    ctx.hidden = false;
    const x = Math.min(e.clientX - d.left, d.width - ctx.offsetWidth - 6);
    const y = Math.min(e.clientY - d.top, d.height - ctx.offsetHeight - 54);
    ctx.style.left = `${x}px`;
    ctx.style.top = `${y}px`;
  });
  ctx.addEventListener("click", hideCtx);
  ctx.querySelector("[data-refresh]").addEventListener("click", () => {
    wins.forEach(close);
    popUp();
  });
  ctx.querySelector("[data-about]").addEventListener("click", () => say("เกี่ยวกับเครื่องนี้", "GUIDE-PC · CPU: สมอง 1 ก้อน · RAM (short-term): ~4 chunks · Storage (long-term): แทบไม่จำกัด"));

  document.addEventListener("click", (e) => {
    if (!menu.hidden && !e.target.closest(".start-menu")) toggleMenu(false);
    if (!ctx.hidden && !e.target.closest(".ctx-menu")) hideCtx();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!menu.hidden) { toggleMenu(false); startBtn.focus(); }
    hideCtx();
  });

  // ---------- ไอคอน / ปุ่มเปิดแอป ----------
  desk.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => open(document.getElementById(b.dataset.open))));
  desk.querySelector("[data-bin]")?.addEventListener("click", () => say("ถังขยะ", "มี 1 ไฟล์: goto.c — ถูกทิ้งตั้งแต่ปี 1968 Dijkstra ไม่ให้กู้คืน"));

  // ---------- นาฬิกาและวันที่ (เวลาเครื่องผู้ชม) ----------
  const clock = desk.querySelector("[data-clock]");
  const dateEl = desk.querySelector("[data-date]");
  function tick() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    clock.dateTime = now.toISOString();
    if (dateEl) dateEl.textContent = now.toLocaleDateString("th-TH", { day: "numeric", month: "numeric", year: "numeric" });
  }
  tick();
  setInterval(tick, 15000);

  // ---------- เปิดเครื่อง แล้วหน้าต่างเด้งขึ้น ----------
  function popUp() {
    wins.forEach((w, i) => setTimeout(() => open(w), reduceMotion ? 0 : 350 + i * 700));
  }
  wins.forEach((w) => w.classList.add("is-closed"));
  desk.classList.add("off");
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    if (reduceMotion) { desk.classList.remove("off"); popUp(); return; }
    desk.classList.replace("off", "booting");
    setTimeout(() => { desk.classList.remove("booting"); popUp(); }, 1700);
  }, { threshold: 0.4 });
  io.observe(desk);
})();
