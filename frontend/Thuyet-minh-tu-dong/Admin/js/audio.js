/* Quản lý audio: chọn giọng đọc cho từng ngôn ngữ, nghe thử từng điểm × ngôn ngữ, xem thời lượng ước tính */
const AudioPage = {
  init() {
    if (!A.init("audio")) return;
    $("#app").innerHTML = `
      <div class="adm-title"><h1><i class="fas fa-volume-up"></i> Quản lý audio</h1></div>
      <div class="adm-note"><i class="fas fa-info-circle"></i> Bản hiện tại đọc bằng giọng có sẵn của trình duyệt (Web Speech API), nên danh sách giọng phụ thuộc máy bạn đang dùng. Khi có backend, TTS Service sẽ tạo file audio, lưu vào kho (MinIO/S3) và trang này sẽ quản lý các file đó (tạo lại, tải lên audio thu sẵn).</div>
      <div class="adm-card"><h3>Giọng đọc theo ngôn ngữ</h3><div id="voices" class="fgrid"></div>
        <div class="fgrid"><div><label class="lb">Tốc độ đọc mặc định</label><input type="range" id="rate" min="0.7" max="1.3" step="0.1" style="width:100%;accent-color:#f59e0b" /><div class="hint" id="rv"></div></div></div></div>
      <div class="adm-card"><h3>Nghe thử từng địa điểm <button class="btn btn--ghost" id="stop" style="height:34px;padding:0 14px"><i class="fas fa-stop"></i> Dừng</button></h3>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Địa điểm</th>${Object.keys(LANGS).map(k => `<th>${LANGS[k].f}</th>`).join("")}</tr></thead><tbody id="rows"></tbody></table></div></div>`;
    $("#stop").onclick = () => A.stopSpeak();
    const s = Settings.get(); $("#rate").value = s.rate; $("#rv").textContent = "×" + Number(s.rate).toFixed(1);
    $("#rate").oninput = e => { Settings.set({ rate: Number(Number(e.target.value).toFixed(1)) }); $("#rv").textContent = "×" + Number(e.target.value).toFixed(1); this.rows(); };
    this.voices(); this.rows();
    if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => this.voices();
    $("#rows").onclick = e => {
      const b = e.target.closest("[data-id]"); if (!b) return;
      const p = A.pois().find(x => x.id === Number(b.dataset.id)), L = b.dataset.l;
      if (!A.has(p, L)) { toast({ title: "Chưa có bản dịch", message: "Ngôn ngữ này sẽ được đọc bằng tiếng Việt.", type: "warning" }); A.speak(p.text.vi, "vi"); } else A.speak(p.text[L], L);
    };
  },
  voices() {
    const all = "speechSynthesis" in window ? speechSynthesis.getVoices() : [], saved = Store.get("voices", {});
    $("#voices").innerHTML = Object.keys(LANGS).map(k => {
      const opts = all.filter(v => v.lang.toLowerCase().startsWith(k));
      return `<div><label class="lb">${LANGS[k].f}</label><select class="input-field" data-v="${k}"><option value="">Mặc định của trình duyệt</option>${opts.map(v => `<option value="${Helper.esc(v.name)}" ${saved[k] === v.name ? "selected" : ""}>${Helper.esc(v.name)}</option>`).join("")}</select>
        ${opts.length ? "" : `<div class="hint">Máy này chưa có giọng ${LANGS[k].f}.</div>`}</div>`; }).join("");
    $$("[data-v]").forEach(s => s.onchange = () => { const v = Store.get("voices", {}); v[s.dataset.v] = s.value; Store.set("voices", v); toast({ title: "Đã lưu giọng đọc", message: LANGS[s.dataset.v].f, type: "success" }); });
  },
  rows() {
    const rate = Settings.get().rate;
    $("#rows").innerHTML = A.pois().map(p => `<tr><td><b>${Helper.esc(p.name.vi)}</b> ${p.status === "draft" ? '<span class="badge warn">Nháp</span>' : ""}</td>` +
      Object.keys(LANGS).map(k => { const ok = A.has(p, k); return `<td><button class="btn btn--ghost" style="height:34px;padding:0 12px;font-size:13px" data-id="${p.id}" data-l="${k}"><i class="fas fa-play"></i> ${Helper.mmss(A.dur(ok ? p.text[k] : p.text.vi, ok ? k : "vi", rate))}</button>${ok ? "" : ' <span class="badge warn">dùng TV</span>'}</td>`; }).join("") + `</tr>`).join("");
  }
};
document.addEventListener("DOMContentLoaded", () => AudioPage.init());
