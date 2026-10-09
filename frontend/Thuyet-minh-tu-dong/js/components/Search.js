/* SearchUI: ô tìm kiếm trên bản đồ.
   - Địa điểm thuyết minh của hệ thống (tìm tức thì, không dấu cũng ra) luôn đứng trên.
   - Địa chỉ thực tế lấy từ GeocodeService (có khoá: gõ xong tự tìm; chưa có khoá: nhấn Enter).
   Chọn kết quả -> bản đồ nhảy tới, hiện thẻ điểm đến có nút Chỉ đường. */
const SearchUI = {
  timer: null, seq: 0, loc: [], geo: [], busy: false, msg: "",
  init() {
    const inp = $("#msInput");
    inp.addEventListener("input", () => this.onInput());
    inp.addEventListener("focus", () => { if (inp.value.trim()) this.draw(); });
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); this.enter(); } else if (e.key === "Escape") this.hide(); });
    $("#msClear").onclick = () => { inp.value = ""; $("#msClear").hidden = true; this.loc = []; this.geo = []; this.msg = ""; this.hide(); DestUI.close(); };
    $("#msDrop").addEventListener("mousedown", e => e.preventDefault());   // bấm vào danh sách không làm mất focus
    $("#msDrop").addEventListener("click", e => { const it = e.target.closest("[data-k]"); if (it) this.pick(it); });
    document.addEventListener("click", e => { if (!e.target.closest("#mapSearch")) this.hide(); });
  },
  hide() { $("#msDrop").hidden = true; },
  onInput() {
    const q = $("#msInput").value; $("#msClear").hidden = !q;
    this.loc = q.trim() ? POIService.search({ q }) : []; this.geo = []; this.msg = ""; this.busy = false;
    clearTimeout(this.timer); this.seq++;
    if (q.trim().length >= 3) {
      if (GeocodeService.hasKey()) this.timer = setTimeout(() => this.geocode(), 700);
      else this.msg = "Nhấn Enter để tìm địa chỉ (đang dùng OpenStreetMap vì chưa có khoá ORS).";
    }
    this.draw();
  },
  async geocode() {
    const q = $("#msInput").value.trim(), my = ++this.seq;
    if (q.length < 2) return [];
    this.busy = true; this.msg = ""; this.draw();
    try {
      const r = await GeocodeService.search(q);
      if (my !== this.seq) return [];
      this.geo = r.results; this.msg = r.results.length ? "" : "Không tìm thấy địa chỉ phù hợp.";
    } catch (e) { if (my !== this.seq) return []; this.geo = []; this.msg = e.message; }
    this.busy = false; this.draw(); return this.geo;
  },
  async enter() {
    const q = $("#msInput").value.trim(); if (!q) return;
    clearTimeout(this.timer);
    this.loc = POIService.search({ q });
    if (this.loc.length) { this.pickPoi(this.loc[0]); return; }
    const g = await this.geocode();
    if (g && g.length) this.pickPlace(g[0]);
  },
  draw() {
    const q = $("#msInput").value.trim(), d = $("#msDrop"), lang = Settings.get().lang;
    if (!q) { this.hide(); return; }
    let h = "";
    if (this.loc.length) h += `<div class="ms-sec">Địa điểm thuyết minh</div>` + this.loc.map(p =>
      `<div class="ms-item" data-k="poi" data-id="${p.id}"><span class="ms-ic" style="background:${POIService.grad(p)}"><i class="fas ${p.icon}"></i></span><span class="ms-tx"><b>${Helper.esc(p.name[lang])}</b><small>${Helper.esc(p.addr)}</small></span><i class="fas fa-headphones ms-tag" title="Có thuyết minh"></i></div>`).join("");
    if (this.geo.length) h += `<div class="ms-sec">Địa chỉ</div>` + this.geo.map((g, i) =>
      `<div class="ms-item" data-k="geo" data-i="${i}"><span class="ms-ic gray"><i class="fas fa-map-marker-alt"></i></span><span class="ms-tx"><b>${Helper.esc(g.name)}</b><small>${Helper.esc(g.label)}</small></span></div>`).join("");
    if (this.busy) h += `<div class="ms-note"><i class="fas fa-spinner fa-spin"></i> Đang tìm địa chỉ...</div>`;
    else if (this.msg) h += `<div class="ms-note">${Helper.esc(this.msg)}</div>`;
    if (!h) h = `<div class="ms-note">Không có kết quả.</div>`;
    d.innerHTML = h; d.hidden = false;
  },
  pick(it) {
    if (it.dataset.k === "poi") this.pickPoi(POIService.get(it.dataset.id));
    else this.pickPlace(this.geo[Number(it.dataset.i)]);
  },
  pickPoi(p) { if (!p) return; $("#msInput").value = p.name[Settings.get().lang]; this.hide(); DestUI.showPoi(p); },
  pickPlace(g) { if (!g) return; $("#msInput").value = g.name; this.hide(); DestUI.showPlace(g); }
};
