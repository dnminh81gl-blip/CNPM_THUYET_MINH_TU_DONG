/* Tổng quan: số liệu chính, biểu đồ 7 ngày, việc cần xử lý */
const DashPage = {
  init() {
    if (!A.init("dashboard")) return;
    const pois = A.pois(), langs = Object.keys(LANGS), hist = HistoryService.all(), users = AuthService.users(), tours = A.tours();
    const pub = pois.filter(p => p.status !== "draft").length, total = pois.length * langs.length, done = pois.reduce((s, p) => s + langs.filter(k => A.has(p, k)).length, 0);
    const missing = pois.filter(p => langs.some(k => !A.has(p, k))), drafts = pois.filter(p => p.status === "draft");
    const weekAgo = Date.now() - 7 * 864e5, week = hist.filter(h => h.at >= weekAgo);
    const days = A.lastDays(7), cnt = {}; week.forEach(h => { const k = A.dayKey(h.at); cnt[k] = (cnt[k] || 0) + 1; }); const mx = Math.max(1, ...days.map(x => cnt[x.key] || 0));
    const card = (i, c, v, t, link) => `<a class="stat" href="${link}" style="text-decoration:none;color:inherit"><i class="fas ${i}" style="background:${c}"></i><div><b>${v}</b><span>${t}</span></div></a>`;
    $("#app").innerHTML = `
      <div class="adm-title"><h1><i class="fas fa-chart-pie"></i> Tổng quan</h1></div>
      <div class="stats">
        ${card("fa-map-marker-alt", "#2563eb", pois.length, `Địa điểm (${pub} xuất bản)`, "places.html")}
        ${card("fa-language", "#10b981", total ? Math.round(done / total * 100) + "%" : "0%", "Bản dịch hoàn thành", "content.html")}
        ${card("fa-headphones", "#f59e0b", hist.length, "Tổng lượt nghe", "history.html")}
        ${card("fa-route", "#8b5cf6", tours.length, "Tour gợi ý", "tours.html")}
        ${card("fa-users", "#ec4899", users.length, "Tài khoản", "users.html")}
      </div>
      <div class="grid2">
        <div class="adm-card"><h3>Lượt nghe 7 ngày qua</h3><div class="cols">${days.map(x => `<div class="col-bar"><b>${cnt[x.key] || 0}</b><i style="height:${(cnt[x.key] || 0) / mx * 130}px"></i><span>${x.label}</span></div>`).join("")}</div></div>
        <div class="adm-card"><h3>Việc cần xử lý</h3>
          ${missing.length ? `<p style="margin-bottom:8px"><span class="badge warn">${missing.length}</span> địa điểm còn thiếu bản dịch:</p><div class="mini" style="margin-bottom:12px">${missing.map(p => `<a class="tag" href="content.html">${Helper.esc(p.name.vi)}</a>`).join("")}</div>` : `<p style="margin-bottom:12px"><span class="badge ok">✓</span> Tất cả địa điểm đã có đủ bản dịch.</p>`}
          ${drafts.length ? `<p style="margin-bottom:8px"><span class="badge warn">${drafts.length}</span> địa điểm đang ở dạng nháp (chưa hiện trên web).</p>` : ""}
          ${!tours.length ? `<p><span class="badge">!</span> Chưa có tour gợi ý nào cho người dùng.</p>` : ""}
          <div class="mini" style="margin-top:14px"><a class="btn btn--primary" href="places.html"><i class="fas fa-plus"></i> Thêm địa điểm</a><a class="btn btn--ghost" href="../index.html"><i class="fas fa-external-link-alt"></i> Xem trang web</a></div></div>
      </div>
      <div class="adm-note"><i class="fas fa-shield-alt"></i> Lưu ý: việc kiểm tra quyền admin hiện chạy ngay trong trình duyệt và dữ liệu lưu trong trình duyệt (bản demo), nên chưa phải bảo mật thật. Khi triển khai, cần xác thực + phân quyền admin ở backend (JWT/RBAC) và lưu dữ liệu trong CSDL. Nhớ đổi mật khẩu admin mặc định ở trang chủ: Hồ sơ > Mật khẩu.</div>`;
  }
};
document.addEventListener("DOMContentLoaded", () => DashPage.init());
