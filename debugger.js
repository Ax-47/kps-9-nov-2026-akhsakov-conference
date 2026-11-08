// ดีบักเกอร์จำลอง: ไล่โค้ดจริงทีละบรรทัด (ด่าน "DEBH": D ดื่ม · E ศัตรูตี 90 · B บอสตี 80 · H ฮีล 75)
// แสดงบรรทัดที่กำลังทำ · call stack · ตัวแปร · ผลลัพธ์ · และเช็กกฎ HP 5 ข้อทุกก้าว
// พอกฎพัง จะหยุดเหมือน breakpoint แล้วชี้บรรทัดที่ทำให้พัง
(() => {
  "use strict";

  // ===================== โค้ดจริงของแต่ละภาษา =====================
  const CODE = {
    goto: `#include <stdio.h>
int main(void) {
    const char *ev = "DEBH";
    int hp = 100, en = 0, k = -1;
L10: k = k + 1;
     if (k > 3) goto L99;
     if (ev[k] == 'E') goto L20;
     if (ev[k] == 'B') goto L30;
     if (ev[k] == 'H') goto L40;
     en = en + 20; goto L50;
L20: hp = hp - 90; goto L50;
L30: hp = hp - 80; goto L50;
L40: hp = hp + 75;
L50: printf("%c %d\\n", ev[k], hp);
     if (hp > 0) goto L10;
L99: return 0;
}`,
    c: `#include <stdio.h>

int hp = 100;   // global: ทุกไฟล์ ทุกฟังก์ชันแก้ได้
int en = 0;

/* ทีมศัตรู · enemy.c */
void on_hit(int dmg) { hp -= dmg; }
/* ทีมไอเทม · items.c */
void use_food(void)  { hp += 75; if (hp > 100) hp = 100; }
void use_drink(void) { en += 20; }
/* ทีมตัวละคร · ally.c */
int  is_dead(void)   { return hp == 0; }
/* ทีมระบบเทิร์น · turn.c */
int  can_act(void)   { return hp > 0; }

int main(void) {
    const char *ev = "DEBH";
    for (int k = 0; k < 4; k++) {
        if (is_dead()) break;
        if (!can_act()) printf("(skip turn)\\n");
        switch (ev[k]) {
        case 'D': use_drink(); break;
        case 'E': on_hit(90); break;
        case 'B': on_hit(80); break;
        case 'H': use_food(); break;
        }
        printf("%c %d\\n", ev[k], hp);
    }
    return 0;
}`,
    java: `class GameObject {
    protected int hp = 100;   // protected = ลูกหลานทุกชั้นแก้ได้
}
class Character extends GameObject {
    boolean isDown() { return hp <= 0; }
    void takeDamage(int d) { hp = Math.max(0, hp - d); }
    void heal(int n) { if (!isDown()) hp = Math.min(100, hp + n); }
}
class Ally extends Character {
    protected int en = 0;
    void addEnergy(int n) { if (!isDown()) en = Math.min(100, en + n); }
}
class DestructionAlly extends Ally {
    @Override void takeDamage(int d) {   // ทับของแม่ เพื่อเพิ่มเกราะ 10%
        hp -= d - d / 10;                // ลืม Math.max(0, …) ที่แม่มี
    }
}
class Misha extends DestructionAlly { }

public class Main {
    public static void main(String[] args) {
        Ally misha = new Misha();
        for (char e : "DEBH".toCharArray()) {
            if (misha.isDown()) break;
            switch (e) {
                case 'D' -> misha.addEnergy(20);
                case 'E' -> misha.takeDamage(90);
                case 'B' -> misha.takeDamage(80);
                case 'H' -> misha.heal(75);
            }
            System.out.println(e + " " + misha.hp);
        }
    }
}`,
    go: `package main

import "fmt"

type Ally struct{ hp, en int } // ตัวเล็ก = แตะได้แค่ใน package

func NewAlly() *Ally             { return &Ally{hp: 100} }
func (a *Ally) IsDown() bool     { return a.hp <= 0 }
func (a *Ally) TakeDamage(d int) { a.hp = max(0, a.hp-d) }
func (a *Ally) Heal(n int) bool {
    if a.IsDown() { return false }
    a.hp = min(100, a.hp+n)
    return true
}
func (a *Ally) AddEnergy(n int) {
    if !a.IsDown() { a.en = min(100, a.en+n) }
}

func main() {
    misha := NewAlly()
    for _, e := range "DEBH" {
        if misha.IsDown() { break }
        switch e {
        case 'D': misha.AddEnergy(20)
        case 'E': misha.TakeDamage(90)
        case 'B': misha.TakeDamage(80)
        case 'H': misha.Heal(75)
        }
        fmt.Printf("%c %d\\n", e, misha.hp)
    }
}`,
    rust: `struct Ally { hp: i32, en: i32 } // ไม่มี pub = แตะได้แค่ใน module

impl Ally {
    fn new() -> Self { Ally { hp: 100, en: 0 } }
    fn is_down(&self) -> bool { self.hp <= 0 }
    fn take_damage(&mut self, d: i32) { self.hp = (self.hp - d).max(0); }
    fn heal(&mut self, n: i32) -> bool {
        if self.is_down() { return false; }
        self.hp = (self.hp + n).min(100);
        true
    }
    fn add_energy(&mut self, n: i32) {
        if !self.is_down() { self.en = (self.en + n).min(100); }
    }
}

fn main() {
    let mut misha = Ally::new();
    for e in "DEBH".chars() {
        if misha.is_down() { break; }
        match e {
            'D' => misha.add_energy(20),
            'E' => misha.take_damage(90),
            'B' => misha.take_damage(80),
            'H' => { misha.heal(75); }
            _ => {}
        }
        println!("{} {}", e, misha.hp);
    }
}`,
  };

  // goto: บรรทัดนี้มาถึงได้จากไหนบ้าง (ตกลงมาจากบรรทัดก่อน หรือโดนกระโดดมา)
  const COMEFROM = {
    goto: {
      5: "บรรทัด 4 (ตกลงมา) · บรรทัด 15 (goto L10)",
      11: "บรรทัด 7 เท่านั้น (goto L20)",
      12: "บรรทัด 8 เท่านั้น (goto L30)",
      13: "บรรทัด 9 เท่านั้น (goto L40)",
      14: "บรรทัด 10 · 11 · 12 (goto L50) · บรรทัด 13 (ตกลงมา) — 4 ทาง!",
      16: "บรรทัด 6 (goto L99) · บรรทัด 15 (ตกลงมา)",
    },
  };

  const RULES = [
    "เริ่มด่าน HP = 100",
    "โดนตี HP ลด แต่ไม่ต่ำกว่า 0",
    "ฮีล HP เพิ่ม แต่ไม่เกิน 100",
    "HP 0 = ล้ม ล้มแล้วฮีลไม่ได้",
    "ดื่ม Energy Drink ได้ Energy +20",
  ];
  const EV = "DEBH";

  // ===================== ตัวบันทึกการทำงาน =====================
  function makeTracer(hpKey) {
    const steps = [];
    const c = {
      vars: {}, stack: ["main"], out: [],
      rules: ["wait", "wait", "wait", "wait", "wait"], msgs: ["", "", "", "", ""],
      viol: [], seen: new Set(), downAt: undefined, writes: [], cls: "",
      w(line, who, key, from, to) { c.writes.push({ line, who, key, from, to }); },
      bad(n, msg) {
        if (c.seen.has(msg)) return;
        c.seen.add(msg);
        c.rules[n - 1] = "bad";
        c.msgs[n - 1] = msg;
        c.viol.push({ n, msg });
      },
      ok(n, msg) {
        if (c.rules[n - 1] !== "wait") return;
        c.rules[n - 1] = "ok";
        c.msgs[n - 1] = msg;
      },
      s(line, note = "") {
        const hp = c.vars[hpKey];
        if (typeof hp === "number") {
          if (hp < 0) c.bad(2, `${hpKey} = ${hp} ติดลบ`);
          if (hp > 100) c.bad(3, `${hpKey} = ${hp} เกิน 100`);
          if (c.downAt !== undefined && hp > c.downAt) c.bad(4, `${hpKey} ${c.downAt} → ${hp}: ฮีลตัวที่ล้มแล้ว (ฟื้นจากความตาย)`);
          if (hp <= 0 && c.downAt === undefined) c.downAt = hp;
        }
        steps.push({
          line, note, stack: [...c.stack], vars: { ...c.vars }, out: [...c.out],
          rules: [...c.rules], msgs: [...c.msgs], viol: c.viol, writes: [...c.writes], cls: c.cls,
        });
        c.viol = [];
      },
    };
    return { c, steps };
  }

  // C + goto (โค้ดจากสไลด์)
  function traceGoto() {
    const { c, steps } = makeTracer("hp");
    const v = c.vars;
    c.s(2, "เริ่มโปรแกรม");
    v.ev = '"DEBH"';
    c.s(3, "ด่าน: D ดื่ม · E ศัตรูตี 90 · B บอสตี 80 · H ฮีล 75");
    v.hp = 100; v.en = 0; v.k = -1;
    c.ok(1, "hp = 100");
    c.s(4, "ตัวแปรทุกตัวเป็นของกลาง ใครก็แก้ได้");
    for (;;) {
      v.k++;
      v["ev[k]"] = v.k <= 3 ? `'${EV[v.k]}'` : "—";
      c.s(5, `k = ${v.k}`);
      if (v.k > 3) { c.s(6, "k > 3 → goto L99"); break; }
      c.s(6, "k ยังไม่เกิน 3");
      const e = EV[v.k];
      c.s(7, e === "E" ? "ev[k] == 'E' → กระโดดไป L20" : `ev[k] = '${e}' ไม่ใช่ 'E'`);
      if (e === "E") {
        v.hp -= 90;
        c.ok(2, "โดนตี 90 แล้ว hp = 10 ยังไม่ติดลบ");
        c.s(11, "L20: hp - 90 แล้วกระโดดไป L50");
      } else {
        c.s(8, e === "B" ? "ev[k] == 'B' → กระโดดไป L30" : `ไม่ใช่ 'B'`);
        if (e === "B") {
          v.hp -= 80;
          c.s(12, "L30: hp - 80 — ไม่มีบรรทัดไหนกันไม่ให้ต่ำกว่า 0");
        } else {
          c.s(9, e === "H" ? "→ กระโดดไป L40" : "ไม่ใช่ 'H' → ตกมาบรรทัดถัดไป");
          if (e === "H") { v.hp += 75; c.s(13, "L40: hp + 75"); }
          else { v.en += 20; c.ok(5, "en + 20"); c.s(10, "en + 20 แล้วกระโดดไป L50"); }
        }
      }
      c.out.push(`${e} ${v.hp}`);
      c.s(14, `L50: พิมพ์ "${e} ${v.hp}"`);
      if (v.hp > 0) { c.s(15, "hp > 0 → กระโดดกลับไป L10"); continue; }
      c.ok(4, "hp ไม่มากกว่า 0 แล้วโปรแกรมหยุด");
      c.s(15, "hp ไม่มากกว่า 0 → ตกลงไป L99");
      break;
    }
    c.s(16, "จบโปรแกรม — ไม่ถึงตา H เลยไม่ได้ทดสอบกฎข้อ 3");
    return steps;
  }

  // C: hp เป็นตัวแปร global หลายทีมแก้ได้
  function traceC() {
    const { c, steps } = makeTracer("hp");
    const v = c.vars;
    c.stack = ["(global init)"];
    v.hp = 100;
    c.ok(1, "global hp = 100");
    c.s(3, "hp เป็น global: ฟังก์ชันไหนในโปรเจกต์ก็อ่าน-เขียนได้");
    v.en = 0;
    c.s(4);
    c.stack = ["main"];
    c.s(16, "เริ่ม main");
    v.ev = '"DEBH"';
    c.s(17);
    const call = (name, line, note, fn) => { c.stack.push(name); if (fn) fn(); c.s(line, note); c.stack.pop(); };
    for (let k = 0; ; k++) {
      v.k = k;
      v["ev[k]"] = k < 4 ? `'${EV[k]}'` : "—";
      if (k >= 4) { c.s(18, "k = 4 → ออกจากลูป"); break; }
      c.s(18, `k = ${k}`);
      const dead = v.hp === 0;
      v["is_dead()"] = dead ? 1 : 0;
      if (!dead && v.hp <= 0) c.bad(4, `ally.c ว่ายังไม่ตาย (hp == 0 ?) แต่ hp = ${v.hp} — แต่ละทีมนิยาม "ตาย" ไม่ตรงกัน`);
      call("is_dead [ally.c]", 12, `ทีมตัวละครเช็ก hp == 0 → ${dead ? 1 : 0}`);
      if (dead) { c.s(19, "ตาย → break"); break; }
      c.s(19, "is_dead() = 0 → เล่นต่อ");
      const act = v.hp > 0;
      v["can_act()"] = act ? 1 : 0;
      call("can_act [turn.c]", 14, `ทีมระบบเทิร์นเช็ก hp > 0 → ${act ? 1 : 0}`);
      if (!act) { c.out.push("(skip turn)"); c.s(20, "turn.c ว่าเล่นไม่ได้ แต่โค้ดก็ยังทำต่อ — สองทีมไม่คุยกัน"); }
      else c.s(20, "can_act() = 1");
      const e = EV[k];
      c.s(21, `switch '${e}'`);
      if (e === "D") {
        c.s(22, "use_drink()");
        call("use_drink [items.c]", 10, "en += 20 — แก้ global ได้เลย", () => { const o = v.en; v.en += 20; c.w(10, "use_drink · items.c", "en", o, v.en); c.ok(5, "en + 20"); });
      } else if (e === "E" || e === "B") {
        const d = e === "E" ? 90 : 80;
        c.s(e === "E" ? 23 : 24, `on_hit(${d})`);
        call("on_hit [enemy.c]", 7, `hp -= ${d} — ทีมศัตรูไม่รู้ว่ามีกฎห้ามต่ำกว่า 0`, () => {
          const o = v.hp; v.hp -= d; c.w(7, "on_hit · enemy.c", "hp", o, v.hp);
          if (v.hp >= 0) c.ok(2, `hp = ${v.hp} ยังไม่ติดลบ`);
        });
      } else {
        c.s(25, "use_food()");
        call("use_food [items.c]", 9, "hp += 75 — ทีมไอเทมไม่รู้ว่าตัวละครตายแล้ว", () => {
          const o = v.hp; v.hp = Math.min(100, v.hp + 75); c.w(9, "use_food · items.c", "hp", o, v.hp); c.ok(3, "ทีมไอเทมกันไม่ให้เกิน 100");
        });
      }
      c.out.push(`${e} ${v.hp}`);
      c.s(27, `พิมพ์ "${e} ${v.hp}"`);
    }
    c.s(29, "จบ — hp ถูกแก้จาก 3 ไฟล์ ไม่มีใครเป็นเจ้าของ กฎเลยหล่นหายตรงรอยต่อ");
    return steps;
  }

  // Java: ต้นไม้คลาสลึก ลูกทับเมธอดของแม่แล้วข้ามกฎ
  const HIER = [
    { name: "GameObject", has: "hp (protected)" },
    { name: "Character", has: "isDown() · takeDamage() ✓กฎ · heal()" },
    { name: "Ally", has: "en · addEnergy()" },
    { name: "DestructionAlly", has: "takeDamage() ทับของแม่ ✗" },
    { name: "Misha", has: "(ว่าง)" },
  ];
  function traceJava() {
    const H = "misha.hp";
    const { c, steps } = makeTracer(H);
    const v = c.vars;
    c.s(21, "เริ่ม main");
    c.stack.push("new Misha()");
    c.cls = "GameObject"; c.stack.push("GameObject()");
    v[H] = 100;
    c.ok(1, "hp = 100 (ตั้งในชั้นบนสุด GameObject)");
    c.s(2, "สร้าง Misha ต้องไล่สร้างขึ้นไปทุกชั้น: hp อยู่ใน GameObject");
    c.stack.pop(); c.cls = "Ally"; c.stack.push("Ally()");
    v["misha.en"] = 0;
    c.s(10, "en อยู่ใน Ally");
    c.stack.pop(); c.stack.pop(); c.cls = "";
    c.s(22, "ตัวแปรเป็นแบบ Ally แต่ของจริงคือ Misha (5 ชั้นลงมา)");
    const isDown = () => {
      c.cls = "Character"; c.stack.push("Character.isDown");
      const d = v[H] <= 0;
      v["isDown()"] = d;
      c.s(5, `Misha ไม่มี isDown → หาขึ้นไปจนเจอใน Character · hp <= 0 ? → ${d}`);
      c.stack.pop(); c.cls = "";
      return d;
    };
    let k = 0;
    for (; k < 4; k++) {
      const e = EV[k];
      v.e = `'${e}'`;
      c.s(23, `e = '${e}'`);
      if (isDown()) { c.ok(4, "isDown ของ Character ยังทำงาน → หยุดเล่น"); c.s(24, "ล้มแล้ว → break"); break; }
      c.s(24, "ยังไม่ล้ม → เล่นต่อ");
      c.s(25, `เลือกตาม '${e}'`);
      if (e === "D") {
        c.s(26, "misha.addEnergy(20)");
        c.cls = "Ally"; c.stack.push("Ally.addEnergy");
        v["misha.en"] = Math.min(100, v["misha.en"] + 20);
        c.ok(5, "en + 20");
        c.s(11, "addEnergy อยู่ใน Ally (ขึ้นไป 2 ชั้น)");
        c.stack.pop(); c.cls = "";
      } else if (e === "E" || e === "B") {
        const d = e === "E" ? 90 : 80;
        c.s(e === "E" ? 27 : 28, `misha.takeDamage(${d}) — คิดว่าได้ของ Character ที่มีกฎ?`);
        c.cls = "DestructionAlly"; c.stack.push("DestructionAlly.takeDamage");
        c.s(14, "ไม่ใช่! เจอตัวที่ทับไว้ใน DestructionAlly ก่อน — takeDamage ของ Character ที่มีกฎไม่ถูกเรียกเลย");
        const o = v[H]; v[H] = o - (d - Math.floor(d / 10));
        if (v[H] >= 0) c.ok(2, `hp = ${v[H]} ยังไม่ติดลบ (แต่กฎถูกข้ามไปแล้ว)`);
        c.s(15, `hp -= ${d} - ${Math.floor(d / 10)} → ${v[H]} · แก้ hp ได้ตรง ๆ เพราะเป็น protected`);
        c.stack.pop(); c.cls = "";
      } else {
        c.s(29, "misha.heal(75)");
        c.cls = "Character"; c.stack.push("Character.heal");
        if (v[H] > 0) v[H] = Math.min(100, v[H] + 75);
        c.s(7, "heal อยู่ใน Character");
        c.stack.pop(); c.cls = "";
      }
      c.out.push(`${e} ${v[H]}`);
      c.s(31, `พิมพ์ "${e} ${v[H]}"`);
    }
    c.s(33, "จบ — กฎอยู่ใน Character แต่ลูกหลานทับเมธอดแล้วข้ามได้ แก้แม่ก็ไม่ช่วยลูก");
    return steps;
  }

  // Java / Go / Rust: hp มีเจ้าของ ทุกอย่างผ่านเมธอด
  const OWNED = {
    java: {
      main: 15, ctor: 2, newLine: 16, loop: 17, check: 18, isDown: 3, sw: 19,
      D: 20, E: 21, B: 22, H: 23, addEnergy: 10, take: 4, healCheck: 6, healSet: 7, print: 25, end: 27,
      fn: { ctor: "Ally()", isDown: "isDown", add: "addEnergy", take: "takeDamage", heal: "heal" },
      downLabel: "isDown()", clampNote: "Math.max(0, …)",
    },
    go: {
      main: 19, ctor: 7, newLine: 20, loop: 21, check: 22, isDown: 8, sw: 23,
      D: 24, E: 25, B: 26, H: 27, addEnergy: 16, take: 9, healCheck: 11, healSet: 12, print: 29, end: 31,
      fn: { ctor: "NewAlly", isDown: "IsDown", add: "AddEnergy", take: "TakeDamage", heal: "Heal" },
      downLabel: "IsDown()", clampNote: "max(0, …)",
    },
    rust: {
      main: 17, ctor: 4, newLine: 18, loop: 19, check: 20, isDown: 5, sw: 21,
      D: 22, E: 23, B: 24, H: 25, addEnergy: 13, take: 6, healCheck: 8, healSet: 9, print: 28, end: 30,
      fn: { ctor: "Ally::new", isDown: "is_down", add: "add_energy", take: "take_damage", heal: "heal" },
      downLabel: "is_down()", clampNote: ".max(0)",
    },
  };

  function traceOwned(L) {
    const H = "misha.hp";
    const { c, steps } = makeTracer(H);
    const v = c.vars;
    const isDown = () => {
      c.stack.push(L.fn.isDown);
      const d = v[H] <= 0;
      v[L.downLabel] = d;
      c.s(L.isDown, `hp <= 0 ? → ${d}`);
      c.stack.pop();
      return d;
    };
    c.s(L.main, "เริ่ม main");
    c.stack.push(L.fn.ctor);
    v[H] = 100; v["misha.en"] = 0;
    c.ok(1, "สร้าง Ally แล้ว hp = 100");
    c.s(L.ctor, "hp อยู่ข้างใน Ally ข้างนอกแก้ตรง ๆ ไม่ได้");
    c.stack.pop();
    c.s(L.newLine);
    let k = 0;
    for (; k < 4; k++) {
      const e = EV[k];
      v.e = `'${e}'`;
      c.s(L.loop, `e = '${e}'`);
      const down = isDown();
      if (down) {
        c.ok(4, "hp เหลือ 0 → ล้ม แล้วหยุดเล่น");
        c.s(L.check, "ล้มแล้ว → break");
        break;
      }
      c.s(L.check, "ยังไม่ล้ม → เล่นต่อ");
      c.s(L.sw, `เลือกตาม '${e}'`);
      if (e === "D") {
        c.s(L.D, `${L.fn.add}(20)`);
        c.stack.push(L.fn.add);
        if (!isDown()) {
          v["misha.en"] = Math.min(100, v["misha.en"] + 20);
          c.ok(5, "en + 20 ผ่านเมธอด");
        }
        c.s(L.addEnergy, "en เพิ่มได้ผ่านเมธอดนี้เท่านั้น");
        c.stack.pop();
      } else if (e === "E" || e === "B") {
        const d = e === "E" ? 90 : 80;
        c.s(e === "E" ? L.E : L.B, `${L.fn.take}(${d})`);
        c.stack.push(L.fn.take);
        const old = v[H];
        v[H] = Math.max(0, old - d);
        c.ok(2, `${L.clampNote} กันไม่ให้ติดลบ`);
        c.s(L.take, `hp = max(0, ${old} - ${d}) = ${v[H]}`);
        c.stack.pop();
      } else {
        c.s(L.H, `${L.fn.heal}(75)`);
        c.stack.push(L.fn.heal);
        if (isDown()) { c.s(L.healCheck, "ล้มแล้ว → ไม่ยอมฮีล"); }
        else {
          c.s(L.healCheck, "ยังไม่ล้ม → ฮีลได้");
          v[H] = Math.min(100, v[H] + 75);
          c.ok(3, "min(100, …) กันไม่ให้เกิน 100");
          c.s(L.healSet, `hp = ${v[H]}`);
        }
        c.stack.pop();
      }
      c.out.push(`${e} ${v[H]}`);
      c.s(L.print, `พิมพ์ "${e} ${v[H]}"`);
    }
    c.s(L.end, k < 4 ? "จบ — ล้มเมื่อควรล้ม กฎทุกข้อที่ทดสอบผ่านหมด" : "จบ");
    return steps;
  }

  const TRACE = {
    goto: traceGoto, c: traceC,
    java: traceJava, go: () => traceOwned(OWNED.go), rust: () => traceOwned(OWNED.rust),
  };

  // ===================== ไฮไลต์โค้ดแบบง่าย =====================
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const KW = /\b(int|char|const|void|return|if|else|for|while|switch|case|break|goto|typedef|struct|include|class|private|public|static|boolean|new|func|package|import|type|range|fn|let|mut|impl|match|self|Self|true|false|bool|i32)\b/g;
  function hl(line) {
    const parts = [];
    const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)')/g;
    let last = 0;
    for (const m of line.matchAll(re)) {
      parts.push(esc(line.slice(last, m.index)).replace(KW, '<span class="k">$1</span>').replace(/\b(\d+)\b/g, '<span class="n">$1</span>'));
      parts.push(`<span class="${m[1] ? "c" : "s"}">${esc(m[0])}</span>`);
      last = m.index + m[0].length;
    }
    parts.push(esc(line.slice(last)).replace(KW, '<span class="k">$1</span>').replace(/\b(\d+)\b/g, '<span class="n">$1</span>'));
    return parts.join("") || " ";
  }

  // ===================== หน้าตาดีบักเกอร์ =====================
  function build(root) {
    const lang = root.dataset.dbg;
    const lines = CODE[lang].split("\n");
    const steps = TRACE[lang]();
    root.innerHTML = `
      <div class="dbg-bar">
        <span class="dbg-title mono">debug · ${lang === "goto" ? "c + goto" : lang}</span>
        <div class="dbg-ctl">
          <button type="button" data-a="back" title="ย้อนกลับ 1 ก้าว">⏮ ย้อน</button>
          <button type="button" data-a="step" title="ทำทีละบรรทัด">⏭ ทีละบรรทัด</button>
          <button type="button" data-a="run" class="primary">▶ รันจนเจอบั๊ก</button>
          <button type="button" data-a="reset">⟲ เริ่มใหม่</button>
        </div>
        <span class="dbg-count mono" data-r="count"></span>
      </div>
      <div class="dbg-alert" data-r="alert" role="alert" hidden></div>
      <div class="dbg-main">
        <ol class="dbg-code" data-r="code">${lines.map((l) => `<li><code>${hl(l)}</code></li>`).join("")}</ol>
        <div class="dbg-side">
          <section><h5>บรรทัดนี้ทำอะไร</h5><p class="dbg-note" data-r="note"></p></section>
          <section><h5>เส้นทางที่วิ่งมา <span data-r="jumps"></span></h5><ol class="dbg-path" data-r="path"></ol><p class="dbg-from" data-r="from" hidden></p></section>
          <section><h5>Call stack</h5><ol class="dbg-stack" data-r="stack"></ol></section>
          ${lang === "c" ? '<section><h5>ใครแก้ hp บ้าง</h5><ol class="dbg-writes" data-r="writes"></ol></section>' : ""}
          ${lang === "java" ? '<section><h5>ต้นไม้คลาสของ Misha</h5><ol class="dbg-hier" data-r="hier"></ol></section>' : ""}
          <section><h5>ตัวแปร</h5><dl class="dbg-vars" data-r="vars"></dl></section>
          <section><h5>กฎ HP 5 ข้อ</h5><ol class="dbg-rules" data-r="rules"></ol></section>
          <section><h5>Output</h5><pre class="dbg-out" data-r="out"></pre></section>
        </div>
      </div>`;
    const R = (k) => root.querySelector(`[data-r="${k}"]`);
    const codeLis = [...R("code").children];
    let i = 0;
    let timer = 0;

    function badLinesUpTo(n) {
      const set = new Set();
      for (let j = 0; j <= n; j++) if (steps[j].viol.length) set.add(steps[j].line);
      return set;
    }

    function render() {
      const st = steps[i];
      const prev = steps[i - 1];
      const bad = badLinesUpTo(i);
      codeLis.forEach((li, j) => {
        li.classList.toggle("cur", j + 1 === st.line);
        li.classList.toggle("bad", bad.has(j + 1));
      });
      const cur = codeLis[st.line - 1];
      if (cur) {
        const box = R("code");
        const top = cur.offsetTop - box.clientHeight / 2 + cur.offsetHeight / 2;
        box.scrollTo({ top, behavior: "smooth" });
      }
      R("count").textContent = `ก้าวที่ ${i + 1}/${steps.length} · บรรทัด ${st.line}`;
      R("note").textContent = st.note || "—";
      // เส้นทาง: บรรทัดที่ผ่านมา ไม่ต่อเนื่อง = กระโดด
      let jumps = 0;
      const path = steps.slice(0, i + 1).map((x, j) => {
        const p = steps[j - 1];
        const jump = p && x.line !== p.line + 1 && x.line !== p.line;
        if (jump) jumps++;
        return { line: x.line, jump, up: p && x.line < p.line };
      });
      R("jumps").textContent = `· กระโดด ${jumps} ครั้ง`;
      R("path").innerHTML = path.slice(-18).map((x, j, arr) =>
        `<li class="${x.jump ? (x.up ? "jump up" : "jump") : ""}${j === arr.length - 1 ? " here" : ""}">${x.jump ? (x.up ? "↺" : "↷") : ""}${x.line}</li>`).join("");
      const from = (COMEFROM[lang] || {})[st.line];
      R("from").hidden = !from;
      if (from) R("from").innerHTML = `บรรทัด ${st.line} มาถึงได้จาก: <b>${esc(from)}</b>`;
      R("stack").innerHTML = [...st.stack].reverse().map((f, j) => `<li${j === 0 ? ' class="top"' : ""}>${esc(f)}()</li>`).join("");
      R("vars").innerHTML = Object.entries(st.vars).map(([k, val]) => {
        const changed = prev && prev.vars[k] !== val;
        let extra = "";
        if (/hp$/.test(k) && typeof val === "number") {
          const w = Math.max(0, Math.min(100, val));
          extra = `<span class="bar${val < 0 ? " neg" : ""}"><i style="width:${val < 0 ? Math.min(100, -val) : w}%"></i></span>`;
        }
        return `<div class="${changed ? "chg" : ""}${typeof val === "number" && /hp$/.test(k) && (val < 0 || val > 100) ? " err" : ""}"><dt>${esc(k)}</dt><dd>${esc(String(val))}${extra}</dd></div>`;
      }).join("") || "<div><dt>—</dt><dd>ยังไม่มีตัวแปร</dd></div>";
      R("rules").innerHTML = RULES.map((r, j) => {
        const s = st.rules[j];
        const icon = s === "ok" ? "✓" : s === "bad" ? "✗" : "·";
        return `<li class="${s}"><b>${icon}</b><span>${j + 1}. ${r}${st.msgs[j] ? `<em>${esc(st.msgs[j])}</em>` : ""}</span></li>`;
      }).join("");
      if (R("writes")) R("writes").innerHTML = st.writes.length
        ? st.writes.map((x) => `<li${x.to < 0 ? ' class="neg"' : ""}><span>บรรทัด ${x.line}</span><b>${esc(x.who)}</b><code>${x.key} ${x.from} → ${x.to}</code></li>`).join("")
        : "<li><span>—</span><b>ยังไม่มีใครแก้</b></li>";
      if (R("hier")) R("hier").innerHTML = HIER.map((h, j) =>
        `<li class="${h.name === st.cls ? "on" : ""}${h.name === "DestructionAlly" ? " warn" : ""}" style="--d:${j}"><b>${h.name}</b><span>${esc(h.has)}</span></li>`).join("");
      R("out").textContent = st.out.join("\n") || " ";
      const alert = R("alert");
      if (st.viol.length) {
        alert.hidden = false;
        alert.innerHTML = st.viol.map((x) => `🐞 <b>บั๊ก! กฎข้อ ${x.n} พัง</b> ที่บรรทัด ${st.line}: ${esc(x.msg)}`).join("<br>");
      } else if (i === steps.length - 1) {
        const anyBad = st.rules.includes("bad");
        alert.hidden = false;
        alert.className = `dbg-alert ${anyBad ? "" : "good"}`;
        alert.innerHTML = anyBad
          ? `🐞 <b>จบโปรแกรม แต่กฎพัง ${st.rules.filter((s) => s === "bad").length} ข้อ</b> — บรรทัดสีแดงคือจุดที่ทำให้พัง`
          : "✓ <b>จบโปรแกรม กฎที่ทดสอบผ่านหมด</b> — hp มีเจ้าของ ทุกอย่างต้องผ่านเมธอดที่คุมกฎ";
        return;
      } else {
        alert.hidden = true;
      }
      alert.className = "dbg-alert";
    }

    function stop() {
      clearInterval(timer);
      timer = 0;
      root.querySelector('[data-a="run"]').textContent = "▶ รันจนเจอบั๊ก";
    }
    function go(n) { i = Math.max(0, Math.min(steps.length - 1, n)); render(); }

    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-a]");
      if (!b) return;
      const a = b.dataset.a;
      if (a === "step") { stop(); go(i + 1); }
      if (a === "back") { stop(); go(i - 1); }
      if (a === "reset") { stop(); go(0); }
      if (a === "run") {
        if (timer) { stop(); return; }
        if (i >= steps.length - 1) go(0);
        b.textContent = "⏸ หยุด";
        timer = setInterval(() => {
          go(i + 1);
          if (steps[i].viol.length || i >= steps.length - 1) stop();
        }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 380);
      }
    });
    render();
  }

  document.querySelectorAll("[data-dbg]").forEach(build);
})();
