/* RouteService: chỉ đường đi bộ (OpenRouteService, profile foot-walking) + các hàm hình học dùng cho dẫn đường.
   Lời chỉ dẫn được dựng lại ở phía mình từ mã kiểu rẽ (type) nên có tiếng Việt / English / 中文. */
const RouteService = {
  /* mã kiểu bước của ORS: 0 trái, 1 phải, 2 trái gấp, 3 phải gấp, 4 chếch trái, 5 chếch phải, 6 thẳng,
     7 vào vòng xoay, 8 ra vòng xoay, 9 quay đầu, 10 đến nơi, 11 bắt đầu, 12 đi sát trái, 13 đi sát phải */
  TXT: {
    vi: { t: ["Rẽ trái", "Rẽ phải", "Rẽ trái gấp", "Rẽ phải gấp", "Chếch sang trái", "Chếch sang phải", "Đi thẳng", "Vào vòng xoay", "Ra khỏi vòng xoay", "Quay đầu", "Bạn đã đến nơi", "Bắt đầu đi", "Đi sát bên trái", "Đi sát bên phải"],
          on: "vào", exit: "ra ở lối thứ", after: "Sau", unnamed: "đường không tên", m: "m", km: "km", sm: "mét", skm: "ki-lô-mét", min: "phút", hr: "giờ", dec: "," },
    en: { t: ["Turn left", "Turn right", "Turn sharp left", "Turn sharp right", "Bear left", "Bear right", "Continue straight", "Enter the roundabout", "Exit the roundabout", "Make a U-turn", "You have arrived", "Start walking", "Keep left", "Keep right"],
          on: "onto", exit: "take exit", after: "In", unnamed: "unnamed road", m: "m", km: "km", sm: "metres", skm: "kilometres", min: "min", hr: "h", dec: "." },
    zh: { t: ["左转", "右转", "向左急转", "向右急转", "稍向左转", "稍向右转", "直行", "进入环岛", "驶出环岛", "掉头", "您已到达", "开始步行", "靠左行驶", "靠右行驶"],
          on: "进入", exit: "从第", after: "", unnamed: "无名道路", m: "米", km: "公里", sm: "米", skm: "公里", min: "分钟", hr: "小时", dec: "." }
  },
  fmtDist(m, lang = "vi") {
    const T = this.TXT[lang]; m = Math.max(0, m);
    if (m < 1000) return Math.round(m / (m < 100 ? 5 : 10)) * (m < 100 ? 5 : 10) + " " + T.m;
    return (Math.round(m / 100) / 10).toString().replace(".", T.dec) + " " + T.km;
  },
  fmtDistSpoken(m, lang = "vi") {
    const T = this.TXT[lang];
    if (m < 1000) return Math.round(m / 10) * 10 + (lang === "zh" ? "" : " ") + T.sm;
    return (Math.round(m / 100) / 10).toString().replace(".", T.dec) + (lang === "zh" ? "" : " ") + T.skm;
  },
  fmtDur(s, lang = "vi") {
    const T = this.TXT[lang], mins = Math.max(1, Math.round(s / 60));
    if (mins < 60) return mins + " " + T.min;
    const h = Math.floor(mins / 60), r = mins % 60;
    return h + " " + T.hr + (r ? " " + r + " " + T.min : "");
  },
  /* câu chỉ dẫn của một bước */
  instr(step, lang = "vi") {
    const T = this.TXT[lang], base = T.t[step.type] != null ? T.t[step.type] : T.t[6];
    if (step.type === 10) return base;
    let s = base;
    if (step.type === 7 && step.exit) s += lang === "zh" ? `，${T.exit}${step.exit}个出口驶出` : `, ${T.exit} ${step.exit}`;
    if (step.name) s += (lang === "zh" ? "" : " ") + T.on + (lang === "zh" ? "" : " ") + step.name;
    return s;
  },
  /* câu để đọc to: "Sau 80 mét, rẽ phải vào đường X" */
  spoken(step, dist, lang = "vi") {
    const T = this.TXT[lang], i = this.instr(step, lang);
    if (step.type === 10 || dist <= 30) return i;
    const lower = lang === "en" || lang === "vi" ? i.charAt(0).toLowerCase() + i.slice(1) : i;
    return lang === "zh" ? `${this.fmtDistSpoken(dist, lang)}后，${i}` : `${T.after} ${this.fmtDistSpoken(dist, lang)}, ${lower}`;
  },

  /* ---------- gọi dịch vụ ---------- */
  async route(from, to) {
    if (!GeocodeService.hasKey()) throw apiError("nokey", "Chưa có khoá API chỉ đường. Dán khoá vào dòng ORS_API_KEY trong js/config.js (xem HUONG-DAN-API.md).");
    let r;
    try {
      r = await fetch("https://api.openrouteservice.org/v2/directions/foot-walking/geojson", {
        method: "POST",
        headers: { "Authorization": CONFIG.ORS_API_KEY.trim(), "Content-Type": "application/json", "Accept": "application/json, application/geo+json" },
        body: JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]], instructions: true, language: "en", units: "m" })
      });
    } catch (e) { throw apiError("net", "Không kết nối được dịch vụ chỉ đường (có thể mạng đang chặn)."); }
    if (!r.ok) {
      let code = 0, msg = "";
      try { const j = await r.json(); code = j.error && j.error.code; msg = (j.error && (j.error.message || j.error)) || ""; } catch (e) {}
      if (r.status === 404 || code === 2010) throw apiError("unroutable", "Không tìm được đường đi bộ từ vị trí của bạn tới đó (vị trí xuất phát hoặc đích quá xa đường đi).");
      if (code === 2004 || /distance/i.test(String(msg))) throw apiError("far", "Quãng đường quá xa để chỉ đường đi bộ.");
      throw GeocodeService.httpError(r.status);
    }
    return this.parse(await r.json());
  },
  parse(j) {
    const f = j.features && j.features[0];
    if (!f || !f.geometry || !f.properties) throw apiError("unroutable", "Dịch vụ không trả về tuyến đường.");
    const coords = f.geometry.coordinates.map(c => [c[1], c[0]]);
    const sum = f.properties.summary || {}, seg = (f.properties.segments && f.properties.segments[0]) || { steps: [] };
    const steps = seg.steps.map(s => ({ type: s.type, name: s.name && s.name !== "-" ? s.name : "", distance: s.distance, duration: s.duration, wp: s.way_points, exit: s.exit_number }));
    return this.build(coords, steps, sum.distance, sum.duration);
  },
  /* dựng cấu trúc tuyến + bảng khoảng cách cộng dồn để tính tiến độ nhanh */
  build(coords, steps, distance, duration) {
    const ref = coords[0], kx = 111320 * Math.cos(ref[0] * Math.PI / 180), ky = 110574;
    const xy = coords.map(c => [(c[1] - ref[1]) * kx, (c[0] - ref[0]) * ky]);
    const cum = [0];
    for (let i = 1; i < xy.length; i++) cum.push(cum[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
    const total = cum[cum.length - 1];
    return { coords, xy, cum, total, ref, kx, ky, steps, distance: distance || total, duration: duration || total / 1.35 };
  },
  /* điểm gần nhất trên tuyến: { seg, t, dist (m, khoảng cách tới tuyến), along (m, đã đi được dọc tuyến) } */
  nearest(route, pos, hint = 0) {
    const p = [(pos.lng - route.ref[1]) * route.kx, (pos.lat - route.ref[0]) * route.ky], xy = route.xy;
    const scan = (a, b) => {
      let best = null;
      for (let i = Math.max(0, a); i < Math.min(xy.length - 1, b); i++) {
        const ax = xy[i][0], ay = xy[i][1], dx = xy[i + 1][0] - ax, dy = xy[i + 1][1] - ay, l2 = dx * dx + dy * dy;
        let t = l2 ? ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy));
        if (!best || d < best.dist) best = { seg: i, t, dist: d, along: route.cum[i] + t * Math.sqrt(l2) };
      }
      return best;
    };
    let b = scan(hint - 3, hint + 80);              // ưu tiên đoạn quanh vị trí đã đi tới (tránh nhảy sang đoạn khác khi tuyến quay lại)
    if (!b || b.dist > 50) { const full = scan(0, xy.length); if (!b || (full && full.dist < b.dist)) b = full; }
    return b;
  },
  /* bước hiện tại = bước cuối cùng có điểm bắt đầu <= đoạn hiện tại */
  stepIndex(route, seg) {
    let idx = 0;
    route.steps.forEach((s, i) => { if (s.wp && s.wp[0] <= seg) idx = i; });
    return idx;
  },
  gmapsUrl(from, to) {
    return "https://www.google.com/maps/dir/?api=1&travelmode=walking" + (from ? `&origin=${from.lat},${from.lng}` : "") + `&destination=${to.lat},${to.lng}`;
  }
};
