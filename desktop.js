// หน้าแนะนำตัวแบบหน้าจอ PC: หน้าต่างเด้งขึ้นทีละบาน · ลากได้ · ย่อ/ขยาย/ปิด · แถบงาน · เมนู start · นาฬิกา
(() => {
  "use strict";

  const desk = document.querySelector("[data-desktop]");
  if (!desk) return;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const roomy = matchMedia("(min-width: 901px)");
  const wins = [...desk.querySelectorAll(".desk-win")];
  const tasks = desk.querySelector("[data-tasks]");
  let z = 10;

  const say = (title, text) => {
    // ใช้แจ้งเตือนของ fun.js ถ้ามี ไม่งั้นเงียบไว้
    const box = document.querySelector(".toasts");
    if (!box) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = '<div class="toast-bar"><span></span><i>×</i></div><p></p>';
    t.querySelector("span").textContent = title;
    t.querySelector("p").textContent = text;
    box.append(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 2600);
  };

  // ---------- ปุ่มบนแถบงาน ----------
  const taskBtn = new Map();
  wins.forEach((w) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "task";
    b.textContent = w.dataset.title;
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
    let t = 200;
    lines.forEach((l) => {
      setTimeout(() => l.classList.add("tl-in"), t);
      t += l.classList.contains("sh") ? 420 : 260;
    });
  }

  function open(w) {
    w.classList.remove("is-min", "is-closed");
    w.classList.add("is-open");
    taskBtn.get(w).hidden = false;
    front(w);
    typeLines(w);
  }
  function minimize(w) {
    w.classList.add("is-min");
    w.classList.remove("is-front");
    taskBtn.get(w).classList.remove("on");
  }
  function close(w) {
    w.classList.remove("is-open", "is-max", "is-front");
    w.classList.add("is-closed");
    taskBtn.get(w).hidden = true;
  }

  // ---------- ปุ่ม _ □ × ----------
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
  });

  // ---------- ลากหน้าต่างด้วยแถบชื่อ (เฉพาะจอกว้าง) ----------
  wins.forEach((w) => {
    const handle = w.querySelector(".win-bar, .dialog-head");
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
        const x = Math.min(Math.max(ev.clientX - d.left - dx, -r.width + 80), d.width - 80);
        const y = Math.min(Math.max(ev.clientY - d.top - dy, 0), d.height - 80);
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

  // ---------- ไอคอนบนเดสก์ท็อป ----------
  desk.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => open(document.getElementById(b.dataset.open))));
  desk.querySelector("[data-bin]")?.addEventListener("click", () => say("ถังขยะ", "goto.c ถูกทิ้งตั้งแต่ปี 1968 — Dijkstra ไม่ให้กู้คืน"));

  // ---------- เมนู start ----------
  const startBtn = desk.querySelector("[data-start]");
  const menu = desk.querySelector(".start-menu");
  const toggleMenu = (show) => {
    menu.hidden = !show;
    startBtn.setAttribute("aria-expanded", String(show));
  };
  startBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(menu.hidden); });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) toggleMenu(false); });
  menu.querySelector("[data-shutdown]").addEventListener("click", () => { toggleMenu(false); say("ปิดเครื่อง", "ยังปิดไม่ได้ วันนี้ยังอีกยาว 2 ชั่วโมงครึ่ง"); });
  document.addEventListener("click", (e) => { if (!menu.hidden && !e.target.closest(".start-menu")) toggleMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { toggleMenu(false); startBtn.focus(); } });

  // ---------- นาฬิกาบนแถบงาน (เวลาเครื่องผู้ชม) ----------
  const clock = desk.querySelector("[data-clock]");
  const tick = () => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    clock.dateTime = now.toISOString();
  };
  tick();
  setInterval(tick, 15000);

  // ---------- เลื่อนมาถึง: หน้าต่างเด้งขึ้นทีละบาน ----------
  desk.classList.add("booting");
  wins.forEach((w) => w.classList.add("is-closed"));
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    desk.classList.remove("booting");
    wins.forEach((w, i) => setTimeout(() => open(w), reduceMotion ? 0 : 450 + i * 750));
  }, { threshold: 0.35 });
  io.observe(desk);
})();
