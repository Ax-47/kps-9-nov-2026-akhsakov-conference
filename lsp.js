// โค้ดแบบมี Language Server (เหมือน VS Code): ชี้ = ดูชนิดและที่มา · คลิก = ไปที่นิยาม + ไฮไลต์ทุกจุดที่ใช้
// ข้อมูลสัญลักษณ์เขียนไว้ตรงนี้ (ไม่ได้ต่อ language server จริง)
(() => {
  "use strict";

  const CODE = `class Character {                       // แม่: ของที่ทุกตัวละครต้องมี
protected:
    int hp = 100;
public:
    void takeDamage(int d) { hp = std::max(0, hp - d); }
    virtual int atk() { return 10; }    // virtual = ลูกเปลี่ยนได้
};

class Ally : public Character {         // ฝั่งเรา: ได้ hp, takeDamage มาฟรี
public:
    int energy = 0;
    void ult() { /* ท่าไม้ตาย */ }       // เพิ่มของใหม่
};

class Misha : public Ally {             // Misha "เป็น" Ally
public:
    int atk() override { return 30; }   // override: ตีแรงกว่าแม่
};

class Kafka : public Character {        // ศัตรู: ได้แค่ของจาก Character
public:
    int atk() override { return 25; }
};

Misha misha;
misha.takeDamage(40);   // ไม่ได้เขียนใน Misha — ได้มาจาก Character
misha.ult();            // ได้มาจาก Ally
misha.atk();            // 30 — ของ Misha เอง (override)`;

  const SYM = {
    Character: { def: 1, sig: "class Character", info: "คลาสแม่ของทุกตัวละคร: มี hp · takeDamage() · atk()" },
    Ally: { def: 9, sig: "class Ally : public Character", info: "สืบทอดจาก Character · เพิ่ม energy และ ult()" },
    Misha: { def: 15, sig: "class Misha : public Ally", info: "สืบทอด Misha → Ally → Character · override atk()" },
    Kafka: { def: 20, sig: "class Kafka : public Character", info: "สืบทอดจาก Character โดยตรง · override atk()" },
    hp: { def: 3, sig: "protected: int Character::hp = 100", info: "ประกาศใน Character · ลูกหลานทุกชั้นมีและแตะได้ (protected)" },
    d: { def: 5, sig: "int d", info: "พารามิเตอร์ของ takeDamage: ดาเมจที่โดน" },
    takeDamage: { def: 5, sig: "void Character::takeDamage(int d)", info: "ประกาศใน Character เท่านั้น — Ally / Misha / Kafka ได้ไปใช้โดยไม่ต้องเขียนซ้ำ" },
    cAtk: { def: 6, sig: "virtual int Character::atk()", info: "virtual: ลูกเขียนทับได้ · ค่าเริ่มต้นคืน 10", overriddenBy: [17, 22] },
    energy: { def: 11, sig: "int Ally::energy = 0", info: "มีเฉพาะฝั่ง Ally (Misha ได้ด้วย · Kafka ไม่มี)" },
    ult: { def: 12, sig: "void Ally::ult()", info: "ประกาศใน Ally — Misha ได้มาเพราะ Misha เป็น Ally" },
    mAtk: { def: 17, sig: "int Misha::atk() override", info: "เขียนทับ Character::atk() · คืน 30", overrides: 6 },
    kAtk: { def: 22, sig: "int Kafka::atk() override", info: "เขียนทับ Character::atk() · คืน 25", overrides: 6 },
    misha: { def: 25, sig: "Misha misha", info: "object ชนิด Misha" },
  };
  // ชื่อเดียวกันแต่คนละสัญลักษณ์ ตัดสินจากบรรทัด
  function resolve(name, line) {
    if (name === "atk") return line === 6 ? "cAtk" : line === 22 ? "kAtk" : "mAtk";
    if (name === "d" && line !== 5) return null;
    return SYM[name] ? name : null;
  }
  // ข้อความตอนชี้ที่จุดเรียกใช้ (ไม่ใช่จุดนิยาม)
  const USE = {
    "26:takeDamage": "misha ไม่มี takeDamage ของตัวเอง → หาขึ้นไป Misha → Ally → เจอใน Character",
    "27:ult": "หาขึ้นไป Misha → เจอใน Ally",
    "28:atk": "เจอใน Misha เลย (override) — ไม่ได้ใช้ของ Character",
  };

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const KW = new Set(["class", "public", "protected", "virtual", "override", "int", "void", "return"]);

  function render(root) {
    const lines = CODE.split("\n");
    const refs = {};
    const html = lines.map((raw, li) => {
      const ln = li + 1;
      const ci = raw.indexOf("//");
      const code = ci >= 0 ? raw.slice(0, ci) : raw;
      const com = ci >= 0 ? raw.slice(ci) : "";
      let out = "";
      let last = 0;
      for (const m of code.matchAll(/\/\*.*?\*\/|[A-Za-z_]\w*|\d+/g)) {
        out += esc(code.slice(last, m.index));
        const t = m[0];
        const key = /^[A-Za-z_]/.test(t) ? resolve(t, ln) : null;
        if (t.startsWith("/*")) out += `<span class="c">${esc(t)}</span>`;
        else if (key) {
          (refs[key] ||= []).push(ln);
          out += `<span class="sym${SYM[key].def === ln ? " def" : ""}" tabindex="0" role="button" data-sym="${key}" data-ln="${ln}" data-name="${t}">${esc(t)}</span>`;
        } else if (KW.has(t)) out += `<span class="k">${t}</span>`;
        else if (/^\d/.test(t)) out += `<span class="n">${t}</span>`;
        else out += esc(t);
        last = m.index + t.length;
      }
      out += esc(code.slice(last));
      if (com) out += `<span class="c">${esc(com)}</span>`;
      return `<li data-l="${ln}"><code>${out || " "}</code></li>`;
    }).join("");

    root.innerHTML = `
      <div class="lsp-bar"><span>inheritance.cpp</span><span class="lsp-hint">ชี้ = ดูชนิด · คลิก = ไปที่นิยาม + ทุกจุดที่ใช้</span></div>
      <ol class="lsp-code">${html}</ol>
      <div class="lsp-tip" role="tooltip" hidden></div>
      <div class="lsp-status mono" aria-live="polite">LSP · C++ · พร้อม</div>`;
    const list = root.querySelector(".lsp-code");
    const tip = root.querySelector(".lsp-tip");
    const status = root.querySelector(".lsp-status");
    const lineEl = (n) => list.querySelector(`li[data-l="${n}"]`);

    function tipHtml(el) {
      const key = el.dataset.sym;
      const s = SYM[key];
      const ln = +el.dataset.ln;
      const use = USE[`${ln}:${el.dataset.name}`];
      let extra = "";
      if (s.overrides) extra += `<p class="ov">↑ override ของ <b>Character::atk()</b> (บรรทัด ${s.overrides})</p>`;
      if (s.overriddenBy) extra += `<p class="ov">↓ ถูก override โดย Misha (บรรทัด 17) · Kafka (บรรทัด 22)</p>`;
      return `<code>${esc(s.sig)}</code><p>${esc(use || s.info)}</p>${extra}<p class="where">นิยามบรรทัด ${s.def} · ใช้ ${refs[key].length} ที่</p>`;
    }
    function showTip(el) {
      tip.innerHTML = tipHtml(el);
      tip.hidden = false;
      const r = el.getBoundingClientRect();
      const b = root.getBoundingClientRect();
      const left = Math.min(r.left - b.left, b.width - tip.offsetWidth - 8);
      tip.style.left = `${Math.max(8, left)}px`;
      tip.style.top = `${r.bottom - b.top + 6}px`;
    }
    const hideTip = () => { tip.hidden = true; };

    function goTo(el) {
      const key = el.dataset.sym;
      const s = SYM[key];
      list.querySelectorAll(".ref, .defline, .hot").forEach((x) => x.classList.remove("ref", "defline", "hot"));
      list.querySelectorAll(`[data-sym="${key}"]`).forEach((x) => x.classList.add("ref"));
      const d = lineEl(s.def);
      d.classList.add("defline");
      void d.offsetWidth;
      d.classList.add("hot");
      d.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      const from = +el.dataset.ln;
      status.textContent = from === s.def
        ? `นิยาม ${s.sig} · ใช้ ${refs[key].length} ที่: บรรทัด ${[...new Set(refs[key])].join(", ")}`
        : `ไปที่นิยาม: บรรทัด ${from} → บรรทัด ${s.def} · ${s.sig}`;
    }

    list.addEventListener("mouseover", (e) => { const el = e.target.closest(".sym"); if (el) showTip(el); });
    list.addEventListener("mouseout", (e) => { if (e.target.closest(".sym")) hideTip(); });
    list.addEventListener("focusin", (e) => { const el = e.target.closest(".sym"); if (el) showTip(el); });
    list.addEventListener("focusout", hideTip);
    list.addEventListener("click", (e) => { const el = e.target.closest(".sym"); if (el) goTo(el); });
    list.addEventListener("keydown", (e) => {
      const el = e.target.closest(".sym");
      if (el && (e.key === "Enter" || e.key === " " || e.key === "F12")) { e.preventDefault(); goTo(el); }
    });
  }

  document.querySelectorAll("[data-lsp]").forEach(render);
})();

// กล่อง "misha มีอะไรบ้าง": กดชื่อแล้วกระโดดไปที่นิยามในโค้ด
document.addEventListener("click", (e) => {
  const li = e.target.closest(".inh-obj [data-go]");
  if (!li) return;
  const sym = document.querySelector(`.lsp .sym.def[data-sym="${li.dataset.go}"]`);
  if (sym) sym.click();
  document.querySelectorAll(".inh-obj li.on").forEach((x) => x.classList.remove("on"));
  li.classList.add("on");
});
