/* Quản lý thiết bị: du khách KHÔNG cần tài khoản, mỗi thiết bị quét QR / mở web được đếm ẩn danh.
   Số liệu lấy từ backend (GET /api/devices/stats, /api/devices); chưa chạy backend thì xem nhật ký của trình duyệt này.
   Mỗi POI có một mã QR riêng: in ra dán tại điểm đó, du khách quét là mở đúng bài thuyết minh. */
const SITE_URL = "https://dnminh81gl-blip.github.io/CNPM_THUYET_MINH_TU_DONG/";
const DevicesPage = {
  timer: null,
  init() {
    if (!A.init("devices")) return;
    const base = Store.get("qrBase", "") || this.defaultBase();
    $("#app").innerHTML = `
      <div class="adm-title"><h1><i class="fas fa-mobile-alt"></i> Quản lý thiết bị</h1></div>
      <div class="adm-note" id="src"></div>
      <div class="stats" id="stats"></div>
      <div class="grid2">
        <div class="adm-card"><h3>Hệ điều hành</h3><div id="byOs"></div></div>
        <div class="adm-card"><h3>Trình duyệt</h3><div id="byBrowser"></div></div>
        <div class="adm-card"><h3>Loại thiết bị</h3><div id="byType"></div></div>
        <div class="adm-card"><h3>Ngôn ngữ nghe</h3><div id="byLang"></div></div>
      </div>
      <div class="adm-card"><h3>Mã QR và lượt nghe theo POI</h3>
        <div class="toolbar"><label class="hint" style="margin:0">Địa chỉ web trong mã QR</label><input class="input-field" id="qrBase" style="max-width:none" value="${Helper.esc(base)}" />
          <button class="btn btn--ghost" id="qrBaseSave"><i class="fas fa-save"></i> Lưu</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>POI</th><th>Khu vực</th><th>Lượt quét QR</th><th>Lượt nghe</th><th>Mã QR</th></tr></thead><tbody id="poiRows"></tbody></table></div></div>
      <div class="adm-card"><h3>Thiết bị gần đây</h3>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mã thiết bị</th><th>Loại</th><th>Hệ điều hành</th><th>Trình duyệt</th><th>Ngôn ngữ</th><th>Nguồn</th><th>Lần đầu</th><th>Gần nhất</th><th>Lượt mở</th><th>Lượt nghe</th></tr></thead><tbody id="devRows"></tbody></table></div></div>`;
    $("#qrBaseSave").onclick = () => { Store.set("qrBase", $("#qrBase").value.trim()); toast({ title: "Đã lưu", message: "Mã QR sẽ dùng địa chỉ này.", type: "success" }); };
    $("#poiRows").onclick = e => { const b = e.target.closest("[data-qr]"); if (b) this.showQr(Number(b.dataset.qr)); };
    $("#qrPrint").onclick = () => this.printQr();
    $("#qrCopy").onclick = () => { const t = $("#qrLink").textContent; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast({ title: "Đã sao chép", message: t, type: "success" })).catch(() => {}); };
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 10000);
  },
  /* chạy Admin ở localhost thì mã QR trỏ về bản GitHub Pages (điện thoại không mở được localhost của laptop) */
  defaultBase() {
    const h = location.hostname;
    if (h === "localhost" || h === "127.0.0.1" || location.protocol === "file:") return SITE_URL;
    return location.href.replace(/Admin\/[^/]*$/, "");
  },
  link(id) { const b = ($("#qrBase") && $("#qrBase").value.trim()) || this.defaultBase(); return b.replace(/index\.html$/, "").replace(/\/?$/, "/") + "index.html?poi=" + id + "&src=qr"; },
  async refresh() {
    const d = await DeviceService.load(), s = d.stats;
    $("#src").innerHTML = d.source === "server"
      ? `<i class="fas fa-server"></i> Số liệu từ backend (<code>${Helper.esc(DeviceService.apiBase())}/api/devices</code>), tự cập nhật mỗi 10 giây. Không lưu tên, email hay IP: mỗi thiết bị chỉ có một mã ngẫu nhiên.`
      : `<i class="fas fa-info-circle"></i> Chưa kết nối được backend nên đang hiện <b>nhật ký của trình duyệt này</b>. Bật Docker và mở web bằng Live Server (http://localhost hoặc IP mạng LAN) để thấy số liệu của mọi thiết bị.`;
    const card = (i, c, v, t) => `<div class="stat"><i class="fas ${i}" style="background:${c}"></i><div><b>${v}</b><span>${t}</span></div></div>`;
    $("#stats").innerHTML = card("fa-mobile-alt", "#2563eb", s.totalDevices, "Tổng số thiết bị")
      + card("fa-calendar-day", "#10b981", s.todayDevices, "Thiết bị hôm nay")
      + card("fa-signal", "#f59e0b", s.activeDevices, `Đang dùng (${s.activeWindowMinutes || 15} phút qua)`)
      + card("fa-qrcode", "#8b5cf6", s.qrDevices, "Vào bằng mã QR")
      + card("fa-headphones", "#ec4899", s.totalListens, "Lượt nghe");
    [["byOs", s.byOs], ["byBrowser", s.byBrowser], ["byType", s.byType], ["byLang", this.langNames(s.byLang)]].forEach(([el, m]) => $("#" + el).innerHTML = this.bars(m));
    const pois = POIService.raw(), lis = s.listensByPoi || {}, sc = s.scansByPoi || {};
    $("#poiRows").innerHTML = pois.map(p => `<tr><td>${p.id}</td><td><b>${Helper.esc(p.name.vi)}</b></td><td>${Helper.esc(p.cat || "")}</td><td>${sc[p.id] || 0}</td><td>${lis[p.id] || 0}</td>
      <td><button class="btn btn--ghost" data-qr="${p.id}"><i class="fas fa-qrcode"></i> Xem / in</button></td></tr>`).join("");
    const lang = l => (LANGS[l] || { f: l }).f, t = iso => iso ? new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }) : "";
    $("#devRows").innerHTML = d.devices.length ? d.devices.slice(0, 50).map(x => `<tr><td><code>${Helper.esc(String(x.deviceId).slice(0, 8))}</code></td><td>${Helper.esc(x.type)}</td><td>${Helper.esc(x.os)}</td><td>${Helper.esc(x.browser)}</td><td>${Helper.esc(lang(x.lang))}</td>
      <td><span class="badge ${x.firstSrc === "qr" ? "ok" : ""}">${x.firstSrc === "qr" ? "Mã QR" : "Link"}</span></td><td>${t(x.firstSeen)}</td><td>${t(x.lastSeen)}</td><td>${x.visits}</td><td>${x.listens}</td></tr>`).join("")
      : `<tr><td colspan="10" class="empty">Chưa có thiết bị nào. Mở web (hoặc quét mã QR) trên điện thoại để thấy thiết bị hiện tại đây.</td></tr>`;
  },
  langNames(m) { const o = {}; Object.entries(m || {}).forEach(([k, v]) => { o[(LANGS[k] || { f: k }).f] = v; }); return o; },
  bars(m) {
    const e = Object.entries(m || {}).sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...e.map(x => x[1]));
    return e.length ? e.map(([k, v]) => `<div style="display:flex;align-items:center;gap:8px;margin:6px 0"><span style="width:110px;flex:none">${Helper.esc(k)}</span>
      <i style="display:block;height:12px;border-radius:6px;background:linear-gradient(90deg,#ffb339,#f59e0b);width:${Math.max(4, v / mx * 100)}%"></i><b>${v}</b></div>`).join("")
      : `<div class="hint">Chưa có dữ liệu.</div>`;
  },
  showQr(id) {
    const p = POIService.raw().find(x => x.id === id); if (!p) return;
    const url = this.link(id);
    $("#qrTitle").textContent = p.name.vi; $("#qrSub").textContent = "Quét để nghe thuyết minh · Tiếng Việt · English · 中文"; $("#qrLink").textContent = url;
    const box = $("#qrBox"); box.innerHTML = "";
    if (window.QRCode) new QRCode(box, { text: url, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
    else box.innerHTML = `<div class="hint">Không tải được thư viện tạo mã QR (cần Internet). Có thể dùng link bên dưới.</div>`;
    Modal.open("qrModal");
  },
  printQr() {
    const img = $("#qrBox img") || $("#qrBox canvas"); if (!img) return;
    const src = img.tagName === "CANVAS" ? img.toDataURL() : img.src, w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>${Helper.esc($("#qrTitle").textContent)}</title></head><body style="font-family:sans-serif;text-align:center;padding:30px">
      <h1>${Helper.esc($("#qrTitle").textContent)}</h1><p>Quét để nghe thuyết minh · Tiếng Việt · English · 中文</p><img src="${src}" style="width:320px;height:320px" />
      <p style="color:#666;font-size:12px">Dinh Độc Lập · Thuyết minh tự động</p><script>onload=()=>print()<\/script></body></html>`);
    w.document.close();
  }
};
document.addEventListener("DOMContentLoaded", () => DevicesPage.init());
