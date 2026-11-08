// แอนิเมชัน "โค้ดรันยังไง": source → compiler / interpreter → ภาษาเครื่อง → CPU + หน่วยความจำ
// Compiled = แปลทุกบรรทัดก่อน แล้วค่อยรัน · Interpreted = แปลทีละบรรทัดแล้วรันทันที
(() => {
  "use strict";
  const root = document.querySelector("[data-viz]");
  if (!root) return;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s) => root.querySelector(s);
  const srcLines = [...root.querySelectorAll(".viz-code li")];
  const hexBox = $("[data-viz-hex]");
  const log = $("[data-viz-log]");
  const arrows = [...root.querySelectorAll(".viz-arrow")];
  const boxes = { src: $(".src"), tr: $(".tr"), mc: $(".mc"), cpu: $(".cpu") };
  const out = { eax: $("[data-viz-eax]"), hp: $("[data-viz-hp]"), dmg: $("[data-viz-dmg]") };
  const runBtn = $("[data-viz-run]");
  const modeBtns = [...root.querySelectorAll("[data-mode]")];

  // คำสั่ง x86 จริงของแต่ละบรรทัด (hp ที่ 0x1000, dmg ที่ 0x1004)
  const PROGRAM = [
    [{ hex: "C7 05 00 10 00 00 64 00 00 00", asm: "mov [hp], 100", run: (s) => { s.hp = 100; } }],
    [{ hex: "C7 05 04 10 00 00 1E 00 00 00", asm: "mov [dmg], 30", run: (s) => { s.dmg = 30; } }],
    [
      { hex: "A1 00 10 00 00", asm: "mov eax, [hp]", run: (s) => { s.eax = s.hp; } },
      { hex: "2B 05 04 10 00 00", asm: "sub eax, [dmg]", run: (s) => { s.eax -= s.dmg; }, alu: true },
      { hex: "A3 00 10 00 00", asm: "mov [hp], eax", run: (s) => { s.hp = s.eax; } },
    ],
  ];

  let mode = "compile";
  let token = 0;
  let state;
  const T = (ms) => (reduceMotion ? 0 : ms);
  const wait = (ms, id) => new Promise((res, rej) => setTimeout(() => (id === token ? res() : rej(new Error("stop"))), T(ms)));

  function pulse(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function flow(i) { pulse(arrows[i], "go"); }
  function say(text) { log.textContent = text; }
  function show() {
    for (const k of ["eax", "hp", "dmg"]) {
      const v = state[k] ?? "—";
      if (out[k].textContent !== String(v)) { out[k].textContent = v; pulse(out[k].parentElement, "changed"); }
    }
  }

  function reset() {
    token++;
    state = {};
    hexBox.innerHTML = "";
    srcLines.forEach((l) => l.classList.remove("on", "done"));
    Object.values(boxes).forEach((b) => b.classList.remove("busy"));
    $("[data-viz-file]").textContent = "";
    out.eax.textContent = out.hp.textContent = out.dmg.textContent = "—";
    runBtn.disabled = false;
    runBtn.textContent = "▶ รัน";
    $("[data-viz-trname]").textContent = mode === "compile" ? "compiler" : "interpreter";
    $("[data-viz-trsub]").textContent = mode === "compile" ? "แปลทั้งไฟล์ก่อนรัน" : "แปลทีละบรรทัด แล้วรันทันที";
    say(mode === "compile"
      ? "Compiled: แปลโค้ดทุกบรรทัดเป็นภาษาเครื่องเก็บเป็นไฟล์ก่อน แล้วค่อยให้ CPU รันไฟล์นั้น — กด ▶ รัน"
      : "Interpreted: อ่านทีละบรรทัด แปลแล้วรันทันที วนไปจนจบ — กด ▶ รัน");
  }

  async function translate(i, id) {
    const line = srcLines[i];
    srcLines.forEach((l) => l.classList.remove("on"));
    line.classList.add("on");
    say(`แปลบรรทัดที่ ${i + 1}: ${line.textContent}`);
    flow(0);
    await wait(500, id);
    boxes.tr.classList.add("busy");
    await wait(600, id);
    boxes.tr.classList.remove("busy");
    flow(1);
    await wait(350, id);
    const items = PROGRAM[i].map((ins) => {
      const li = document.createElement("li");
      li.innerHTML = `<code></code><span></span>`;
      li.querySelector("code").textContent = ins.hex;
      li.querySelector("span").textContent = ins.asm;
      hexBox.append(li);
      return li;
    });
    say(`บรรทัดที่ ${i + 1} กลายเป็นคำสั่งเครื่อง ${items.length} คำสั่ง`);
    line.classList.add("done");
    await wait(450, id);
    return items;
  }

  async function execute(i, items, id) {
    for (const [k, ins] of PROGRAM[i].entries()) {
      hexBox.querySelectorAll("li").forEach((l) => l.classList.remove("exec"));
      items[k].classList.add("exec");
      flow(2);
      await wait(400, id);
      boxes.cpu.classList.add("busy");
      if (ins.alu) pulse($(".alu"), "on");
      ins.run(state);
      show();
      say(`CPU รัน ${ins.asm}${ins.alu ? " — ALU ลบเลขให้" : ""}`);
      await wait(700, id);
      boxes.cpu.classList.remove("busy");
    }
  }

  async function run() {
    reset();
    const id = token;
    runBtn.disabled = true;
    runBtn.textContent = "กำลังรัน…";
    try {
      if (mode === "compile") {
        const all = [];
        for (let i = 0; i < PROGRAM.length; i++) all.push(await translate(i, id));
        srcLines.forEach((l) => l.classList.remove("on"));
        $("[data-viz-file]").textContent = "→ hp.exe";
        say("แปลครบแล้ว ได้ไฟล์ hp.exe — ต่อจากนี้รันได้เลย ไม่ต้องแปลใหม่");
        await wait(1000, id);
        for (let i = 0; i < PROGRAM.length; i++) await execute(i, all[i], id);
      } else {
        for (let i = 0; i < PROGRAM.length; i++) {
          const items = await translate(i, id);
          await execute(i, items, id);
        }
      }
      hexBox.querySelectorAll("li").forEach((l) => l.classList.remove("exec"));
      srcLines.forEach((l) => l.classList.remove("on"));
      say(`เสร็จ! hp = ${state.hp} — ${mode === "compile" ? "รันรอบหน้าใช้ hp.exe ได้เลย" : "รันรอบหน้าต้องแปลใหม่ทุกบรรทัด"}`);
    } catch { return; }
    runBtn.disabled = false;
    runBtn.textContent = "▶ รันอีกรอบ";
  }

  modeBtns.forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    modeBtns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    root.dataset.mode = mode;
    reset();
  }));
  runBtn.addEventListener("click", run);
  $("[data-viz-reset]").addEventListener("click", reset);
  reset();
})();
