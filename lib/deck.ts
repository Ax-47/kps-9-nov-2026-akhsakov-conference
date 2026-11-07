// อ่านสไลด์จาก content/ ตอน build แล้วแปลงเป็น HTML ธรรมดาที่เบราว์เซอร์แสดงได้เอง
// - <x-connector> → <svg> เส้นและหัวลูกศร
// - <x-shape>     → <div> ที่ตัดรูปด้วย clip-path
// - <x-icon>      → ไอคอน SVG จาก lucide-static
// - /_blob/<id>   → /assets/<id>.png
// - <aside>       → แยกออกมาเป็นโน้ตผู้พูด
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

export type Slide = {
  id: string;
  index: number;
  html: string;
  notes: string;
  title: string;
  section?: string;
};

export type Deck = {
  title: string;
  fontLinks: string[];
  slides: Slide[];
};

const CONTENT = path.join(process.cwd(), "content");
const BASE = process.env.BASE_PATH ?? "";
const ICON_DIR = path.join(process.cwd(), "node_modules", "lucide-static", "icons");

// ชื่อไอคอนของ Slides → ชื่อไฟล์ใน lucide
const ICONS: Record<string, string> = {
  Activity: "activity", Book: "book", Chart: "chart-column", Chat: "message-circle",
  Check: "check", CheckCircle: "circle-check", Clock: "clock", Cloud: "cloud",
  Code: "code", Database: "database", Globe: "globe", GraduationCap: "graduation-cap",
  Home: "house", Key: "key", Lightbulb: "lightbulb", Lightning: "zap", Link: "link",
  Lock: "lock", PaperPlane: "send", Play: "play", Search: "search", Settings: "settings",
  Star: "star", ThumbsUp: "thumbs-up", Tool: "hammer", Trust: "handshake",
  Users: "users", Verified: "badge-check", Warning: "triangle-alert", Wrench: "wrench",
};

const SHAPES: Record<string, string> = {
  "arrow-right": "polygon(0 25%, 60% 25%, 60% 0, 100% 50%, 60% 100%, 60% 75%, 0 75%)",
  "arrow-left": "polygon(100% 25%, 40% 25%, 40% 0, 0 50%, 40% 100%, 40% 75%, 100% 75%)",
  "arrow-up": "polygon(25% 100%, 25% 40%, 0 40%, 50% 0, 100% 40%, 75% 40%, 75% 100%)",
  "arrow-down": "polygon(25% 0, 25% 60%, 0 60%, 50% 100%, 100% 60%, 75% 60%, 75% 0)",
  diamond: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
};

function styleMap(style: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (style ?? "").split(";")) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return out;
}

function styleString(map: Record<string, string>): string {
  return Object.entries(map).map(([k, v]) => `${k}:${v}`).join(";");
}

let markerSeq = 0;

function connectorSvg(el: Element): string {
  const a = el.attribs;
  const st = styleMap(a.style);
  const color = st.color ?? "#000000";
  const width = parseFloat(st["border-width"] ?? "2") || 2;
  const dash = /dashed/.test(st["border-style"] ?? "") ? `stroke-dasharray="${width * 3} ${width * 2}"`
    : /dotted/.test(st["border-style"] ?? "") ? `stroke-dasharray="${width} ${width * 1.5}" stroke-linecap="round"` : "";
  const head = a.head ?? "end";
  const startKind = a["head-start"] ?? (head === "both" ? "filled" : "none");
  const endKind = a["head-end"] ?? (head === "none" ? "none" : "filled");
  const size = 8 + width * 2;
  const id = `m${++markerSeq}`;
  const marker = (kind: string, name: string) =>
    kind === "none" ? "" :
      `<marker id="${id}${name}" markerUnits="userSpaceOnUse" markerWidth="${size}" markerHeight="${size}" ` +
      `viewBox="0 0 10 10" refX="9" refY="5" orient="auto-start-reverse">` +
      (kind === "open"
        ? `<path d="M1 1 L9 5 L1 9" fill="none" stroke="${color}" stroke-width="1.6"/>`
        : `<path d="M0 0 L10 5 L0 10 Z" fill="${color}"/>`) + `</marker>`;
  const x1 = a.x1, y1 = a.y1, x2 = a.x2, y2 = a.y2;
  const route = a.route ?? "straight";
  const line = route === "straight"
    ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"`
    : `<polyline fill="none" points="${route === "vh" ? `${x1},${y1} ${x1},${y2} ${x2},${y2}` : `${x1},${y1} ${x2},${y1} ${x2},${y2}`}"`;
  return `<svg class="x-connector" aria-hidden="true" style="position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none">` +
    `<defs>${marker(startKind, "s")}${marker(endKind, "e")}</defs>` +
    `${line} stroke="${color}" stroke-width="${width}" ${dash} ` +
    `${startKind !== "none" ? `marker-start="url(#${id}s)"` : ""} ${endKind !== "none" ? `marker-end="url(#${id}e)"` : ""}/></svg>`;
}

