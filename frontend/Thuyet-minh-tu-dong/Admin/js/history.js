/* Lịch sử & thống kê: lượt nghe theo điểm, ngôn ngữ, ngày; xuất CSV; dữ liệu mẫu để demo */
const HistoryPage = {
  days: 7, page: 1,
  init() {
    if (!A.init("history")) return;
    $("#app").innerHTML = `
      <div class="adm-title"><h1><i class="fas fa-chart-line"></i> Lịch sử & thống kê</h1>
        <div class="mini"><select class="input-field" id="rng" style="margin:0;width:auto"><option value="7">7 ngày qua</option><option value="14">14 ngày qua</option><option value="30">30 ngày qua</option></select>
          <button class="btn btn--ghost" id="seed"><i class="fas fa-flask"></i> Tạo dữ liệu mẫu</button>
          <button class="btn btn--ghost" id="unseed"><i class="fas fa-eraser"></i> Xoá dữ liệu mẫu</button>
          <button class="btn btn--primary" id="csv"><i class="fas fa-download"></i> Xuất CSV</button></div></div>
      <div class="adm-note"><i class="fas fa-info-circle"></i> Số liệu được gom từ lịch sử nghe lưu trong trình duyệt này (mọi tài khoản và khách). Khi có backend, History Service sẽ thu thập từ mọi thiết bị. Dòng có nhãn "mẫu" là dữ liệu tạo thử để minh hoạ.</div>
      <div class="stats" id="stats"></div>
      <div class="adm-card"><h3>Lượt nghe theo ngày</h3><div class="cols" id="byDay"></div></div>
      <div class="grid2"><div class="adm-card"><h3>Theo địa điểm</h3><div class="bars" id="byPoi"></div></div><div class="adm-card"><h3>Theo ngôn ngữ</h3><div class="bars" id="byLang"></div></div></div>
      <div class="adm-card"><h3>Lượt nghe gần đây</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Thời gian</th><th>Người dùng</th><th>Địa điểm</th><th>Ngôn ngữ</th></tr></thead><tbody id="rows"></tbody></table></div><div class="pager" id="pager"></div></div>`;
    $("#rng").onchange = e => { this.days = Number(e.target.value); this.page = 1; this.render(); };
    $("#seed").onclick = () => this.seed(); $("#unseed").onclick = () => this.unseed(); $("#csv").onclick = () => this.csv();
    this.render();
  },
  data() { const from = Date.now() - this.days * 864e5; return HistoryService.all().filter(h => h.at >= from); },
  render() {
    const d = this.data(), pois = A.pois(), nameOf = id => (pois.find(p => p.id === id) || { name: { vi: "(đã xoá)" } }).name.vi;
    const users = new Set(d.map(h => h.uid)).size, top = {};
    d.forEach(h => top[h.poiId] = (top[h.poiId] || 0) + 1);
    const best = Object.entries(top).sort((a, b) => b[1] - a[1])[0];
    $("#stats").innerHTML = [["fa-headphones", "#2563eb", d.length, "Lượt nghe"], ["fa-users", "#10b981", users, "Người nghe"], ["fa-trophy", "#f59e0b", best ? nameOf(Number(best[0])) : "—", "Điểm nghe nhiều nhất"], ["fa-calendar-day", "#8b5cf6", (d.length / this.days).toFixed(1), "Lượt nghe / ngày"]]
      .map(([i, c, v, t]) => `<div class="stat"><i class="fas ${i}" style="background:${c}"></i><div><b style="${String(v).length > 8 ? "font-size:17px" : ""}">${Helper.esc(v)}</b><span>${t}</span></div></div>`).join("");
    const days = A.lastDays(Math.min(this.days, 14)), cnt = {}; d.forEach(h => { const k = A.dayKey(h.at); cnt[k] = (cnt[k] || 0) + 1; });
    const mx = Math.max(1, ...days.map(x => cnt[x.key] || 0));
    $("#byDay").innerHTML = days.map(x => `<div class="col-bar"><b>${cnt[x.key] || 0}</b><i style="height:${(cnt[x.key] || 0) / mx * 130}px"></i><span>${x.label}</span></div>`).join("");
    const bars = (obj, label) => { const e = Object.entries(obj).sort((a, b) => b[1] - a[1]), m = Math.max(1, ...e.map(x => x[1])); return e.length ? e.map(([k, v]) => `<div class="bar-row"><span>${Helper.esc(label(k))}</span><div class="tr"><i style="width:${v / m * 100}%"></i></div><b>${v}</b></div>`).join("") : `<div class="empty">Chưa có dữ liệu.</div>`; };
    $("#byPoi").innerHTML = bars(top, k => nameOf(Number(k)));
    const lg = {}; d.forEach(h => lg[h.lang] = (lg[h.lang] || 0) + 1); $("#byLang").innerHTML = bars(lg, k => (LANGS[k] || { f: k }).f);
    const r = A.paginate(d, this.page, 10); this.page = r.page;
    $("#rows").innerHTML = r.rows.length ? r.rows.map(h => `<tr><td>${Helper.time(h.at)}</td><td>${Helper.esc(h.user)}</td><td>${Helper.esc(nameOf(h.poiId))}</td><td>${(LANGS[h.lang] || { f: h.lang }).f} ${h.demo ? '<span class="badge">mẫu</span>' : ""}</td></tr>`).join("") : `<tr><td colspan="4" class="empty">Chưa có lượt nghe nào trong khoảng này.</td></tr>`;
    A.pager($("#pager"), r.page, r.pages, n => { this.page = n; this.render(); });
  },
  seed() {
    const pois = POIService.all(); if (!pois.length) { toast({ title: "Chưa có địa điểm", message: "Hãy thêm địa điểm trước.", type: "warning" }); return; }
    const key = "history:guest", cur = Store.get(key, []), langs = Object.keys(LANGS), add = [];
    for (let i = 0; i < 60; i++) add.push({ poiId: pois[Math.floor(Math.random() * pois.length)].id, lang: langs[Math.floor(Math.random() * 3)], at: Date.now() - Math.floor(Math.random() * 7 * 864e5), demo: true });
    Store.set(key, [...add, ...cur].sort((a, b) => b.at - a.at)); toast({ title: "Đã tạo 60 lượt nghe mẫu", message: "Gắn nhãn \"mẫu\" để phân biệt.", type: "success" }); this.render();
  },
  unseed() {
    let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith("ttd:history:")) continue; const l = JSON.parse(localStorage.getItem(k)) || [], keep = l.filter(h => !h.demo); n += l.length - keep.length; localStorage.setItem(k, JSON.stringify(keep)); } } catch (e) {}
    toast({ title: "Đã xoá dữ liệu mẫu", message: n + " dòng", type: "success" }); this.render();
  },
  csv() {
    const pois = A.pois(), rows = [["Thoi gian", "Nguoi dung", "Dia diem", "Ngon ngu", "Mau"], ...this.data().map(h => [new Date(h.at).toISOString(), h.user, (pois.find(p => p.id === h.poiId) || { name: { vi: "" } }).name.vi, h.lang, h.demo ? "x" : ""])];
    const csv = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "lich-su-nghe.csv"; a.click(); URL.revokeObjectURL(a.href);
  }
};
document.addEventListener("DOMContentLoaded", () => HistoryPage.init());
