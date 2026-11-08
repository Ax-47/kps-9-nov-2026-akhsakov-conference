// HP BATTLE — เกมเทิร์นเบสจิ๋วในเทอร์มินัลบนเว็บ
// พอร์ตจากโปรแกรม C ของโจทย์ระบบ HP: กติกาและตัวเลขเหมือนต้นฉบับทุกข้อ
//   กฎ 1 เริ่ม HP 100 · กฎ 2 โดนตีไม่ต่ำกว่า 0 · กฎ 3 ฮีลไม่เกิน 100
//   กฎ 4 HP 0 = ล้ม ล้มแล้วฮีลไม่ได้ · กฎ 5 Energy Drink ได้ Energy +20
// เปิด BUGGY = hp ไม่มีเจ้าของ: ติดลบได้ และเช็กล้มด้วย hp == 0 เลยไม่มีใครล้ม
(() => {
  "use strict";

  const MAX_HP = 100;
  const MAX_ENERGY = 100;
  const MAX_SP = 5;
  const BOSS_MAX_HP = 360;
  const BOSS_HIT_MIN = 14; // ดาเมจตีธรรมดาของบอส
  const BOSS_HIT_MAX = 22;
  const BIG_ATTACK = 80;   // ท่าใหญ่ เท่ากับตา B ในโจทย์
  const ATTACKER = "attacker";
  const HEALER = "healer";

  // ---------- สุ่มแบบกำหนด seed ได้ (seed เดิม = เกมเดิม) ----------
  function makeRng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createGame(root) {
    const term = root.querySelector("[data-term]");
    const cmds = root.querySelector("[data-cmds]");
    const buggyBox = root.querySelector("[data-buggy]");
    const seedBox = root.querySelector("[data-seed]");
    const restartBtn = root.querySelector("[data-restart]");
    const langTag = root.querySelector("[data-lang-tag]");
    // แท็บภาษาในส่วนเดียวกัน: เลือกภาษา = เปลี่ยนกติกาของเกม (C ไม่มีเจ้าของ hp, Java/Go/Rust มี)
    const section = root.closest("section");
    const langTabs = section ? [...section.querySelectorAll('[role="tab"][data-lang]')] : [];
    let lang = "C";

    let g;          // สถานะเกม
    let rand;       // ตัวสุ่ม
    let buggy = false;
    let lines = [];
    let ui = { phase: "ally", pending: null }; // ally | target | item | boss | over

    const roll = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

    // ---------- เทอร์มินัล ----------
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const c = (cls, s) => `<span class="t-${cls}">${esc(s)}</span>`;
    function print(html = "") {
      lines.push(html);
      if (lines.length > 500) lines = lines.slice(-400);
    }
    function flush() {
      term.innerHTML = lines.join("\n");
      term.scrollTop = term.scrollHeight;
    }
    const pad = (s, n) => String(s).padEnd(n);
    const padL = (s, n) => String(s).padStart(n);

    function bar(value, max, width, cls) {
      const v = Math.max(0, value);
      const filled = Math.floor((Math.min(v, max) * width) / max);
      return c(cls, `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`);
    }

    // ---------- กฎของตัวละคร (ที่เดียวที่แตะ hp) ----------
    const isDown = (a) => (buggy ? a.hp === 0 : a.hp <= 0); // BUGGY: −70 ไม่เท่ากับ 0 เลยไม่ล้ม

    function addEnergy(a, n) {
      if (isDown(a)) return;
      a.energy = Math.min(MAX_ENERGY, a.energy + n);
    }
    function takeDamage(a, d) {
      a.hp -= d;
      if (!buggy && a.hp < 0) a.hp = 0;   // กฎ 2
      addEnergy(a, 10);                    // โดนตีก็ได้ Energy นิดหน่อย
    }
    /** คืนค่า HP ที่ฮีลได้จริง หรือ -1 ถ้าฮีลไม่ได้ */
    function heal(a, n) {
      if (!buggy && isDown(a)) return -1;  // กฎ 4
      const before = a.hp;
      a.hp = Math.min(MAX_HP, a.hp + n);   // กฎ 3
      return a.hp - before;
    }

    const aliveCount = () => g.party.filter((a) => !isDown(a)).length;
    function randomAlive() {
      const ids = [0, 1].filter((i) => !isDown(g.party[i]));
      return ids.length ? ids[Math.floor(rand() * ids.length)] : -1;
    }

    // ---------- หน้าจอ ----------
    function showStatus() {
      const b = g.boss;
      print();
      print(c("bold", `========================= TURN ${g.round} =========================`));
      let line = ` ${c("red", `BOSS ${pad(b.name, 12)}`)} HP ${bar(b.hp, BOSS_MAX_HP, 24, "red")} ${padL(b.hp, 3)}/${BOSS_MAX_HP}`;
      if (b.charging) line += `  ${c("yellow", `!! charging -> ${g.party[b.target].name}`)}`;
      print(line);
      g.party.forEach((a, i) => {
        let row = ` ${i + 1}) ${esc(pad(a.name, 14))} HP ${bar(a.hp, MAX_HP, 20, "green")} ${padL(a.hp, 4)}  EN ${bar(a.energy, MAX_ENERGY, 10, "cyan")} ${padL(a.energy, 3)}`;
        if (isDown(a)) row += `  ${c("grey", "KNOCKED DOWN")}`;
        print(row);
      });
      print(esc(` Skill Points ${g.sp}/${MAX_SP}   Items: Energy Drink x${g.drinks}, Food x${g.foods}`));
    }

    function promptAlly() {
      const a = g.party[g.current];
      print();
      print(`${c("bold", a.name)}'s turn: [A] Basic ATK  [S] Skill (1 SP)  [U] Ultimate (EN ${MAX_ENERGY})  [I] Item  [Q] Quit`);
    }

    function hitBoss(a, dmg, move) {
      g.boss.hp = Math.max(0, g.boss.hp - dmg);
      print(`  ${esc(a.name)} uses ${esc(move)} -> ${c("yellow", `${dmg} DMG`)} to ${esc(g.boss.name)}`);
    }
    function reportHeal(t, healed) {
      if (healed >= 0) print(`  ${c("green", `${t.name} +${healed} HP`)} (now ${t.hp})`);
      else print(`  ${c("grey", `${t.name} is knocked down: can't heal!`)}`);
    }

    // ---------- การกระทำของฝั่งเรา: คืน 1 = ใช้เทิร์นแล้ว, 0 = เลือกใหม่ ----------
    function act(key) {
      const a = g.party[g.current];
      switch (key) {
        case "A":
          if (a.path === ATTACKER) hitBoss(a, roll(13, 17), "Basic ATK");
          else hitBoss(a, roll(6, 9), "Basic ATK");
          addEnergy(a, 20);
          if (g.sp < MAX_SP) g.sp++;
          return 1;
        case "S":
          if (g.sp === 0) { print("  no Skill Points left (use Basic ATK to get one)"); return 0; }
          if (a.path === ATTACKER) {
            hitBoss(a, roll(27, 33), "Skill");
            g.sp--;
            addEnergy(a, 30);
            return 1;
          }
          return askTarget("skill");
        case "U":
          if (a.energy < MAX_ENERGY) { print(`  Energy ${a.energy}/${MAX_ENERGY}: not ready yet`); return 0; }
          a.energy = 0;
          if (a.path === ATTACKER) {
            hitBoss(a, roll(65, 75), "ULTIMATE");
          } else {
            print(`  ${esc(a.name)} uses ULTIMATE: heal everyone`);
            g.party.forEach((p) => reportHeal(p, heal(p, 40)));
          }
          addEnergy(a, 5);
          return 1;
        case "I":
          print(`  [1] Energy Drink x${g.drinks} (+20 EN)   [2] Food x${g.foods} (+75 HP)   [B] back`);
          ui.phase = "item";
          return null;
        default:
          print("  type A, S, U, I or Q");
          return 0;
      }
    }

    function askTarget(what) {
      print(`  Target? [1] ${esc(g.party[0].name)}  [2] ${esc(g.party[1].name)}`);
      ui.phase = "target";
      ui.pending = what;
      return null;
    }

    function useOnTarget(t) {
      const a = g.party[g.current];
      const target = g.party[t];
      const what = ui.pending;
      ui.pending = null;
      ui.phase = "ally";
      if (what === "skill") {
        const healed = heal(target, 35);
        print(`  ${esc(a.name)} uses Skill on ${esc(target.name)}`);
        reportHeal(target, healed);
        if (healed < 0) return 0;          // ไม่เสีย SP ถ้าฮีลไม่ได้ ให้เลือกใหม่
        g.sp--;
        addEnergy(a, 30);
        return 1;
      }
      if (what === "drink") {
        if (isDown(target)) { print(`  ${esc(target.name)} is knocked down`); return 0; }
        g.drinks--;
        addEnergy(target, 20);             // กฎ 5
        print(`  ${esc(target.name)} drinks an Energy Drink: EN ${target.energy}`);
        return 1;
      }
      if (what === "food") {
        const healed = heal(target, 75);
        reportHeal(target, healed);
        if (healed < 0) return 0;          // ของไม่หาย ถ้าฮีลไม่ได้
        g.foods--;
        return 1;
      }
      return 0;
    }

    function chooseItem(key) {
      ui.phase = "ally";
      if (key === "1" && g.drinks > 0) return askTarget("drink");
      if (key === "2" && g.foods > 0) return askTarget("food");
      print("  back");
      return 0;
    }

    // ---------- เทิร์นของบอส ----------
    function bossTurn() {
      const b = g.boss;
      b.turn++;
      print();
      print(c("red", `${b.name}'s turn`));

      if (b.charging) {                    // ปล่อยท่าใหญ่ที่ชาร์จไว้
        b.charging = false;
        let t = g.party[b.target];
        if (isDown(t)) {
          const other = randomAlive();
          if (other < 0) return;
          t = g.party[other];
        }
        takeDamage(t, BIG_ATTACK);
        print(`  ${c("yellow", "BIG ATTACK!")} ${esc(t.name)} takes ${BIG_ATTACK} DMG -> HP ${t.hp}${isDown(t) ? "  (knocked down)" : ""}`);
        return;
      }
      if (b.turn % 3 === 0) {              // ทุก 3 เทิร์น ชาร์จท่าใหญ่ล่วงหน้า 1 เทิร์น
        b.target = randomAlive();
        if (b.target < 0) return;
        b.charging = true;
        print(`  ${esc(b.name)} is charging a BIG ATTACK at ${esc(g.party[b.target].name)}! (${BIG_ATTACK} DMG next turn)`);
        return;
      }
      if (Math.floor(rand() * 4) === 0) {  // ตีทั้งทีม
        print("  Void Storm hits everyone!");
        g.party.forEach((a) => {
          if (isDown(a)) return;
          const d = roll(8, 12);
          takeDamage(a, d);
          print(`  ${esc(a.name)} takes ${d} DMG -> HP ${a.hp}`);
        });
        return;
      }
      const i = randomAlive();
      if (i < 0) return;
      const d = roll(BOSS_HIT_MIN, BOSS_HIT_MAX);
      takeDamage(g.party[i], d);
      print(`  ${esc(b.name)} attacks ${esc(g.party[i].name)}: ${d} DMG -> HP ${g.party[i].hp}${isDown(g.party[i]) ? "  (knocked down)" : ""}`);
    }

    // ---------- ลำดับเทิร์น ----------
    /** หาตัวถัดไปที่ยังไม่ล้มในรอบนี้ ถ้าไม่มีแล้ว ถึงตาบอส */
    function nextAlly(from) {
      for (let i = from; i < 2; i++) {
        if (!isDown(g.party[i])) {
          g.current = i;
          ui.phase = "ally";
          showStatus();
          promptAlly();
          return;
        }
      }
      ui.phase = "boss";
      render();
      setTimeout(() => {
        bossTurn();
        if (aliveCount() === 0) return end(c("red", "*** DEFEAT: everyone is knocked down ***"));
        g.round++;
        nextAlly(0);
        render();
      }, 650);
    }

    function end(msg) {
      print();
      print(msg);
      ui.phase = "over";
      render();
    }

    function afterAction(result) {
      if (result === 0) { promptAlly(); return; } // เลือกใหม่: ถามซ้ำแบบในเทอร์มินัล
      if (result !== 1) return;            // null = รอเลือกต่อ (เป้า / ไอเทม)
      if (g.boss.hp === 0) return end(c("green", `*** VICTORY! ${g.boss.name} is defeated in ${g.round} turns ***`));
      nextAlly(g.current + 1);
    }

    function input(raw) {
      const key = String(raw).toUpperCase();
      if (ui.phase === "boss") return;
      if (ui.phase === "over") { if (key === "R") start(); return; }
      print(`${c("grey", ">")} ${esc(key)}`);
      let result;
      if (ui.phase === "ally") {
        if (key === "Q") { print(); print("bye!"); ui.phase = "over"; render(); return; }
        result = act(key);
      } else if (ui.phase === "target") {
        if (key === "1" || key === "2") result = useOnTarget(Number(key) - 1);
        else { print("  type 1 or 2"); result = null; }
      } else if (ui.phase === "item") {
        result = chooseItem(key);
      }
      afterAction(result);
      render();
    }

    // ---------- ปุ่มคำสั่ง ----------
    function render() {
      flush();
      const a = g.party[g.current];
      let list = [];
      if (ui.phase === "ally") {
        list = [
          ["A", "Basic ATK"],
          ["S", "Skill (1 SP)", g.sp === 0],
          ["U", `Ultimate (EN ${a.energy}/${MAX_ENERGY})`, a.energy < MAX_ENERGY],
          ["I", "Item"],
          ["Q", "Quit"],
        ];
      } else if (ui.phase === "target") {
        list = [["1", g.party[0].name], ["2", g.party[1].name]];
      } else if (ui.phase === "item") {
        list = [["1", `Energy Drink x${g.drinks}`, g.drinks === 0], ["2", `Food x${g.foods}`, g.foods === 0], ["B", "back"]];
      } else if (ui.phase === "boss") {
        list = [["…", `${g.boss.name} is thinking`, true]];
      } else {
        list = [["R", "เล่นใหม่"]];
      }
      cmds.innerHTML = list.map(([k, label, dim]) =>
        `<button type="button" class="cmd${dim ? " dim" : ""}" data-key="${esc(k)}"${k === "…" ? " disabled" : ""}><b>[${esc(k)}]</b> ${esc(label)}</button>`).join("");
    }

    cmds.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-key]");
      if (btn && !btn.disabled) input(btn.dataset.key);
    });
    root.addEventListener("keydown", (e) => {
      if (e.target.closest("input, label") || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.length === 1 ? e.key.toUpperCase() : "";
      if (!key || !/[ASUIQB12R]/.test(key)) return;
      e.preventDefault();
      input(key);
    });

    // ---------- เริ่มเกม ----------
    function start(seed) {
      const s = Number.isFinite(seed) ? seed >>> 0 : Math.floor(Math.random() * 1e9);
      seedBox.value = String(s);
      rand = makeRng(s);
      buggy = buggyBox.checked;
      lines = [];
      ui = { phase: "ally", pending: null };
      g = {
        party: [
          { name: "Misha", path: ATTACKER, hp: MAX_HP, energy: 0 },
          { name: "Natasha", path: HEALER, hp: MAX_HP, energy: 0 },
        ],
        boss: { name: "Voidranger", hp: BOSS_MAX_HP, turn: 0, charging: false, target: 0 },
        sp: 3, drinks: 2, foods: 2, round: 1, current: 0,
      };
      print(c("bold", `Honkai: Star Rail (mini) — Misha & Natasha vs ${g.boss.name}   seed ${s}`));
      if (langTag) langTag.textContent = lang;
      if (buggy) print(c("yellow", `[${lang} build] hp has no owner: anyone can write it, so it goes below 0 and nobody gets knocked down`));
      else print(c("green", `[${lang} build] hp is private: only takeDamage() and heal() can touch it`));
      print(`Misha hits hard. Natasha heals. The boss charges a BIG ATTACK (${BIG_ATTACK}) every 3rd turn.`);
      nextAlly(0);
      render();
    }

    const currentSeed = () => parseInt(seedBox.value, 10);
    restartBtn.addEventListener("click", () => start(currentSeed()));
    buggyBox.addEventListener("change", () => start(currentSeed()));

    function useLang(tab, restart) {
      if (!tab) return;
      lang = tab.dataset.lang;
      buggyBox.checked = tab.dataset.noowner === "1";
      if (restart) start(currentSeed()); // seed เดิม จะได้เทียบกันได้
    }
    // แท็บถูกเลือกด้วยการคลิกหรือปุ่มลูกศร ทั้งสองแบบได้ focus เสมอ
    langTabs.forEach((tab) => tab.addEventListener("focus", () => {
      if (tab.dataset.lang !== lang || (tab.dataset.noowner === "1") !== buggyBox.checked) useLang(tab, true);
    }));
    useLang(langTabs.find((t) => t.getAttribute("aria-selected") === "true"), false);
    start();
  }

  document.querySelectorAll("[data-game]").forEach(createGame);
})();
