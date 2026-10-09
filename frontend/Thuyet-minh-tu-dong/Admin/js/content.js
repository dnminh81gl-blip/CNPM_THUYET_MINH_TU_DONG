/* Nội dung & bản dịch: sửa tên + văn bản thuyết minh cho từng ngôn ngữ, theo dõi mức đầy đủ của bản dịch */
const ContentPage = {
  sel: null, lang: "vi", filter: "",
  init() {
    if (!A.init("content")) return;
    $("#app").innerHTML = `
      <div class="adm-title"><h1><i class="fas fa-language"></i> Nội dung & bản dịch</h1><div id="overall"></div></div>
      <div class="adm-note"><i class="fas fa-info-circle"></i> Ngôn ngữ nào chưa có bản dịch thì trang người dùng sẽ đọc bằng tiếng Việt. Bản dịch tự động bằng AI sẽ do Translation Service ở backend đảm nhiệm; hiện tại bạn nhập tay hoặc dùng nút "Mở Google Dịch" rồi dán kết quả vào.</div>
      <div class="split">
        <div class="adm-card"><h3>Địa điểm</h3>
          <select class="input-field" id="flt"><option value="">Tất cả</option><option value="missing">Chỉ địa điểm còn thiếu bản dịch</option></select>
          <div class="plist" id="plist"></div></div>
        <div class="adm-card" id="editor"></div>
      </div>`;
    $("#flt").onchange = e => { this.filter = e.target.value; this.renderList(); };
    $("#plist").onclick = e => { const it = e.target.closest("[data-id]"); if (it) { this.sel = Number(it.dataset.id); this.renderList(); this.renderEditor(); } };
    const l = A.pois(); this.sel = l.length ? l[0].id : null;
    this.renderList(); this.renderEditor();
  },
  renderList() {
    const l = A.pois(), langs = Object.keys(LANGS);
    const total = l.length * langs.length, done = l.reduce((s, p) => s + langs.filter(k => A.has(p, k)).length, 0);
    $("#overall").innerHTML = `<span class="badge ${done === total ? "ok" : "warn"}">Hoàn thành ${total ? Math.round(done / total * 100) : 0}% (${done}/${total} bản)</span>`;
    const rows = l.filter(p => this.filter !== "missing" || langs.some(k => !A.has(p, k)));
    $("#plist").innerHTML = rows.length ? rows.map(p => `<div class="pitem ${p.id === this.sel ? "on" : ""}" data-id="${p.id}">
      <div class="ico" style="background:${A.gradOf(p)}"><i class="fas ${p.icon}"></i></div>
      <div><b>${Helper.esc(p.name.vi)}</b><div class="lg">${langs.map(k => `<span class="lgb ${A.has(p, k) ? "ok" : ""}">${k.toUpperCase()}</span>`).join("")}</div></div></div>`).join("")
      : `<div class="empty">Không có mục nào.</div>`;
  },
  renderEditor() {
    const p = A.pois().find(x => x.id === this.sel), box = $("#editor");
    if (!p) { box.innerHTML = `<div class="empty">Chưa có địa điểm nào. Hãy thêm ở trang Địa điểm.</div>`; return; }
    const L = this.lang, name = p.name[L] || "", text = p.text[L] || "";
    box.innerHTML = `<h3>${Helper.esc(p.name.vi)} <span class="badge ${p.status === "draft" ? "warn" : "ok"}">${p.status === "draft" ? "Nháp" : "Đã xuất bản"}</span></h3>
      <div class="tabs">${Object.keys(LANGS).map(k => `<button class="${k === L ? "on" : ""}" data-l="${k}">${LANGS[k].f} ${A.has(p, k) ? "✓" : ""}</button>`).join("")}</div>
      <label class="lb">Tên hiển thị (${LANGS[L].f})</label><input class="input-field" id="cn" maxlength="80" value="${Helper.esc(name)}" />
      <label class="lb">Nội dung thuyết minh (${LANGS[L].f})</label><textarea class="input-field" id="ct" style="height:200px" maxlength="1500">${Helper.esc(text)}</textarea>
      <div class="meta"><span id="cc"></span><span id="cd"></span></div>
      <div class="mini"><button class="btn btn--primary" id="csave"><i class="fas fa-save"></i> Lưu bản ${L.toUpperCase()}</button>
        <button class="btn btn--ghost" id="cplay"><i class="fas fa-play"></i> Nghe thử</button>
        ${L !== "vi" ? `<a class="btn btn--ghost" id="cg" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> Mở Google Dịch</a>` : ""}</div>
      ${L !== "vi" ? `<div class="hint" style="margin-top:10px">Bản gốc tiếng Việt: ${Helper.esc(p.text.vi || "")}</div>` : ""}`;
    $$("[data-l]", box).forEach(b => b.onclick = () => { this.lang = b.dataset.l; this.renderEditor(); });
    const upd = () => { const t = $("#ct").value; $("#cc").textContent = t.length + " ký tự"; $("#cd").textContent = "Thời lượng đọc ước tính: " + Helper.mmss(A.dur(t, L, Settings.get().rate)); };
    $("#ct").oninput = upd; upd();
    $("#csave").onclick = () => this.save(p.id, L);
    $("#cplay").onclick = () => { const t = $("#ct").value.trim(); t ? A.speak(t, L) : toast({ title: "Chưa có nội dung", message: "Hãy nhập văn bản trước.", type: "warning" }); };
    const g = $("#cg"); if (g) g.href = `https://translate.google.com/?sl=vi&tl=${L}&text=${encodeURIComponent(p.text.vi || "")}&op=translate`;
  },
  save(id, L) {
    const name = $("#cn").value.trim(), text = $("#ct").value.trim();
    if (L === "vi" && (!name || !text)) { toast({ title: "Thiếu thông tin", message: "Bản tiếng Việt không được để trống.", type: "warning" }); return; }
    const l = A.pois(), p = l.find(x => x.id === id); p.name[L] = name; p.text[L] = text; A.savePois(l);
    toast({ title: "Đã lưu", message: `${p.name.vi} - ${LANGS[L].f}`, type: "success" }); this.renderList(); this.renderEditor();
  }
};
document.addEventListener("DOMContentLoaded", () => ContentPage.init());
