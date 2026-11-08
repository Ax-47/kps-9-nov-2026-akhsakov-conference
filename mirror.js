// การทดลอง mirror tracing แบบที่ HM ทำ: ลากเส้นระหว่างดาว 2 ชั้น แต่ภาพที่เห็นกลับบน-ล่างเหมือนมองผ่านกระจก
// นับครั้งที่หลุดขอบ แล้ววาดกราฟผลของเราเทียบกับแนวโน้มของ HM
(() => {
  "use strict";
  const root = document.querySelector("[data-mirror]");
  if (!root) return;
  const cv = root.querySelector("canvas");
  const ctx = cv.getContext("2d");
  const out = { err: root.querySelector("[data-m-err]"), prog: root.querySelector("[data-m-prog]"), msg: root.querySelector("[data-m-msg]"), hist: root.querySelector("[data-m-hist]") };
  const mirrorBox = root.querySelector("[data-m-mirror]");
  const S = 520, C = S / 2;

  function star(rOut, rIn) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? rIn : rOut;
      pts.push([C + r * Math.cos(a), C + r * Math.sin(a)]);
    }
    return pts;
  }
  const OUTER = star(232, 112), INNER = star(186, 74);
  const START = [C, C - 209]; // กึ่งกลางแถบที่ยอดบน

  function inside(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const onPath = (x, y) => inside(OUTER, x, y) && !inside(INNER, x, y);

  let path = [], drawing = false, errors = 0, wasOut = false, swept = 0, lastAng = null, done = false, mirror = true;
  const history = [];

  function draw() {
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = "#0b0f6e"; ctx.fillRect(0, 0, S, S);
    const poly = (p) => { ctx.beginPath(); p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
    poly(OUTER); ctx.fillStyle = "rgba(61,255,143,.16)"; ctx.fill();
    poly(INNER); ctx.fillStyle = "#0b0f6e"; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "#3dff8f"; poly(OUTER); ctx.stroke(); poly(INNER); ctx.stroke();
    ctx.fillStyle = "#ffe066"; ctx.beginPath(); ctx.arc(START[0], START[1], 9, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffe066"; ctx.font = "600 15px sans-serif"; ctx.textAlign = "center"; ctx.fillText("เริ่ม / จบ", START[0], START[1] - 18);
    for (let i = 1; i < path.length; i++) {
      ctx.strokeStyle = path[i].ok ? "#ffffff" : "#ff3b30";
      ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(path[i - 1].x, path[i - 1].y); ctx.lineTo(path[i].x, path[i].y); ctx.stroke();
    }
  }

  function pos(e) {
    const r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * S;
    let y = ((e.clientY - r.top) / r.height) * S;
    if (mirror) y = S - y; // กระจก: ขยับมือขึ้น ภาพเลื่อนลง
    return { x, y };
  }
  function status() {
    out.err.textContent = errors;
    out.prog.textContent = `${Math.min(100, Math.round((Math.abs(swept) / (2 * Math.PI)) * 100))}%`;
  }
  function reset(msg) {
    path = []; drawing = false; errors = 0; wasOut = false; swept = 0; lastAng = null; done = false;
    status(); draw();
    out.msg.textContent = msg || (mirror ? "กดค้างที่จุดเหลือง แล้วลากวนรอบดาวในแถบสีเขียว — มือขยับขึ้น ภาพจะลง" : "โหมดปกติ (ไม่มีกระจก): ลองเทียบว่าง่ายกว่าแค่ไหน");
  }

  cv.addEventListener("pointerdown", (e) => {
    if (done) reset();
    const p = pos(e);
    if (Math.hypot(p.x - START[0], p.y - START[1]) > 30) { out.msg.textContent = "เริ่มที่จุดสีเหลืองก่อนนะ (อย่าลืมว่าภาพกลับบน-ล่าง)"; return; }
    cv.setPointerCapture(e.pointerId);
    drawing = true; path = [{ ...p, ok: true }]; lastAng = Math.atan2(p.y - C, p.x - C);
    out.msg.textContent = "ลากต่อไป… หลุดขอบ = เส้นแดง +1 ผิด";
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = pos(e);
    const ok = onPath(p.x, p.y);
    if (!ok && !wasOut) errors++;
    wasOut = !ok;
    path.push({ ...p, ok });
    const a = Math.atan2(p.y - C, p.x - C);
    let d = a - lastAng; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
    swept += d; lastAng = a;
    status(); draw();
    if (Math.abs(swept) >= 2 * Math.PI - 0.15 && Math.hypot(p.x - START[0], p.y - START[1]) < 34) finish();
  });
  const stop = () => { if (drawing && !done) { drawing = false; out.msg.textContent = "ปล่อยมือก่อนครบรอบ — กดที่จุดเหลืองเพื่อเริ่มรอบใหม่"; } };
  cv.addEventListener("pointerup", stop);
  cv.addEventListener("pointercancel", stop);

  function finish() {
    drawing = false; done = true;
    history.push({ errors, mirror });
    out.msg.textContent = `ครบรอบ! ผิด ${errors} ครั้ง — ลองอีกรอบแล้วดูกราฟด้านล่างว่าลดลงไหม`;
    renderHist();
  }
  function renderHist() {
    const max = Math.max(10, ...history.map((h) => h.errors));
    out.hist.innerHTML = history.length
      ? history.map((h, i) => `<li title="รอบ ${i + 1}"><i style="height:${(h.errors / max) * 100}%" class="${h.mirror ? "" : "plain"}"></i><b>${h.errors}</b><span>${i + 1}</span></li>`).join("")
      : '<li class="empty">ยังไม่มีผล — ทำให้ครบรอบก่อน</li>';
  }

  mirrorBox.addEventListener("change", () => { mirror = mirrorBox.checked; reset(); });
  root.querySelector("[data-m-reset]").addEventListener("click", () => reset());
  renderHist();
  reset();
})();
