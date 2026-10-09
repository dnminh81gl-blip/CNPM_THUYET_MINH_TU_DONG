/* POI: danh mục, tìm kiếm, lưới thẻ địa điểm, popup chi tiết */
const PoiUI = {
  filters: { q: "", cat: "", maxR: 0 },
  openId: null,
  init() {
    const cats = POIService.categories();
    $("#advCat").innerHTML += cats.map(c => `<option value="${Helper.esc(c)}">${Helper.esc(c)}</option>`).join("");
    this.renderCats();
    $$(".js-q").forEach(inp => {
      inp.addEventListener("input", () => { this.filters.q = inp.value; $$(".js-q").forEach(o => o.value = inp.value); this.render(); this.focusSoon(); });
      inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); this.focusNow(); } });
    });
    $$(".js-q-btn").forEach(b => b.addEventListener("click", () => { this.render(); this.focusNow(); }));
    $("#advBtn").addEventListener("click", () => {
      this.filters = { q: $("#advName").value, cat: $("#advCat").value, maxR: Number($("#advRad").value) };
      $$(".js-q").forEach(o => o.value = this.filters.q); this.renderCats(); this.render(); this.focusNow();
    });
    const pickCat = e => {
      const a = e.target.closest("[data-cat]"); if (!a) return;
      this.filters.cat = a.dataset.cat; $("#advCat").value = a.dataset.cat; this.renderCats(); this.render(); this.focusNow();
    };
    $("#categoryList").addEventListener("click", pickCat);
    $("#mobileCategoryList").addEventListener("click", pickCat);
    $("#placeList").addEventListener("click", e => this.onCard(e));
    Bus.on("poi:open", id => this.openDetail(id));
    Bus.on("tour:change", () => { this.render(); this.refreshDetailTour(); });
    Bus.on("lang:change", () => { this.render(); if (this.openId) this.openDetail(this.openId); this.updateDist(); });
    Bus.on("loc:update", () => this.updateDist());
    $("#dListen").onclick = () => { if (this.openId) NarrationService.play(POIService.get(this.openId), false); };
    $("#dTour").onclick = () => { if (this.openId) this.toggleTour(this.openId); };
    /* chỉ đường từ cửa sổ chi tiết: đóng cửa sổ, qua tab Địa điểm và tính đường ngay */
    $("#dRoute").onclick = () => { if (!this.openId) return; const p = POIService.get(this.openId); Modal.close("detailModal"); Nav.go("places"); setTimeout(() => Bus.emit("dest:route", DestUI.poiDest(p)), 150); };
    this.render();
  },
  /* đưa bản đồ tới kết quả tìm kiếm (chờ người dùng gõ xong một chút) */
  focusSoon() { clearTimeout(this._ft); this._ft = setTimeout(() => this.focusNow(), 350); },
  focusNow() { clearTimeout(this._ft); Bus.emit("poi:focus", POIService.search(this.filters)); },
  renderCats() {
    const items = [["", "Tất cả"], ...POIService.categories().map(c => [c, c])];
    $("#categoryList").innerHTML = items.map(([v, t]) => `<li class="category-list--item"><a class="category-list--item-link ${this.filters.cat === v ? "catagory-Active" : ""}" data-cat="${Helper.esc(v)}">${Helper.esc(t)}</a></li>`).join("");
    $("#mobileCategoryList").innerHTML = items.map(([v, t]) => `<li class="mobile-category__item"><a class="mobile-category__link ${this.filters.cat === v ? "catagory-Active" : ""}" data-cat="${Helper.esc(v)}">${Helper.esc(t)}</a></li>`).join("");
  },
  render() {
    const list = POIService.search(this.filters);
    $("#placeCount").textContent = `(${list.length})`;
    $("#placeList").innerHTML = list.length ? list.map(p => `
      <div class="col l-2-4 m-4 c-6"><div class="product-item" data-id="${p.id}">
        <div class="product-item--img" style="background:${POIService.grad(p)}"><span class="product-item--badge">Ưu tiên ${p.pri}</span><i class="fas ${p.icon}"></i></div>
        <div class="product-item-main">
          <div class="product-item--name">${Helper.esc(p.name.vi)}</div>
          <div class="product-item--price_type"><span class="product-item--type">${Helper.esc(p.cat)}</span><span class="js-dist" data-id="${p.id}"></span></div>
          <div class="product-item-actions">
            <button class="pa-listen" data-act="listen"><i class="fas fa-headphones"></i> Nghe</button>
            <button class="pa-tour ${TourService.has(p.id) ? "in" : ""}" data-act="tour">${TourService.has(p.id) ? '<i class="fas fa-check"></i> Đã thêm' : '<i class="fas fa-plus"></i> Tour'}</button>
          </div>
        </div></div></div>`).join("")
      : `<div class="col l-12 m-12 c-12"><div class="empty-box"><i class="fas fa-search-location"></i>Không tìm thấy địa điểm phù hợp.</div></div>`;
    Bus.emit("poi:filter", list.map(p => p.id));
    this.updateDist();
  },
  onCard(e) {
    const card = e.target.closest(".product-item"); if (!card) return;
    const id = Number(card.dataset.id), act = e.target.closest("[data-act]");
    if (act && act.dataset.act === "listen") NarrationService.play(POIService.get(id), false);
    else if (act && act.dataset.act === "tour") this.toggleTour(id);
    else this.openDetail(id);
  },
  toggleTour(id) {
    const added = TourService.toggle(id), p = POIService.get(id);
    toast({ title: added ? "Đã thêm vào tour" : "Đã bỏ khỏi tour", message: p.name.vi, type: added ? "success" : "info" });
  },
  dist(p) { return LocationService.hasFix ? Math.round(Geo.dist(p, LocationService.pos)) : null; },
  fmt(d) { return d == null ? "—" : "~ " + d + " m"; },
  updateDist() {
    $$(".js-dist").forEach(el => { const p = POIService.get(el.dataset.id); el.textContent = this.fmt(this.dist(p)); });
    if (this.openId) $("#dDist").textContent = this.fmt(this.dist(POIService.get(this.openId)));
  },
  openDetail(id) {
    const p = POIService.get(id), lang = Settings.get().lang; this.openId = id;
    $("#dVisual").style.background = POIService.grad(p); $("#dVisual").innerHTML = `<i class="fas ${p.icon}"></i>`;
    $("#dCat").textContent = p.cat; $("#dName").textContent = p.name[lang] + (lang !== "vi" ? ` (${p.name.vi})` : "");
    $("#dDesc").textContent = p.text[lang]; $("#dAddr").textContent = p.addr;
    $("#dRad").textContent = `${p.r} m · Ưu tiên ${p.pri}`;
    $("#dLangs").innerHTML = Object.keys(LANGS).map(k => `<button class="chip ${k === lang ? "on" : ""}" data-l="${k}">${LANGS[k].f}</button>`).join("");
    $$("#dLangs .chip").forEach(c => c.onclick = () => { Settings.set({ lang: c.dataset.l }); Bus.emit("lang:change", c.dataset.l); });
    this.refreshDetailTour(); this.updateDist(); Modal.open("detailModal");
  },
  refreshDetailTour() {
    if (!this.openId) return;
    const has = TourService.has(this.openId);
    $("#dTour").innerHTML = has ? '<i class="fas fa-check"></i> Đã trong tour' : '<i class="fas fa-plus"></i> Thêm vào tour';
  }
};
