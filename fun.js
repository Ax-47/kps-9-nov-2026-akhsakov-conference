// ลูกเล่นเสริมของเว็บ (ไม่มีไฟล์นี้ เนื้อหาก็ยังครบ)
// - แถบยุคในไทม์ไลน์: ไฮไลต์ยุคที่กำลังดู + กดกระโดดไปยุคนั้น
// - ตัวเลขนับขึ้น · คำยักษ์สลับตัวอักษร · คลิกแล้วมีพิกเซลกระจาย · หน้าต่างเอียงตามเมาส์
// - ปุ่ม _ □ × ของหน้าต่างกดได้ · แจ้งเตือนตอนเข้าแต่ละ Part · ไข่อีสเตอร์จากการพิมพ์
(() => {
  "use strict";

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ===================== แจ้งเตือนแบบหน้าต่าง Y2K =====================
  const toastBox = document.createElement("div");
  toastBox.className = "toasts";
  toastBox.setAttribute("role", "status");
  toastBox.setAttribute("aria-live", "polite");
  document.body.append(toastBox);
  function toast(title, text, ms = 2600) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<div class="toast-bar"><span></span><i>×</i></div><p></p>`;
    t.querySelector(".toast-bar span").textContent = title;
    t.querySelector("p").textContent = text;
    toastBox.append(t);
    while (toastBox.children.length > 3) toastBox.firstElementChild.remove();
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, ms);
  }

  // ===================== แถบยุคในไทม์ไลน์ =====================
  document.querySelectorAll(".era-run").forEach((run) => {
    const track = run.querySelector(".hscroll-track");
    const dividers = [...run.querySelectorAll(".era-divider")];
    const links = [...run.querySelectorAll("[data-era-link]")];
    const first = track.firstElementChild;
    const xOf = (el) => el.offsetLeft - first.offsetLeft;
    let active = "";

    function update() {
      const mid = window.innerWidth * 0.5;
      let era = dividers[0]?.dataset.era || "0";
      for (const d of dividers) if (d.getBoundingClientRect().left <= mid) era = d.dataset.era;
      if (era === active) return;
      active = era;
      links.forEach((a) => a.classList.toggle("on", a.dataset.eraLink === era));
      run.dataset.era = era;
    }

    links.forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      const d = run.querySelector(`#era-${a.dataset.eraLink}`);
      if (!d) return;
      const behavior = reduceMotion ? "auto" : "smooth";
      if (run.classList.contains("pinned")) {
        // แถบตรึงอยู่: เลื่อนหน้าลงเท่าระยะที่การ์ดอยู่ห่างจากต้นแถบ
        const top = run.getBoundingClientRect().top + window.scrollY;
        const dist = run.offsetHeight - window.innerHeight;
        window.scrollTo({ top: top + Math.min(xOf(d), dist) + 1, behavior });
      } else {
        track.scrollTo({ left: xOf(d), behavior });
      }
    }));
    addEventListener("scroll", update, { passive: true });
    track.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
  });

  // ===================== ตัวเลขนับขึ้นตอนเห็น =====================
  const counters = document.querySelectorAll(".bignums b, .stat .big, .timer-time");
  const countIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      countIO.unobserve(e.target);
      const el = e.target;
      const m = el.textContent.match(/^(\D*)(\d+)(.*)$/);
      if (!m || reduceMotion || el.classList.contains("timer-time")) continue;
      const [, pre, num, post] = m;
      const target = parseInt(num, 10);
      const t0 = performance.now();
      const dur = 1100;
      (function step(now) {
        const k = Math.min(1, (now - t0) / dur);
        const v = Math.round(target * (1 - Math.pow(1 - k, 3)));
        el.textContent = `${pre}${v}${post}`;
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }
  }, { threshold: 0.6 });
  counters.forEach((el) => countIO.observe(el));

  // ===================== คำยักษ์สลับตัวอักษรแบบแฮกเกอร์ =====================
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>/";
  function scramble(el) {
    if (reduceMotion || el.dataset.busy) return;
    const final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    el.dataset.busy = "1";
    let frame = 0;
    const total = 18;
    (function tick() {
      frame++;
      el.textContent = [...final].map((ch, i) => {
        if (ch === " ") return ch;
        return frame / total > i / final.length ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }).join("");
      if (frame < total) setTimeout(tick, 40);
      else { el.textContent = final; delete el.dataset.busy; }
    })();
  }
  const scrambleIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { scramble(e.target); scrambleIO.unobserve(e.target); }
  }, { threshold: 0.5 });
  document.querySelectorAll(".mega, .era-big b").forEach((el) => {
    if (!el.matches(".mega")) scrambleIO.observe(el); // .mega ใช้แอนิเมชันตัวอักษรลอยขึ้นด้านล่างแทน
    el.addEventListener("pointerenter", () => scramble(el));
  });

  // ===================== คลิกแล้วมีพิกเซลกระจาย =====================
  if (!reduceMotion) {
    document.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("input, textarea, select")) return;
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("i");
        s.className = "burst";
        const ang = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
        const r = 26 + Math.random() * 26;
        s.style.left = `${e.clientX}px`;
        s.style.top = `${e.clientY}px`;
        s.style.setProperty("--dx", `${Math.cos(ang) * r}px`);
        s.style.setProperty("--dy", `${Math.sin(ang) * r}px`);
        s.textContent = i % 2 ? "■" : "✦";
        document.body.append(s);
        setTimeout(() => s.remove(), 650);
      }
    });
  }

  // ===================== การ์ดเอียงตามเมาส์ =====================
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".card, .mem, .dialog, .works > div, .block .win:not(.game)").forEach((el) => {
      if (el.closest("[data-desktop]") || el.querySelector("[data-viz]")) return;
      el.classList.add("tilt");
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
      });
      el.addEventListener("pointerleave", () => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
    });
  }

  // ===================== ปุ่ม _ □ × ของหน้าต่าง =====================
  const NOPE = ["ปิดไม่ได้ ต้องเรียนก่อน", "Access denied: ยังไม่ได้ save ความรู้", "หน้าต่างนี้ own โดย Rust ห้ามปิด", "segfault: core dumped (ล้อเล่น)"];
  let nope = 0;
  document.querySelectorAll(".win-btns").forEach((btns) => {
    if (btns.closest("[data-desktop]")) return; // หน้าต่างบนเดสก์ท็อปใช้ desktop.js
    const win = btns.closest(".win, .panel, .game");
    const [minBtn, maxBtn, closeBtn] = btns.querySelectorAll("i");
    if (!win || !closeBtn) return;
    btns.classList.add("live");
    minBtn.title = "ย่อ";
    maxBtn.title = "ขยาย";
    closeBtn.title = "ปิด";
    minBtn.addEventListener("click", () => win.classList.toggle("minimized"));
    maxBtn.addEventListener("click", () => {
      if (win.closest(".hscroll.pinned")) { toast("window.exe", "แถบนี้เลื่อนด้านข้างอยู่ ขยายไม่ได้นะ"); return; }
      win.classList.toggle("maximized");
    });
    closeBtn.addEventListener("click", () => {
      win.classList.remove("nope");
      void win.offsetWidth;
      win.classList.add("nope");
      toast("ERROR", NOPE[nope++ % NOPE.length]);
    });
  });

  // ===================== แจ้งเตือนตอนเข้าแต่ละ Part =====================
  const PARTS = {
    part1: ["history.exe", "Part 1 loaded · ย้อนดู 4 ยุคของภาษา"],
    part2: ["start.exe", "Part 2 loaded · เลือกภาษาแรกกัน"],
    break: ["break.exe", "สมองกำลังพัก… อย่าเพิ่งปิดเครื่อง"],
    part3: ["brain.exe", "Part 3 loaded · ความจำทำงานยังไง"],
    part4: ["practice.exe", "Part 4 loaded · ซ้อมให้เป็นทักษะ"],
    qa: ["qa.exe", "ยินดีด้วย อ่านจบแล้ว ✦"],
  };
  const seen = new Set();
  const partIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting || seen.has(e.target.id)) continue;
      seen.add(e.target.id);
      const [title, text] = PARTS[e.target.id];
      toast(title, text);
    }
  }, { threshold: 0.35 });
  Object.keys(PARTS).forEach((id) => { const el = document.getElementById(id); if (el) partIO.observe(el); });

  // ===================== ไข่อีสเตอร์: พิมพ์คำลับ =====================
  let typed = "";
  const EGGS = {
    rust() {
      const crab = document.createElement("div");
      crab.className = "crab";
      crab.textContent = "🦀";
      crab.setAttribute("aria-hidden", "true");
      document.body.append(crab);
      setTimeout(() => crab.remove(), 6200);
      toast("cargo run", "Ferris มาเยี่ยม! ownership checked ✓");
    },
    goto() {
      document.body.classList.remove("shake");
      void document.body.offsetWidth;
      document.body.classList.add("shake");
      setTimeout(() => document.body.classList.remove("shake"), 900);
      toast("Dijkstra, 1968", "Go To Statement Considered Harmful");
    },
    sleep() {
      const z = document.createElement("div");
      z.className = "sleep-overlay";
      z.innerHTML = "<p>💤 กำลัง save ความจำ…</p>";
      document.body.append(z);
      setTimeout(() => { z.classList.add("out"); setTimeout(() => z.remove(), 500); }, 2200);
    },
    sudo() { toast("sudo", "ขอโทษ คุณไม่อยู่ในไฟล์ sudoers เหตุการณ์นี้จะถูกรายงาน 🙀"); },
    hello() { toast("hello.c", "printf(\"Hello, น้อง ๆ!\\n\");"); },
  };
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    if (e.target.closest("input, textarea, [contenteditable], [data-game]")) return;
    typed = (typed + e.key.toLowerCase()).slice(-8);
    for (const word of Object.keys(EGGS)) {
      if (typed.endsWith(word)) { typed = ""; EGGS[word](); break; }
    }
  });

  // ===================== แอนิเมชันหัวข้อ =====================
  // หัวข้อไทย: แถบสีกวาดผ่านแล้วข้อความโผล่ · คำยักษ์อังกฤษ: ตัวอักษรลอยขึ้นทีละตัว
  // ป้ายเล็ก (kicker): พิมพ์ออกมาแบบเครื่องพิมพ์ดีด · แถบ ///// เลื่อนเข้า
  if (!reduceMotion) {
    const headIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("h-in");
        headIO.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -10% 0px" });

    document.querySelectorAll(".title, .giant, .display").forEach((el) => {
      if (el.closest(".hero, dialog")) return;
      const wipe = document.createElement("span");
      wipe.className = "wipe";
      const text = document.createElement("span");
      text.className = "wipe-text";
      while (el.firstChild) text.append(el.firstChild);
      const bar = document.createElement("span");
      bar.className = "wipe-bar";
      bar.setAttribute("aria-hidden", "true");
      wipe.append(text, bar);
      el.append(wipe);
      el.classList.add("h-wipe");
      headIO.observe(el);
    });

    document.querySelectorAll(".mega").forEach((el) => {
      const word = el.textContent.trim();
      el.setAttribute("aria-label", word);
      el.textContent = "";
      [...word].forEach((ch, i) => {
        const span = document.createElement("span");
        span.className = "ch";
        span.style.setProperty("--i", i);
        span.textContent = ch;
        span.setAttribute("aria-hidden", "true");
        el.append(span);
      });
      el.classList.add("h-letters");
      headIO.observe(el);
    });

    document.querySelectorAll(".kicker, .part-tag").forEach((el) => {
      if (el.closest(".hero, dialog")) return;
      el.classList.add("h-type");
      headIO.observe(el);
    });

    // พิมพ์บรรทัดใน terminal แนะนำตัวทีละบรรทัด
    document.querySelectorAll("[data-type-lines]").forEach((box) => {
      if (box.closest("[data-desktop]")) return; // desktop.js พิมพ์เองตอนหน้าต่างเปิด
      const lines = [...box.children];
      lines.forEach((l) => l.classList.add("tl"));
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        lines.forEach((l, i) => setTimeout(() => l.classList.add("tl-in"), 250 + i * (l.classList.contains("sh") ? 420 : 260)));
      }, { threshold: 0.4 });
      io.observe(box);
    });
  }
})();

// หน้าต่าง OOP แบบ HSR: เปิดทับไทม์ไลน์ ปิดแล้วอยู่ที่เดิม
(() => {
  const dlg = document.getElementById("oop-hsr");
  if (!dlg || !dlg.showModal) return;
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-oop]")) { e.preventDefault(); dlg.showModal(); dlg.scrollTop = 0; }
    if (e.target.closest("[data-close-oop]")) dlg.close();
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  if (location.hash === "#oop-hsr") dlg.showModal();
})();

// popup ทั่วไป: data-open-dlg="id" เปิด, data-close-dlg ปิด
(() => {
  document.addEventListener("click", (e) => {
    const o = e.target.closest("[data-open-dlg]");
    if (o) { const d = document.getElementById(o.dataset.openDlg); if (d?.showModal) { d.showModal(); d.querySelector(".oop-dlg-body").scrollTop = 0; } }
    const c = e.target.closest("[data-close-dlg]");
    if (c) c.closest("dialog")?.close();
    if (e.target.matches("dialog.oop-dialog")) e.target.close();
  });
})();
