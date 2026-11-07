// ลูกเล่นของหน้าเว็บ เขียนด้วย JavaScript ล้วน ไม่มี library
// - สีพื้นเปลี่ยนตามส่วนที่อยู่กลางจอ + บอกว่าอยู่หัวข้อไหน
// - แถบ .hscroll: เลื่อนลง = เนื้อหาเลื่อนไปด้านข้าง (เฉพาะจอกว้าง จอเล็กใช้ปัดซ้าย-ขวาเอง)
// - ตัวอักษรใหญ่วิ่งตามการเลื่อน, ของค่อย ๆ โผล่, แท็บโค้ด, เกมจำตัวเลข, นาฬิกาจับเวลาพัก
(() => {
  "use strict";

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wide = matchMedia("(min-width: 761px) and (min-height: 560px)");
  const clamp01 = (n) => Math.min(1, Math.max(0, n));

  // ===================== ไฮไลต์โค้ดแบบง่าย: คอมเมนต์ สตริง =====================
  const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  document.querySelectorAll("pre.code code").forEach((el) => {
    if (el.closest(".tree")) return;
    const src = el.textContent;
    const token = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)')/g;
    let out = "";
    let last = 0;
    for (const m of src.matchAll(token)) {
      out += escapeHtml(src.slice(last, m.index));
      out += `<span class="${m[1] ? "c" : "s"}">${escapeHtml(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    el.innerHTML = out + escapeHtml(src.slice(last));
  });

  // ===================== ของค่อย ๆ โผล่ตอนเลื่อนมาถึง =====================
  const revealer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      revealer.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => revealer.observe(el));

  // ===================== แถบเลื่อนด้านข้าง =====================
  const runs = [...document.querySelectorAll(".hscroll")].map((section) => ({
    section,
    sticky: section.querySelector(".hscroll-sticky"),
    track: section.querySelector(".hscroll-track"),
    bar: section.querySelector(".hscroll-progress i"),
    dist: 0,
  }));

  function layoutRuns() {
    for (const r of runs) {
      if (wide.matches) {
        r.section.classList.add("pinned");
        r.dist = Math.max(0, r.track.scrollWidth - window.innerWidth);
        r.section.style.height = `${window.innerHeight + r.dist}px`;
      } else {
        r.section.classList.remove("pinned");
        r.section.style.height = "";
        r.track.style.transform = "";
        r.dist = 0;
      }
    }
  }

  function updateRuns() {
    for (const r of runs) {
      if (!r.dist) {
        if (!wide.matches && r.bar) {
          const max = r.track.scrollWidth - r.track.clientWidth;
          r.bar.style.width = `${max > 0 ? (r.track.scrollLeft / max) * 100 : 0}%`;
        }
        continue;
      }
      const p = clamp01(-r.section.getBoundingClientRect().top / r.dist);
      r.track.style.transform = `translate3d(${(-p * r.dist).toFixed(1)}px,0,0)`;
      if (r.bar) r.bar.style.width = `${p * 100}%`;
    }
  }
  runs.forEach((r) => r.track.addEventListener("scroll", updateRuns, { passive: true }));

  // ===================== ตัวอักษรวิ่งตามการเลื่อน =====================
  const marquees = [...document.querySelectorAll(".marquee")].map((el) => ({
    el,
    row: el.querySelector(".marquee-row"),
    speed: parseFloat(el.dataset.speed || "0.3"),
  }));

  function updateMarquees() {
    if (reduceMotion) return;
    for (const m of marquees) {
      const rect = m.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      const half = m.row.scrollWidth / 2;
      const shift = (window.innerHeight - rect.top) * m.speed;
      const x = -((((shift % half) + half) % half));
      m.row.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    }
  }

  // ===================== สีพื้น + หัวข้อปัจจุบัน + แถบอ่าน =====================
  const themed = [...document.querySelectorAll("main > [data-bg], footer[data-bg]")];
  const nowLabel = document.getElementById("now");
  const readbar = document.getElementById("readbar");
  const menuLinks = [...document.querySelectorAll(".menu a")];
  const partOf = (label) => (label.match(/^0(\d)/) || [])[1];

  function updateTheme() {
    const y = window.innerHeight * 0.45;
    const hit = themed.find((el) => {
      const r = el.getBoundingClientRect();
      return r.top <= y && r.bottom > y;
    });
    if (hit) {
      if (document.body.dataset.bg !== hit.dataset.bg) document.body.dataset.bg = hit.dataset.bg;
      const label = hit.dataset.label || "";
      if (nowLabel.textContent !== label) {
        nowLabel.textContent = label;
        const part = partOf(label);
        menuLinks.forEach((a) => a.setAttribute("aria-current", String(a.hash === `#part${part}`)));
      }
    }
    const max = document.documentElement.scrollHeight - window.innerHeight;
    readbar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  }

  // ===================== วนอัปเดตทีละเฟรมตอนเลื่อน =====================
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateRuns();
      updateMarquees();
      updateTheme();
    });
  }
  function onResize() {
    layoutRuns();
    onScroll();
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onResize);
  wide.addEventListener("change", onResize);
  // ฟอนต์โหลดเสร็จแล้วความกว้างเปลี่ยน คำนวณใหม่
  document.fonts?.ready.then(onResize);
  addEventListener("load", onResize);
  onResize();

  // ===================== หน้าแรก: ขยับตามเมาส์/การเลื่อน + พิมพ์ข้อความ =====================
  const hero = document.querySelector(".hero");
  if (hero) {
    const globe = hero.querySelector(".deco-globe");
    if (reduceMotion) {
      globe?.pauseAnimations?.();
    } else {
      hero.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const r = hero.getBoundingClientRect();
        hero.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        hero.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
      hero.addEventListener("pointerleave", () => { hero.style.setProperty("--mx", "0"); hero.style.setProperty("--my", "0"); });
      const onHeroScroll = () => {
        if (window.scrollY < window.innerHeight * 1.2) hero.style.setProperty("--sy", window.scrollY.toFixed(0));
      };
      addEventListener("scroll", onHeroScroll, { passive: true });

      // พิมพ์ tagline ทีละตัวหลังหน้าต่างเปิด (ข้อความเต็มอยู่ใน HTML อยู่แล้ว)
      const tag = hero.querySelector(".tagline");
      if (tag) {
        const nodes = [];
        const walk = document.createTreeWalker(tag, NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) nodes.push({ node: walk.currentNode, text: walk.currentNode.nodeValue });
        nodes.forEach((n) => { n.node.nodeValue = ""; });
        tag.classList.add("typing");
        let ni = 0;
        let ci = 0;
        setTimeout(function type() {
          if (ni >= nodes.length) { tag.classList.remove("typing"); return; }
          const n = nodes[ni];
          ci += 2;
          n.node.nodeValue = n.text.slice(0, ci);
          if (ci >= n.text.length) { ni++; ci = 0; }
          setTimeout(type, 28);
        }, 1500);
      }
    }
  }

  // ===================== แท็บโค้ด =====================
  document.querySelectorAll("[data-tabs]").forEach((box) => {
    const tabs = [...box.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t, false));
      t.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (step) { e.preventDefault(); select(tabs[(i + step + tabs.length) % tabs.length], true); }
        if (e.key === "Home") { e.preventDefault(); select(tabs[0], true); }
        if (e.key === "End") { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
  });

  // ===================== เกมจำตัวเลข (chunking) =====================
  document.querySelectorAll("[data-chunk]").forEach((box) => {
    const digits = box.querySelector(".chunk-digits");
    const start = box.querySelector("[data-chunk-start]");
    const reveal = box.querySelector("[data-chunk-reveal]");
    const msg = box.querySelector(".chunk-msg");
    const NUMBERS = "1 9 7 2 1 9 9 5 2 0 1 5";
    let timer = 0;

    start.addEventListener("click", () => {
      clearInterval(timer);
      let left = 10;
      digits.textContent = NUMBERS;
      digits.dataset.state = "show";
      reveal.hidden = true;
      start.disabled = true;
      msg.textContent = `จำให้ได้… เหลือ ${left} วินาที`;
      timer = setInterval(() => {
        left -= 1;
        if (left > 0) { msg.textContent = `จำให้ได้… เหลือ ${left} วินาที`; return; }
        clearInterval(timer);
        digits.textContent = "● ● ● ● ● ● ● ● ● ● ● ●";
        digits.dataset.state = "hidden";
        msg.textContent = "หมดเวลา! หลับตา แล้วลองท่องกลับให้ครบ 12 ตัว ได้กี่ตัว?";
        reveal.hidden = false;
        start.disabled = false;
        start.textContent = "ลองอีกรอบ";
      }, 1000);
    });

    reveal.addEventListener("click", () => {
      digits.textContent = "1972 · 1995 · 2015";
      digits.dataset.state = "show";
      msg.textContent = "12 ตัวแยกกัน = เกินที่ short-term จุได้ (ราว 4 ก้อน) แต่พอจับเป็น 3 ก้อนที่มีความหมาย — ปีเกิดของ C, Java และ Rust — จำง่ายขึ้นทันที นี่คือ chunking";
      reveal.hidden = true;
    });
  });
  // ===================== นาฬิกาจับเวลาพัก =====================
  document.querySelectorAll("[data-timer]").forEach((box) => {
    const out = box.querySelector(".timer-time");
    const btn = box.querySelector("[data-timer-start]");
    const total = parseInt(box.dataset.timer, 10) || 600;
    const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    let timer = 0;
    let endAt = 0;
    const stop = (label) => { clearInterval(timer); timer = 0; btn.textContent = label; };
    btn.addEventListener("click", () => {
      if (timer) { stop("เริ่มจับเวลาพัก"); out.textContent = fmt(total); return; }
      endAt = Date.now() + total * 1000;
      btn.textContent = "หยุด / เริ่มใหม่";
      const tick = () => {
        const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
        out.textContent = fmt(left);
        if (!left) { stop("พักอีกรอบ"); out.textContent = "RESTART!"; }
      };
      tick();
      timer = setInterval(tick, 250);
    });
  });
})();
