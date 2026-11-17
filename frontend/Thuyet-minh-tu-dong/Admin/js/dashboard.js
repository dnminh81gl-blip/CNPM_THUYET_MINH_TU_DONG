/* Tổng quan: số liệu chính, biểu đồ lượt nghe 12 giờ qua, việc cần xử lý.
   Lượt nghe lấy từ backend (GET /api/devices/listens: mọi thiết bị); chưa chạy backend thì dùng lịch sử trong trình duyệt này. */
const DashPage = {
  HOURS: 12,
  init() {
    if (!A.init("dashboard")) return;
    const pois = A.pois(), langs = Object.keys(LANGS), hist = HistoryService.all(), users = AuthService.users();
    const pub = pois.filter(p => p.status !== "draft").length, total = pois.length * langs.length, done = pois.reduce((s, p) => s + langs.filter(k => A.has(p, k)).length, 0);
    const missing = pois.filter(p => langs.some(k => !A.has(p, k))), drafts = pois.filter(p => p.status === "draft");
    const card = (i, c, v, t, link) => `<a class="stat" href="${link}" style="text-decoration:none;color:inherit"><i class="fas ${i}" style="background:${c}"></i><div><b>${v}</b><span>${t}</span></div></a>`;
    $("#app").innerHTML = `
      <div class="adm-title"><h1><i class="fas fa-chart-pie"></i> Tổng quan</h1></div>
      <div class="stats">
        ${card("fa-map-marker-alt", "#2563eb", pois.length, `POI (${pub} xuất bản)`, "places.html")}
        ${card("fa-language", "#10b981", total ? Math.round(done / total * 100) + "%" : "0%", "Bản dịch hoàn thành", "content.html")}
        <span id="lisCard" style="display:contents">${card("fa-headphones", "#f59e0b", hist.length, "Tổng lượt nghe", "history.html")}</span>
        <span id="devCard" style="display:contents">${card("fa-user-check", "#22c55e", "…", "Đang tham gia", "devices.html")}</span>
      </div>
      <div class="grid2">
        <div class="adm-card"><h3>Lượt nghe 12 giờ qua</h3><div class="cols" id="byHour"></div></div>
        <div class="adm-card"><h3>Việc cần xử lý</h3>
          ${missing.length ? `<p style="margin-bottom:8px"><span class="badge warn">${missing.length}</span> địa điểm còn thiếu bản dịch:</p><div class="mini" style="margin-bottom:12px">${missing.map(p => `<a class="tag" href="content.html">${Helper.esc(p.name.vi)}</a>`).join("")}</div>` : `<p style="margin-bottom:12px"><span class="badge ok">✓</span> Tất cả địa điểm đã có đủ bản dịch.</p>`}
          ${drafts.length ? `<p style="margin-bottom:8px"><span class="badge warn">${drafts.length}</span> địa điểm đang ở dạng nháp (chưa hiện trên web).</p>` : ""}
          <div class="mini" style="margin-top:14px"><a class="btn btn--primary" href="places.html"><i class="fas fa-plus"></i> Thêm địa điểm</a><a class="btn btn--ghost" href="../index.html"><i class="fas fa-external-link-alt"></i> Xem trang web</a></div></div>
      </div>
      <div class="adm-note"><i class="fas fa-shield-alt"></i> Lưu ý: việc kiểm tra quyền admin hiện chạy ngay trong trình duyệt và dữ liệu lưu trong trình duyệt (bản demo), nên chưa phải bảo mật thật. Khi triển khai, cần xác thực + phân quyền admin ở backend (JWT/RBAC) và lưu dữ liệu trong CSDL. </div>`;
    /* số thiết bị lấy từ backend (hoặc nhật ký trình duyệt nếu chưa chạy backend) */
    const dev = () => DeviceService.load().then(d => { const el = $("#devCard"); if (el) el.innerHTML = card("fa-user-check", "#22c55e", d.stats.activeDevices || 0, `Đang tham gia · ${d.stats.totalDevices} thiết bị đã quét` + (d.source === "local" ? " (trình duyệt này)" : ""), "devices.html"); });
    /* lượt nghe: tổng + biểu đồ theo giờ */
    const listens = list => {
      const hours = A.lastHours(this.HOURS), from = Date.now() - this.HOURS * 36e5, cnt = {};
      list.filter(h => h.at >= from).forEach(h => { const k = A.hourKey(h.at); cnt[k] = (cnt[k] || 0) + 1; });
      const mx = Math.max(1, ...hours.map(x => cnt[x.key] || 0));
      $("#byHour").innerHTML = hours.map(x => `<div class="col-bar"><b>${cnt[x.key] || 0}</b><i style="height:${(cnt[x.key] || 0) / mx * 130}px"></i><span>${x.label}</span></div>`).join("");
      const el = $("#lisCard"); if (el) el.innerHTML = card("fa-headphones", "#f59e0b", list.length, "Tổng lượt nghe", "history.html");
    };
    const lis = () => DeviceService._get("/api/devices/listens")
      .then(l => listens([...(Array.isArray(l) ? l : []).map(x => ({ at: Date.parse(x.at) })).filter(x => !isNaN(x.at)), ...hist.filter(h => h.demo)]))
      .catch(() => listens(hist));
    listens(hist); lis();
    dev(); setInterval(() => { dev(); lis(); }, 5000);
  }
};
document.addEventListener("DOMContentLoaded", () => DashPage.init());
