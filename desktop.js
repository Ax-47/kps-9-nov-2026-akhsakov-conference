// หน้าแนะนำตัว: หน้าต่างรีโมตเดสก์ท็อปที่เชื่อมไปยังคอมของผู้พูด (ธีมแบบ XP)
// เชื่อมต่อ → เคอร์เซอร์ของ Misha คลิกไอคอน → หน้าต่างเด้งขึ้นทีละบาน
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
    setTimeout(popUp, 0);
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

  // ---------- รีโมตเดสก์ท็อป: เชื่อมต่อ → เคอร์เซอร์ของ Misha คลิกเปิดหน้าต่างทีละบาน ----------
  const rd = desk.closest("[data-rd]");
  const $ = (sel) => (rd || desk).querySelector(sel);
  const msg = $("[data-rd-msg]");
  const stateEl = $("[data-rd-state]");
  const statusEl = $("[data-rd-status]");
  const pingEl = $("[data-rd-ping]");
  const timeEl = $("[data-rd-time]");
  const fpsEl = $("[data-rd-fps]");
  const again = $("[data-rd-reconnect]");
  const cursor = desk.querySelector(".remote-cursor");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let session = 0;      // เปลี่ยนทุกครั้งที่เชื่อมต่อ/ตัด เพื่อยกเลิกขั้นตอนเก่า
  let timers = [];

  function popUp() {
    wins.forEach((w, i) => setTimeout(() => open(w), reduceMotion ? 0 : 350 + i * 700));
  }

  function setState(kind, text) {
    if (statusEl) statusEl.dataset.state = kind;
    if (stateEl) stateEl.textContent = text;
  }

  function startMeters() {
    const t0 = Date.now();
    const fmt = (n) => String(n).padStart(2, "0");
    timers.push(setInterval(() => {
      const sec = Math.floor((Date.now() - t0) / 1000);
      if (timeEl) timeEl.textContent = `${fmt(Math.floor(sec / 3600))}:${fmt(Math.floor(sec / 60) % 60)}:${fmt(sec % 60)}`;
    }, 1000));
    timers.push(setInterval(() => {
      if (pingEl) pingEl.textContent = `${10 + Math.floor(Math.random() * 9)} ms`;
      if (fpsEl) fpsEl.textContent = `${56 + Math.floor(Math.random() * 5)} fps`;
    }, 1200));
    if (pingEl) pingEl.textContent = "12 ms";
    if (timeEl) timeEl.textContent = "00:00:00";
  }
  function stopMeters() { timers.forEach(clearInterval); timers = []; }

  async function moveCursorTo(el, id) {
    if (!cursor || !el) return;
    const d = desk.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    cursor.style.setProperty("--cx", `${r.left - d.left + r.width * 0.5}px`);
    cursor.style.setProperty("--cy", `${r.top - d.top + r.height * 0.45}px`);
    await wait(650);
    if (id !== session) return;
    cursor.classList.remove("click");
    void cursor.offsetWidth;
    cursor.classList.add("click");
    el.classList.add("selected");
    setTimeout(() => el.classList.remove("selected"), 500);
  }

  async function connect() {
    const id = ++session;
    stopMeters();
    wins.forEach(close);
    if (again) again.hidden = true;
    if (reduceMotion) {
      desk.classList.remove("off", "booting");
      setState("on", "เชื่อมต่อแล้ว");
      startMeters();
      popUp();
      return;
    }
    desk.classList.remove("off");
    desk.classList.add("booting");
    setState("wait", "กำลังเชื่อมต่อ");
    msg.textContent = "กำลังเชื่อมต่อ misha-pc…";
    await wait(1000); if (id !== session) return;
    msg.textContent = "รอเครื่องปลายทางยอมรับ…";
    await wait(900); if (id !== session) return;
    msg.textContent = "เชื่อมต่อแล้ว ✓";
    setState("on", "เชื่อมต่อแล้ว");
    startMeters();
    await wait(500); if (id !== session) return;
    desk.classList.remove("booting");
    if (cursor) {
      cursor.classList.add("show");
      cursor.style.setProperty("--cx", "70%");
      cursor.style.setProperty("--cy", "70%");
    }
    await wait(400);
    for (const w of wins) {
      if (id !== session) return;
      await moveCursorTo(desk.querySelector(`.desk-icons [data-open="${w.id}"]`), id);
      if (id !== session) return;
      open(w);
      await wait(450);
    }
    if (cursor && id === session) {
      cursor.style.setProperty("--cx", "62%");
      cursor.style.setProperty("--cy", "78%");
      await wait(1600);
      if (id === session) cursor.classList.remove("show");
    }
  }

  function disconnect() {
    session++;
    stopMeters();
    toggleMenu(false);
    hideCtx();
    wins.forEach(close);
    cursor?.classList.remove("show");
    desk.classList.remove("booting");
    desk.classList.add("off");
    msg.textContent = "การเชื่อมต่อสิ้นสุด";
    setState("off", "ตัดการเชื่อมต่อแล้ว");
    if (pingEl) pingEl.textContent = "";
    if (fpsEl) fpsEl.textContent = "— fps";
    if (again) again.hidden = false;
  }
  again?.addEventListener("click", connect);

  (rd || document).querySelectorAll("[data-rd-act]").forEach((b) => b.addEventListener("click", () => {
    const act = b.dataset.rdAct;
    if (act === "chat") say("Misha", "สวัสดีน้อง ๆ 👋 ยินดีที่ได้รู้จักนะ");
    if (act === "keys") say("Ctrl+Alt+Del", "ส่งไปแล้ว… แต่เครื่องนี้ไม่ยอมล็อก เพราะยังสอนไม่จบ");
    if (act === "full" && rd) toggleFull();
    if (act === "disconnect") disconnect();
  }));


  // ---------- เต็มจอ: ใช้ Fullscreen API ถ้ามี ไม่งั้น (เช่น iPhone) ขยายเต็มหน้าต่างเบราว์เซอร์ด้วย CSS ----------
  const fullBtns = rd ? [...rd.querySelectorAll('[data-rd-act="full"]')] : [];
  function setFullUI(on) {
    rd.classList.toggle("is-full", on);
    document.documentElement.classList.toggle("rd-lock", on);
    fullBtns.forEach((b) => {
      b.setAttribute("aria-pressed", String(on));
      const label = b.querySelector("span");
      if (label) label.textContent = on ? "ออกจากเต็มจอ" : "เต็มจอ";
      else b.textContent = on ? "✕ ออกจากเต็มจอ" : "⛶ ดูเต็มจอ";
    });
  }
  function toggleFull() {
    const on = rd.classList.contains("is-full");
    if (on) {
      if (document.fullscreenElement) document.exitFullscreen();
      setFullUI(false);
      return;
    }
    setFullUI(true);
    if (rd.requestFullscreen) rd.requestFullscreen().catch(() => {});
  }
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && rd?.classList.contains("is-full")) setFullUI(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && rd?.classList.contains("is-full") && !document.fullscreenElement) setFullUI(false);
  });
  desk.addEventListener("dblclick", (e) => {
    if (!rd || e.target.closest(".desk-win, .taskbar, .start-menu, .ctx-menu, button, a")) return;
    toggleFull();
  });

  // ---------- เลื่อนมาถึงแล้วเริ่มเชื่อมต่อ ----------
  wins.forEach((w) => w.classList.add("is-closed"));
  desk.classList.add("off");
  setState("off", "ยังไม่เชื่อมต่อ");
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    connect();
  }, { threshold: 0.4 });
  io.observe(desk);
})();
