/* Quản lý địa điểm (POI): tìm kiếm, lọc, phân trang, thêm / sửa / xoá, chọn vị trí trên bản đồ, ảnh minh hoạ */
const PlacesPage = {
  page: 1, f: { q: "", cat: "", st: "" }, editing: null, pick: { lat: 10.7782, lng: 106.6995 }, pm: null, pl: null,
  init() {
    if (!A.init("places")) return;
    POIService.BASE = "../"; /* ảnh đặt trong thư mục img/ của dự án nằm ở thư mục cha của Admin/ */
    $("#app").innerHTML = `
      <div class="adm-title"><h1><i class="fas fa-map-marker-alt"></i> Quản lý POI · Dinh Độc Lập</h1>
        <div><button class="btn btn--ghost" id="reset"><i class="fas fa-undo"></i> Khôi phục dữ liệu mẫu</button> <button class="btn btn--primary" id="add"><i class="fas fa-plus"></i> Thêm POI</button></div></div>
      <div class="adm-card">
        <div class="toolbar">
          <input class="input-field" id="q" placeholder="Tìm theo tên hoặc địa chỉ..." />
          <select class="input-field" id="cat"><option value="">Tất cả danh mục</option></select>
          <select class="input-field" id="st"><option value="">Mọi trạng thái</option><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option></select>
          <span class="sp"></span><span id="count" class="hint" style="margin:0"></span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Ảnh</th><th>Tên (Tiếng Việt)</th><th>Danh mục</th><th>Bán kính</th><th>Ưu tiên</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody id="rows"></tbody></table></div>
        <div class="pager" id="pager"></div>
      </div>`;
    document.body.insertAdjacentHTML("beforeend", this.modalHtml());
    $("#q").oninput = e => { this.f.q = e.target.value; this.page = 1; this.render(); };
    $("#cat").onchange = e => { this.f.cat = e.target.value; this.page = 1; this.render(); };
    $("#st").onchange = e => { this.f.st = e.target.value; this.page = 1; this.render(); };
    $("#add").onclick = () => this.open(null);
    $("#reset").onclick = () => { if (confirm("Khôi phục 6 POI mẫu của Dinh Độc Lập? Mọi thay đổi về địa điểm sẽ mất.")) { POIService.resetSeed(); toast({ title: "Đã khôi phục", message: "Dữ liệu mẫu đã được nạp lại.", type: "success" }); this.render(); } };
    $("#rows").onclick = e => {
      const b = e.target.closest("[data-a]"); if (!b) return; const id = Number(b.dataset.id);
      if (b.dataset.a === "edit") this.open(id);
      else if (b.dataset.a === "del") this.del(id);
      else if (b.dataset.a === "tg") this.toggle(id);
    };
    ["flat", "flng", "fr"].forEach(k => $("#" + k).addEventListener("input", () => {
      const la = parseFloat($("#flat").value), ln = parseFloat($("#flng").value);
      if (!isNaN(la) && !isNaN(ln)) { this.pick = { lat: la, lng: ln }; this.drawPicker(true); }
    }));
    $("#fimg").addEventListener("input", () => { clearTimeout(this._pt); this._pt = setTimeout(() => this.preview(), 400); });
    ["fico", "fgrad"].forEach(k => $("#" + k).addEventListener("change", () => this.preview()));
    $("#pForm").onsubmit = e => { e.preventDefault(); this.save(); };
    this.render();
  },
  modalHtml() {
    return `<div class="modal-wrap" id="pModal"><div class="modal-main adm-modal"><button class="modal-close" data-close><i class="fas fa-times"></i></button>
    <h2 id="mTitle"></h2><form id="pForm" class="fgrid" autocomplete="off">
      <div class="full"><label>Tên - Tiếng Việt *</label><input class="input-field" id="nVi" required maxlength="80" /></div>
      <div><label>Tên - English</label><input class="input-field" id="nEn" maxlength="80" /></div>
      <div><label>Tên - 中文</label><input class="input-field" id="nZh" maxlength="80" /></div>
      <div><label>Danh mục *</label><input class="input-field" id="fcat" list="catList" required maxlength="40" /><datalist id="catList"></datalist></div>
      <div><label>Trạng thái</label><select class="input-field" id="fst"><option value="published">Đã xuất bản (hiện trên web)</option><option value="draft">Bản nháp (ẩn)</option></select></div>
      <div class="full"><label>Địa chỉ *</label><input class="input-field" id="faddr" required maxlength="160" /></div>
      <div><label>Bán kính kích hoạt (m) *</label><input class="input-field" id="fr" type="number" min="10" max="300" required /></div>
      <div><label>Mức ưu tiên (1-5) *</label><input class="input-field" id="fpri" type="number" min="1" max="5" required /></div>
      <div><label>Biểu tượng</label><select class="input-field" id="fico"></select></div>
      <div><label>Màu</label><select class="input-field" id="fgrad"></select></div>
      <div class="full"><label>Ảnh thực tế</label>
        <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
          <div id="imgPrev" style="width:200px;height:130px;border-radius:12px;position:relative;overflow:hidden;display:grid;place-items:center;color:#fff;font-size:40px;flex:none"></div>
          <div style="flex:1;min-width:220px">
            <input class="input-field" id="fimg" maxlength="400" placeholder="VD: img/places/dinh-doc-lap.jpg hoặc tên file Wikimedia Commons hoặc https://..." />
            <input class="input-field" id="fcredit" maxlength="120" placeholder="Ghi nguồn ảnh, VD: Nguyễn Văn A · CC BY-SA 4.0" />
            <div class="hint">Có 3 cách: (1) bỏ ảnh vào thư mục <b>img/</b> cạnh index.html rồi nhập <b>img/ten-anh.jpg</b>; (2) nhập tên file trên Wikimedia Commons; (3) dán URL ảnh. Để trống thì hiện màu + biểu tượng.</div>
          </div>
        </div></div>
      <div class="full"><label>Mô tả thuyết minh - Tiếng Việt *</label><textarea class="input-field" id="tVi" required maxlength="1200" placeholder="Nội dung sẽ được đọc khi người dùng đến gần địa điểm"></textarea>
        <div class="hint">Bản dịch English / 中文 nhập ở trang "Nội dung & bản dịch".</div></div>
      <div class="full"><label>Vị trí (bấm trên bản đồ hoặc kéo ghim đỏ)</label>
        <div class="picker" id="pickWrap"><div id="pmap" style="height:300px"></div></div>
        <div class="fgrid"><div><label>Vĩ độ (lat) *</label><input class="input-field" id="flat" type="number" step="any" min="-90" max="90" required /></div><div><label>Kinh độ (lng) *</label><input class="input-field" id="flng" type="number" step="any" min="-180" max="180" required /></div></div>
        <div class="hint">Mẹo: trên Google Maps bấm chuột phải vào vị trí rồi chọn dòng toạ độ để sao chép. Bán kính nên nhỏ (40-80 m) vì GPS ngoài trời thường lệch 5-20 m.</div></div>
      <div class="full mfoot"><button type="button" class="btn btn--ghost" data-close>Huỷ</button><button class="btn btn--primary" type="submit"><i class="fas fa-save"></i> Lưu</button></div>
    </form></div></div>`;
  },
  /* ảnh thu nhỏ: ảnh thật nếu có, lỗi ảnh thì về màu + biểu tượng */
  thumb(p, w) {
    const src = POIService.photoUrl(p.img, w);
    return `<i class="fas ${p.icon}" style="position:relative"></i>` + (src ? `<img src="${Helper.esc(src)}" alt="" loading="lazy" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />` : "");
  },
  preview() {
    const g = GRADS[Number($("#fgrad").value)] || GRADS[0];
    $("#imgPrev").style.background = `linear-gradient(135deg, ${g[0]}, ${g[1]})`;
    $("#imgPrev").innerHTML = this.thumb({ img: $("#fimg").value, icon: $("#fico").value }, 400);
  },
  list() {
    const q = this.f.q.trim().toLowerCase();
    return A.pois().filter(p => (!q || Object.values(p.name).some(n => (n || "").toLowerCase().includes(q)) || p.addr.toLowerCase().includes(q)) &&
      (!this.f.cat || p.cat === this.f.cat) && (!this.f.st || (p.status || "published") === this.f.st));
  },
  render() {
    const all = A.pois(), cats = [...new Set(all.map(p => p.cat))];
    $("#cat").innerHTML = `<option value="">Tất cả danh mục</option>` + cats.map(c => `<option ${c === this.f.cat ? "selected" : ""}>${Helper.esc(c)}</option>`).join("");
    $("#catList").innerHTML = cats.map(c => `<option value="${Helper.esc(c)}">`).join("");
    const r = A.paginate(this.list(), this.page); this.page = r.page;
    $("#count").textContent = `${this.list().length} / ${all.length} địa điểm`;
    $("#rows").innerHTML = r.rows.length ? r.rows.map((p, i) => `<tr>
      <td>${(r.page - 1) * 8 + i + 1}</td><td><div class="ico" style="background:${A.gradOf(p)};position:relative;overflow:hidden">${this.thumb(p, 160)}</div></td>
      <td><b>${Helper.esc(p.name.vi)}</b><br><small style="color:#888">${Helper.esc(p.addr)}</small></td><td>${Helper.esc(p.cat)}</td><td>${p.r} m</td><td>${p.pri}</td>
      <td><button class="badge ${(p.status || "published") === "draft" ? "warn" : "ok"}" data-a="tg" data-id="${p.id}" title="Bấm để đổi trạng thái">${(p.status || "published") === "draft" ? "Nháp" : "Đã xuất bản"}</button></td>
      <td><div class="acts"><button class="ibtn" data-a="edit" data-id="${p.id}" aria-label="Sửa"><i class="fas fa-pen"></i></button><button class="ibtn del" data-a="del" data-id="${p.id}" aria-label="Xoá"><i class="fas fa-trash"></i></button></div></td></tr>`).join("")
      : `<tr><td colspan="8" class="empty">Không có địa điểm phù hợp.</td></tr>`;
    A.pager($("#pager"), r.page, r.pages, n => { this.page = n; this.render(); });
  },
  toggle(id) { const l = A.pois(), p = l.find(x => x.id === id); p.status = (p.status || "published") === "draft" ? "published" : "draft"; A.savePois(l); this.render(); toast({ title: "Đã cập nhật", message: `${p.name.vi}: ${p.status === "draft" ? "chuyển sang nháp" : "đã xuất bản"}`, type: "success" }); },
  del(id) {
    const p = A.pois().find(x => x.id === id);
    if (!confirm(`Xoá địa điểm "${p.name.vi}"? Địa điểm cũng sẽ bị gỡ khỏi các tour.`)) return;
    A.savePois(A.pois().filter(x => x.id !== id));
    A.saveTours(A.tours().map(t => Object.assign(t, { poiIds: t.poiIds.filter(i => i !== id) })));
    toast({ title: "Đã xoá", message: p.name.vi, type: "success" }); this.render();
  },
  open(id) {
    this.editing = id;
    const p = id ? A.pois().find(x => x.id === id) : { name: { vi: "", en: "", zh: "" }, text: { vi: "" }, cat: "", addr: "", r: 50, pri: 2, icon: "fa-landmark", grad: GRADS[0], status: "draft", img: "", credit: "", lat: POIService.ORIGIN.lat, lng: POIService.ORIGIN.lng };
    $("#mTitle").textContent = id ? "Sửa địa điểm" : "Thêm địa điểm";
    $("#fico").innerHTML = ICONS.map(([n, , t]) => `<option value="${n}" ${n === p.icon ? "selected" : ""}>${t}</option>`).join("");
    $("#fgrad").innerHTML = GRADS.map((g, i) => `<option value="${i}" ${g[0] === p.grad[0] ? "selected" : ""}>Màu ${i + 1}</option>`).join("");
    $("#nVi").value = p.name.vi; $("#nEn").value = p.name.en || ""; $("#nZh").value = p.name.zh || ""; $("#fcat").value = p.cat; $("#fst").value = p.status || "published";
    $("#faddr").value = p.addr; $("#fr").value = p.r; $("#fpri").value = p.pri; $("#tVi").value = p.text.vi || "";
    $("#fimg").value = p.img || ""; $("#fcredit").value = p.credit || ""; this.preview();
    this.pick = { lat: p.lat, lng: p.lng }; $("#flat").value = p.lat; $("#flng").value = p.lng; Modal.open("pModal");
    setTimeout(() => this.initPicker(), 80);
  },
  /* bản đồ chọn vị trí (Leaflet). Không có Internet thì nhập lat/lng thủ công. */
  initPicker() {
    if (!window.L) { $("#pickWrap").innerHTML = '<div class="hint" style="padding:14px">Không tải được bản đồ (cần Internet). Hãy nhập vĩ độ và kinh độ ở bên dưới.</div>'; return; }
    if (!this.pm) {
      this.pm = L.map("pmap", { zoomControl: true }).setView([this.pick.lat, this.pick.lng], 17);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(this.pm);
      this.pl = L.layerGroup().addTo(this.pm);
      this.pm.on("click", e => this.setPos(e.latlng.lat, e.latlng.lng));
    }
    this.pm.invalidateSize(); this.pm.setView([this.pick.lat, this.pick.lng], 17); this.drawPicker(false);
  },
  drawPicker(pan) {
    if (!this.pm) return;
    this.pl.clearLayers();
    A.pois().filter(p => p.id !== this.editing).forEach(p => {
      this.pl.addLayer(L.circle([p.lat, p.lng], { radius: p.r, color: "#2563eb", weight: 1, dashArray: "5 5", fillOpacity: .08, interactive: false }));
      this.pl.addLayer(L.circleMarker([p.lat, p.lng], { radius: 6, color: "#fff", weight: 2, fillColor: "#94a3b8", fillOpacity: 1 }).bindTooltip(p.name.vi));
    });
    const r = Number($("#fr").value) || 50, ll = [this.pick.lat, this.pick.lng];
    this.pl.addLayer(L.circle(ll, { radius: r, color: "#ff5b4d", weight: 2, dashArray: "6 5", fillColor: "#ff5b4d", fillOpacity: .2, interactive: false }));
    const mk = L.marker(ll, { draggable: true, icon: L.divIcon({ className: "", iconSize: [26, 26], iconAnchor: [13, 13], html: '<div style="width:26px;height:26px;border-radius:50%;background:#ff5b4d;border:4px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>' }) });
    mk.on("dragend", e => { const p = e.target.getLatLng(); this.setPos(p.lat, p.lng); });
    this.pl.addLayer(mk);
    if (pan) this.pm.panTo(ll);
  },
  setPos(lat, lng) {
    this.pick = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    $("#flat").value = this.pick.lat; $("#flng").value = this.pick.lng; this.drawPicker(false);
  },
  save() {
    const l = A.pois(), g = {
      name: { vi: $("#nVi").value.trim(), en: $("#nEn").value.trim(), zh: $("#nZh").value.trim() },
      cat: $("#fcat").value.trim(), addr: $("#faddr").value.trim(), r: Number($("#fr").value), pri: Number($("#fpri").value),
      lat: parseFloat($("#flat").value), lng: parseFloat($("#flng").value), status: $("#fst").value,
      icon: $("#fico").value, grad: GRADS[Number($("#fgrad").value)],
      img: $("#fimg").value.trim(), credit: $("#fcredit").value.trim()
    };
    g.code = ICONS.find(i => i[0] === g.icon)[1];
    if (!g.name.vi || !g.cat || !g.addr || !$("#tVi").value.trim()) { toast({ title: "Thiếu thông tin", message: "Vui lòng điền đủ các trường bắt buộc.", type: "warning" }); return; }
    if (g.r < 10 || g.r > 300 || g.pri < 1 || g.pri > 5 || isNaN(g.lat) || isNaN(g.lng) || g.lat < -90 || g.lat > 90 || g.lng < -180 || g.lng > 180) { toast({ title: "Giá trị không hợp lệ", message: "Kiểm tra lại bán kính, ưu tiên và vĩ độ/kinh độ.", type: "warning" }); return; }
    if (g.img && /^\s*javascript:/i.test(g.img)) { toast({ title: "Ảnh không hợp lệ", message: "Hãy nhập đường dẫn ảnh, tên file hoặc URL https.", type: "warning" }); return; }
    if (this.editing) {
      const p = l.find(x => x.id === this.editing); Object.assign(p, g); delete p.x; delete p.y; p.text = Object.assign({}, p.text, { vi: $("#tVi").value.trim() });
    } else {
      l.push(Object.assign({ id: Math.max(0, ...l.map(x => x.id)) + 1, text: { vi: $("#tVi").value.trim(), en: "", zh: "" } }, g));
    }
    A.savePois(l); Modal.close("pModal"); toast({ title: "Đã lưu", message: g.name.vi, type: "success" }); this.render();
  }
};
document.addEventListener("DOMContentLoaded", () => PlacesPage.init());
