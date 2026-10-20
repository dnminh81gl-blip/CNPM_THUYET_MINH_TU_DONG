/* DeviceService: thống kê THIẾT BỊ quét QR / mở web để nghe thuyết minh. Du khách KHÔNG cần tài khoản.
   - Mỗi trình duyệt tự tạo một mã ngẫu nhiên (deviceId). Không thu tên, email, số điện thoại hay IP.
   - Mở trang  -> POST /api/devices/visits  (hệ điều hành, trình duyệt, loại máy, ngôn ngữ, nguồn "qr"/"web", POI của mã QR)
   - Bắt đầu nghe -> POST /api/devices/listens
   - Đang mở web  -> POST /api/devices/ping mỗi 30 giây (chỉ khi màn hình đang hiện trang) để Admin biết ai đang tham gia
   - Địa chỉ backend: CONFIG.API_BASE nếu có khai báo; nếu web chạy ở localhost / mạng LAN (http) thì tự dùng
     cổng 8080 của cùng máy; trên GitHub Pages (https) mà chưa có backend https thì chỉ ghi lại trong trình duyệt.
   Mã QR của từng POI có dạng: index.html?poi=<id>&src=qr */
const DeviceService = {
  id() {
    let v = Store.get("deviceId", "");
    if (!v) {
      v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : "d-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      Store.set("deviceId", v);
    }
    return v;
  },
  /* >>> ĐỊA CHỈ BACKEND CỐ ĐỊNH (https) — dán tên miền ngrok của nhóm vào đây, ví dụ "https://ten-cua-ban.ngrok-free.app".
     Có địa chỉ này thì MỌI mã QR mở web (kể cả mã in sẵn) đều đếm được thiết bị, không phải tạo mã mới mỗi lần.
     Đây là địa chỉ công khai, không phải mật khẩu; KHÔNG dán authtoken của ngrok vào đây. */
  FIXED_API: "https://smartness-remake-affluent.ngrok-free.dev",

  /* Địa chỉ backend (api-gateway), theo thứ tự ưu tiên:
     1. ?api=https://... trong link / mã QR (điện thoại nhớ lại cho các lần sau)
     2. web chạy ở localhost / mạng LAN (http) -> cổng 8080 của cùng máy (laptop chạy Docker)
     3. FIXED_API ở trên (tên miền ngrok cố định)
     4. địa chỉ đã nhớ từ lần quét mã QR có ?api= trước đó
     5. CONFIG.API_BASE trong js/config.js
     6. địa chỉ https admin nhập ở trang Thiết bị (khi mở Admin trên GitHub Pages)
     Trang https (GitHub Pages) chỉ gọi được backend https. */
  _clean(u) { u = String(u || "").trim().replace(/\/+$/, ""); return /^https:\/\/[^\s/?#]+$/i.test(u) ? u : ""; },
  apiBase() {
    const fromLink = this._clean(new URLSearchParams(location.search).get("api"));
    if (fromLink) { Store.set("apiBase", fromLink); return fromLink; }
    const h = location.hostname;
    const lan = h === "localhost" || h === "127.0.0.1" || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h);
    if (location.protocol === "http:" && lan) return `http://${h}:8080`;
    const fixed = this._clean(this.FIXED_API);
    if (fixed) return fixed;
    const saved = this._clean(Store.get("apiBase", ""));
    if (saved) return saved;
    if (typeof CONFIG !== "undefined" && CONFIG.API_BASE) return String(CONFIG.API_BASE).replace(/\/+$/, "");
    return this._clean(Store.get("publicApi", ""));
  },
  /* ngrok bản miễn phí chèn trang cảnh báo trước nội dung; header này bỏ qua trang đó cho các lệnh gọi API */
  HEADERS: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" },
  /* đọc loại thiết bị từ trình duyệt (chỉ để thống kê, không định danh người dùng) */
  info(ua = navigator.userAgent, touch = navigator.maxTouchPoints || 0) {
    const ipadOs = /Macintosh/.test(ua) && touch > 1;
    const os = /iPhone|iPad|iPod/.test(ua) || ipadOs ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
      : /Mac OS X/.test(ua) ? "macOS" : /Linux|CrOS/.test(ua) ? "Linux" : "Khác";
    const browser = /Zalo/i.test(ua) ? "Zalo" : /FBAN|FBAV|FB_IAB/.test(ua) ? "Facebook" : /coc_coc|CocCoc/i.test(ua) ? "Cốc Cốc"
      : /SamsungBrowser/.test(ua) ? "Samsung" : /Edg(e|A|iOS)?\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera"
      : /Firefox|FxiOS/.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Khác";
    const type = /iPad|Tablet/.test(ua) || ipadOs || (/Android/.test(ua) && !/Mobile/.test(ua)) ? "Máy tính bảng"
      : /Mobi|iPhone|iPod|Android/.test(ua) ? "Điện thoại" : "Máy tính";
    return { os, browser, type };
  },
  /* trang được mở từ mã QR? (?src=qr, hoặc ?poi=<id> là mã QR riêng của một POI) */
  entry(search = location.search) {
    const q = new URLSearchParams(search), poi = Number(q.get("poi")) || null;
    return { src: q.get("src") === "qr" || poi ? "qr" : "web", poiId: poi };
  },
  _local(kind, body) {
    const log = Store.get("deviceLog", []);
    log.push(Object.assign({ kind, at: new Date().toISOString() }, body));
    Store.set("deviceLog", log.slice(-500));
  },
  _post(path, body) {
    this._local(path.endsWith("listens") ? "listen" : "visit", body);
    const base = this.apiBase(); if (!base) return Promise.resolve(false);
    return fetch(base + path, { method: "POST", headers: this.HEADERS, body: JSON.stringify(body), keepalive: true })
      .then(r => r.ok).catch(() => false);
  },
  /* gọi 1 lần khi trang người dùng mở */
  init() {
    const e = this.entry();
    this._post("/api/devices/visits", Object.assign({ deviceId: this.id() }, this.info(), { lang: Settings.get().lang, src: e.src, poiId: e.poiId }));
    Bus.on("audio:start", ({ poi, lang }) => { if (poi) this._post("/api/devices/listens", { deviceId: this.id(), poiId: poi.id, lang: lang || Settings.get().lang }); });
    this.heartbeat();
  },
  PING_MS: 30000,
  ONLINE_MS: 120000,   /* phải khớp DeviceService.ACTIVE_WINDOW ở backend (2 phút) */
  heartbeat() {
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      const base = this.apiBase(); if (!base) return;
      fetch(base + "/api/devices/ping", { method: "POST", headers: this.HEADERS, body: JSON.stringify({ deviceId: this.id() }), keepalive: true }).catch(() => {});
    };
    clearInterval(this._hb); this._hb = setInterval(ping, this.PING_MS);
    document.addEventListener("visibilitychange", ping);
  },
  /* ----- dùng ở trang Admin ----- */
  async _get(path) {
    const base = this.apiBase(); if (!base) throw new Error("no-api");
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
    try { const r = await fetch(base + path, { signal: ctl.signal, headers: { "ngrok-skip-browser-warning": "1" } }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
    finally { clearTimeout(t); }
  },
  isOnline(d, now = Date.now()) { return now - Date.parse(d.lastSeen) <= this.ONLINE_MS; },
  /* số liệu từ backend; không gọi được thì tính từ nhật ký trong trình duyệt này */
  async load() {
    try {
      const [stats, devices] = await Promise.all([this._get("/api/devices/stats"), this._get("/api/devices")]);
      return { source: "server", stats, devices };
    } catch (e) {
      return Object.assign({ source: "local" }, this.localData());
    }
  },
  localData(log = Store.get("deviceLog", []), now = Date.now()) {
    const map = {}, listensByPoi = {}, scansByPoi = {};
    log.forEach(x => {
      const d = map[x.deviceId] || (map[x.deviceId] = { deviceId: x.deviceId, os: x.os || "Khác", browser: x.browser || "Khác", type: x.type || "Khác",
        lang: x.lang || "vi", firstSrc: x.src || "web", firstSeen: x.at, lastSeen: x.at, visits: 0, listens: 0 });
      d.lastSeen = x.at; if (x.lang) d.lang = x.lang;
      if (x.kind === "listen") { d.listens++; d.lastPoiId = x.poiId; listensByPoi[x.poiId] = (listensByPoi[x.poiId] || 0) + 1; }
      else { d.visits++; if (x.src === "qr" && x.poiId) scansByPoi[x.poiId] = (scansByPoi[x.poiId] || 0) + 1; }
    });
    const devices = Object.values(map).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
    const by = k => devices.reduce((o, d) => (o[d[k]] = (o[d[k]] || 0) + 1, o), {});
    const today = new Date(now).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const stats = {
      totalDevices: devices.length,
      todayDevices: devices.filter(d => new Date(d.lastSeen).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) === today).length,
      activeDevices: devices.filter(d => now - Date.parse(d.lastSeen) <= this.ONLINE_MS).length,
      qrDevices: devices.filter(d => d.firstSrc === "qr").length,
      totalVisits: devices.reduce((s, d) => s + d.visits, 0), totalListens: devices.reduce((s, d) => s + d.listens, 0),
      byOs: by("os"), byBrowser: by("browser"), byType: by("type"), byLang: by("lang"), listensByPoi, scansByPoi, onlineByPoi: {}, activeWindowSeconds: this.ONLINE_MS / 1000
    };
    return { stats, devices };
  }
};
