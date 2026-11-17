/* Nội dung & bản dịch: sửa tên + văn bản thuyết minh cho từng ngôn ngữ, theo dõi mức đầy đủ của bản dịch */
const ContentPage = {
  sel: null, lang: "vi", filter: "",
  init() {
    if (!A.init("content")) return;
    $("#app").innerHTML = `
      <div class="adm-title"><h1><i class="fas fa-language"></i> Nội dung & bản dịch</h1><div id="overall"></div></div>
      <div class="adm-note"><i class="fas fa-info-circle"></i> Ngôn ngữ nào chưa có bản dịch thì trang người dùng sẽ đọc bằng tiếng Việt. Lưu bản tiếng Việt thì hệ thống tự gọi Translation Service (MyMemory, lỗi thì dùng từ điển dự phòng) để dịch sang English và 中文. Bạn vẫn có thể sửa tay từng bản dịch, hoặc bấm "Dịch tự động" ở tab English / 中文 để dịch lại.</div>
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
        ${L !== "vi" ? `<button class="btn btn--ghost" id="cauto"><i class="fas fa-magic"></i> Dịch tự động</button><a class="btn btn--ghost" id="cg" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> Mở Google Dịch</a>` : ""}</div>
      ${L !== "vi" ? `<div class="hint" style="margin-top:10px">Bản gốc tiếng Việt: ${Helper.esc(p.text.vi || "")}</div>` : ""}`;
    $$("[data-l]", box).forEach(b => b.onclick = () => { this.lang = b.dataset.l; this.renderEditor(); });
    const upd = () => { const t = $("#ct").value; $("#cc").textContent = t.length + " ký tự"; $("#cd").textContent = "Thời lượng đọc ước tính: " + Helper.mmss(A.dur(t, L, Settings.get().rate)); };
    $("#ct").oninput = upd; upd();
    $("#csave").onclick = () => this.save(p.id, L);
    $("#cplay").onclick = () => { const t = $("#ct").value.trim(); t ? A.speak(t, L) : toast({ title: "Chưa có nội dung", message: "Hãy nhập văn bản trước.", type: "warning" }); };
    const au = $("#cauto"); if (au) au.onclick = () => this.fillOne(p, L, au);
    const g = $("#cg"); if (g) g.href = `https://translate.google.com/?sl=vi&tl=${L}&text=${encodeURIComponent(p.text.vi || "")}&op=translate`;
  },
  save(id, L) {
    const name = $("#cn").value.trim(), text = $("#ct").value.trim();
    if (L === "vi" && (!name || !text)) { toast({ title: "Thiếu thông tin", message: "Bản tiếng Việt không được để trống.", type: "warning" }); return; }
    const l = A.pois(), p = l.find(x => x.id === id);
    /* tiếng Việt đổi thì bản dịch cũ không còn đúng: dịch lại; bản dịch còn trống thì dịch luôn */
    const others = Object.keys(LANGS).filter(k => k !== "vi");
    const todo = L !== "vi" ? [] : others.filter(k => text !== (p.text.vi || "") || name !== (p.name.vi || "") || !A.has(p, k));
    const nameChanged = name !== (p.name.vi || ""), textChanged = text !== (p.text.vi || "");
    p.name[L] = name; p.text[L] = text; A.savePois(l);
    toast({ title: "Đã lưu", message: `${p.name.vi} - ${LANGS[L].f}`, type: "success" }); this.renderList(); this.renderEditor();
    if (todo.length) this.autoTranslate(id, todo, nameChanged, textChanged);
  },
  /* ----- Dịch tự động qua Translation Service: POST /api/translations/translate (đi qua api-gateway) ----- */
  async translate(text, target) {
    const base = DeviceService.apiBase(); if (!base) throw new Error("Chưa cấu hình địa chỉ backend");
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(base + "/api/translations/translate", { method: "POST", signal: ctl.signal,
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" },
        body: JSON.stringify({ text, sourceLang: "vi", targetLang: target }) });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d || !d.success || !d.translatedText) throw new Error((d && d.message) || ("HTTP " + r.status));
      return { text: d.translatedText, engine: d.engine };
    } finally { clearTimeout(t); }
  },
  /* sau khi lưu bản tiếng Việt: dịch tên + nội dung sang các ngôn ngữ còn lại rồi lưu */
  async autoTranslate(id, langs, nameChanged, textChanged) {
    const src = A.pois().find(x => x.id === id); if (!src) return;
    toast({ title: "Đang dịch tự động...", message: `${src.name.vi} → ${langs.map(k => LANGS[k].f).join(", ")}`, type: "info", duration: 3000 });
    const done = [], engines = new Set();
    try {
      const res = await Promise.all(langs.map(async k => {
        const needName = nameChanged || !(src.name[k] || "").trim(), needText = textChanged || !(src.text[k] || "").trim();
        const [n, t] = await Promise.all([needName ? this.translate(src.name.vi, k) : null, needText ? this.translate(src.text.vi, k) : null]);
        return { k, n, t };
      }));
      const l = A.pois(), p = l.find(x => x.id === id); if (!p) return;
      res.forEach(({ k, n, t }) => {
        if (n) { p.name[k] = n.text; engines.add(n.engine); }
        if (t) { p.text[k] = t.text; engines.add(t.engine); }
        if (n || t) done.push(LANGS[k].f);
      });
      A.savePois(l);
      toast({ title: "Đã dịch xong", message: `${p.name.vi}: ${done.join(", ")} (${[...engines].join(", ")})`, type: "success", duration: 4500 });
    } catch (e) {
      toast({ title: "Chưa dịch tự động được", message: `${e.message}. Hãy bật backend, hoặc nhập tay / dùng "Mở Google Dịch".`, type: "warning", duration: 6000 });
    }
    if (this.sel === id) { this.renderList(); this.renderEditor(); }
  },
  /* nút "Dịch tự động" ở tab English / 中文: điền bản dịch vào ô, chưa lưu cho tới khi bấm Lưu */
  async fillOne(p, L, btn) {
    if (!(p.text.vi || "").trim()) { toast({ title: "Chưa có bản tiếng Việt", message: "Hãy nhập bản tiếng Việt trước.", type: "warning" }); return; }
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang dịch...';
    try {
      const [n, t] = await Promise.all([this.translate(p.name.vi, L), this.translate(p.text.vi, L)]);
      if (this.sel !== p.id || this.lang !== L) return;
      $("#cn").value = n.text; $("#ct").value = t.text; $("#ct").oninput();
      toast({ title: "Đã dịch", message: `Kiểm tra lại rồi bấm "Lưu bản ${L.toUpperCase()}" (${t.engine}).`, type: "success", duration: 4500 });
    } catch (e) {
      toast({ title: "Chưa dịch được", message: `${e.message}. Hãy bật backend, hoặc dùng "Mở Google Dịch".`, type: "warning", duration: 6000 });
    } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-magic"></i> Dịch tự động'; } }
  }
};
document.addEventListener("DOMContentLoaded", () => ContentPage.init());