function iconSvg(el: Element): string {
  const name = ICONS[el.attribs.name ?? ""] ?? "circle";
  let svg = "";
  try {
    svg = fs.readFileSync(path.join(ICON_DIR, `${name}.svg`), "utf8");
  } catch {
    svg = fs.readFileSync(path.join(ICON_DIR, "circle.svg"), "utf8");
  }
  const st = styleMap(el.attribs.style);
  const style = styleString({ display: "block", flex: "none", ...st });
  return svg
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/class="[^"]*"/, "")
    .replace(/width="24"/, 'width="100%"')
    .replace(/height="24"/, 'height="100%"')
    .replace("<svg", `<svg aria-hidden="true" style="${style}"`)
    .trim();
}

function shapeDiv(el: Element): string {
  const kind = el.attribs.kind ?? "rect";
  const st = styleMap(el.attribs.style);
  if (kind === "ellipse") st["border-radius"] = "50%";
  else if (kind === "rounded") st["border-radius"] = st["border-radius"] ?? "24px";
  else if (kind === "line") {
    const color = st.background ?? st.color ?? "#000000";
    st.background = "transparent";
    st["border-top"] = st.border ?? `2px solid ${color}`;
    delete st.border;
  } else if (SHAPES[kind]) st["clip-path"] = SHAPES[kind];
  return `<div class="x-shape" data-kind="${kind}" style="${styleString(st)}"></div>`;
}

function isPinned(el: Element): boolean {
  return /position\s*:\s*absolute/.test(el.attribs.style ?? "");
}

function hasPinnedInside($: cheerio.CheerioAPI, el: Element): boolean {
  return $(el).find("*").toArray().some((d) => d.type === "tag" && (isPinned(d as Element) || (d as Element).name === "x-connector"));
}

function transform(raw: string): { html: string; notes: string } {
  const $ = cheerio.load(raw, { xml: false }, false);
  const section = $("section").first();

  const notes = section.children("aside").text().trim();
  section.children("aside").remove();

  // ลำดับการวาด: ในเดคจริง ลูกที่มาทีหลังทับลูกที่มาก่อนเสมอ
  // ให้ลูกแบบ flow เป็น position:relative (ถ้าข้างในไม่มีตัวที่ปักตำแหน่ง) จะได้ทับกันตามลำดับเหมือนกัน
  section.children().each((_, node: AnyNode) => {
    const el = node as Element;
    if (el.type !== "tag" || isPinned(el) || el.name === "x-connector") return;
    if (/position\s*:\s*relative/.test(el.attribs.style ?? "")) return;
    if (hasPinnedInside($, el)) return;
    el.attribs.style = `position:relative;${el.attribs.style ?? ""}`;
  });

  // <div> หรือ <section> ที่ไม่ได้ตั้ง display = คอลัมน์ (กติกาของเดค) ส่วนที่ตั้ง display:flex เองจะเป็นแถวตาม CSS ปกติ
  $("section, div").each((_, node) => {
    const el = node as Element;
    const style = el.attribs.style ?? "";
    if (!/(^|;)\s*display\s*:/.test(style)) el.attribs.style = `display:flex;flex-direction:column;${style}`;
  });

  $("x-connector").each((_, el) => { $(el).replaceWith(connectorSvg(el as Element)); });
  $("x-icon").each((_, el) => { $(el).replaceWith(iconSvg(el as Element)); });
  $("x-shape").each((_, el) => { $(el).replaceWith(shapeDiv(el as Element)); });
  $("img").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    const m = src.match(/^\/_blob\/([0-9a-f]{32})$/);
    if (m) $(el).attr("src", `${BASE}/assets/${m[1]}.png`);
    $(el).attr("loading", "lazy");
    $(el).attr("draggable", "false");
  });
  // data-build-in="fade 2" → ลำดับให้ CSS ทำแอนิเมชันตอนเปิดสไลด์
  $("[data-build-in]").each((_, el) => {
    const [kind, order] = ($(el).attr("data-build-in") ?? "fade").split(/\s+/);
    $(el).attr("data-build", kind);
    $(el).attr("style", `${$(el).attr("style") ?? ""};--build-order:${Number(order) || 1}`);
    $(el).removeAttr("data-build-in");
  });

  section.attr("data-slide", section.attr("id") ?? "");
  section.removeAttr("id");
  section.removeAttr("hidden");
  return { html: $.html(section), notes };
}

function slideTitle(html: string, id: string): string {
  const $ = cheerio.load(html, {}, false);
  $("br").replaceWith(" ");
  const h = $("h1, h2").first().text().replace(/\s+/g, " ").trim();
  return h || id;
}

let cache: Deck | null = null;

export function loadDeck(): Deck {
  if (cache) return cache;
  const index = JSON.parse(fs.readFileSync(path.join(CONTENT, "deck.json"), "utf8")) as {
    title: string;
    order: string[];
    faces?: Record<string, { href?: string }>;
    sections?: Record<string, { description: string; start: string }>;
  };
  const sectionAt = new Map<string, string>();
  for (const s of Object.values(index.sections ?? {})) sectionAt.set(s.start, s.description);

  const slides = index.order.map((id, i) => {
    const raw = fs.readFileSync(path.join(CONTENT, "slides", `${id}.html`), "utf8");
    const { html, notes } = transform(raw);
    return { id, index: i, html, notes, title: slideTitle(html, id), section: sectionAt.get(id) };
  });
  const fontLinks = Object.values(index.faces ?? {})
    .map((f) => f.href)
    .filter((h): h is string => !!h && h.startsWith("https://fonts.googleapis.com/"));
  cache = { title: index.title, fontLinks, slides };
  return cache;
}
