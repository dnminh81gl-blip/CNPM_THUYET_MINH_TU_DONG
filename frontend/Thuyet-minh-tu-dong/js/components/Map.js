/* Map: bản đồ thật bằng Leaflet + OpenStreetMap (vòng geofence, ghim địa điểm, chấm vị trí + vòng sai số GPS).
   Thư viện Leaflet nạp từ CDN trong index.html nên cần Internet để hiển thị bản đồ. */
const MapUI = {
  follow: true, routeLayer: null, tempLayer: null, map: null, markers: {}, circles: {}, me: null, acc: null, group: null, activeId: null, fitted: false, gotFirstFix: false,
  CENTER: [10.7782, 106.6995],

  init() {
    this.bindButtons();
    if (!window.L) {
      $("#map").innerHTML = '<div class="map-fallback"><i class="fas fa-wifi"></i><b>Không tải được bản đồ</b><p>Cần kết nối Internet để tải bản đồ (Leaflet + OpenStreetMap). Vị trí, geofence và thuyết minh vẫn hoạt động; bạn vẫn dùng được danh sách địa điểm bên dưới.</p></div>';
      Bus.on("loc:status", s => GpsUI.render(s)); Bus.on("loc:mode", m => GpsUI.mode(m));
      return;
    }
    this.map = L.map("map", { zoomControl: false, attributionControl: true }).setView(this.CENTER, 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(this.map);
    this.group = L.layerGroup().addTo(this.map);
    this.routeLayer = L.layerGroup().addTo(this.map);
    this.tempLayer = L.layerGroup().addTo(this.map);
    this.map.on("dragstart", () => { this.follow = false; Bus.emit("map:userpan"); });
    this.build();
    this.buildMe();
    this.map.on("click", e => {
      if (LocationService.mode !== "sim") return;
      LocationService.stopWalk(); LocationService.set(e.latlng.lat, e.latlng.lng);
    });
    Bus.on("loc:update", p => this.moveMe(p));
    Bus.on("geo:state", ({ inside }) => POIService.all().forEach(p => this.style(p.id, inside.includes(p.id))));
    Bus.on("poi:filter", ids => this.filter(ids));
    Bus.on("poi:focus", list => this.focus(list));
    Bus.on("audio:state", ({ state, poi }) => this.markActive(state !== "idle" && poi ? poi.id : null));
    Bus.on("lang:change", () => this.labels());
    Bus.on("loc:status", s => GpsUI.render(s));
    Bus.on("loc:mode", m => { GpsUI.mode(m); this.dragMode(m); });
    Bus.on("nav:change", n => { if (n === "places") setTimeout(() => this.shown(), 60); });
  },

  bindButtons() {
    $("#zin").onclick = () => this.map && this.map.zoomIn();
    $("#zout").onclick = () => this.map && this.map.zoomOut();
    $("#zfit").onclick = () => this.fit();
    $("#zme").onclick = () => { this.follow = true; $("#zme").classList.remove("attn"); if (this.map && LocationService.hasFix) this.map.setView([LocationService.pos.lat, LocationService.pos.lng], Math.max(this.map.getZoom(), 17)); };
    $("#walkBtn").onclick = () => LocationService.walking ? LocationService.stopWalk() : LocationService.startWalk();
    $("#modeGps").onclick = () => LocationService.mode === "gps" ? null : LocationService.startGps();
    $("#modeSim").onclick = () => LocationService.mode === "sim" ? null : LocationService.stopGps();
    Bus.on("walk:state", on => { $("#walkBtn").classList.toggle("on", on); $("#walkTxt").textContent = on ? "Dừng đi" : "Đi dạo thử"; });
  },

  icon(p) {
    const l = Settings.get().lang;
    return L.divIcon({ className: "lm", iconSize: [38, 38], iconAnchor: [19, 19],
      html: `<div class="lm-pin" style="background:${POIService.grad(p)}"><i class="fas ${p.icon}"></i></div><span class="lm-label">${Helper.esc(p.name[l])}</span>` });
  },
  build() {
    this.group.clearLayers(); this.markers = {}; this.circles = {};
    POIService.all().forEach(p => {
      const c = L.circle([p.lat, p.lng], { radius: p.r, color: "#2563eb", weight: 2, dashArray: "7 6", fillColor: "#2563eb", fillOpacity: .08, interactive: false });
      const m = L.marker([p.lat, p.lng], { icon: this.icon(p), keyboard: false, riseOnHover: true });
      m.on("click", () => Bus.emit("poi:open", p.id));
      this.circles[p.id] = c; this.markers[p.id] = m; this.group.addLayer(c); this.group.addLayer(m);
    });
  },
  buildMe() {
    const p = LocationService.pos;
    this.acc = L.circle([p.lat, p.lng], { radius: p.accuracy, color: "#2563eb", weight: 1, fillColor: "#2563eb", fillOpacity: .12, interactive: false });
    this.me = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "lm", iconSize: [24, 24], iconAnchor: [12, 12], html: '<div class="me-dot"></div>' }), draggable: true, zIndexOffset: 1000, keyboard: false });
    this.me.on("dragstart", () => LocationService.stopWalk());
    this.me.on("drag", e => { const ll = e.target.getLatLng(); LocationService.set(ll.lat, ll.lng); });
    this.dragMode(LocationService.mode);
    this.showMe(LocationService.hasFix);
  },
  /* chấm xanh chỉ có trên bản đồ khi đã có vị trí (bị gỡ hẳn khi chưa có, để không chặn thao tác bấm) */
  showMe(on) {
    if (!this.me) return;
    if (on && !this.map.hasLayer(this.me)) { this.acc.addTo(this.map); this.me.addTo(this.map); this.applyDrag(); }
    if (!on && this.map.hasLayer(this.me)) { this.map.removeLayer(this.acc); this.map.removeLayer(this.me); }
  },
  /* Leaflet chỉ tạo marker.dragging SAU KHI marker được thêm vào bản đồ, nên chỉ ghi nhớ mong muốn rồi áp dụng khi chấm xanh đang hiện */
  dragMode(m) { this.dragWanted = m === "sim"; this.applyDrag(); },
  applyDrag() { if (!this.me || !this.me.dragging) return; this.dragWanted ? this.me.dragging.enable() : this.me.dragging.disable(); },
  moveMe(p) {
    if (!this.me) return;
    const ll = [p.lat, p.lng];
    this.me.setLatLng(ll);
    this.acc.setLatLng(ll); this.acc.setRadius(p.src === "gps" ? Math.max(p.accuracy, 3) : 0.1);
    this.showMe(LocationService.hasFix);
    /* lần đầu có GPS thật thì đưa bản đồ tới vị trí của người dùng */
    if (p.src === "gps" && !this.gotFirstFix) { this.gotFirstFix = true; this.map.setView(ll, Math.max(this.map.getZoom(), 17)); }
  },
  style(id, inside) {
    const c = this.circles[id]; if (!c) return;
    c.setStyle(inside ? { color: "#ff5b4d", fillColor: "#ff5b4d", fillOpacity: .22 } : { color: "#2563eb", fillColor: "#2563eb", fillOpacity: .08 });
  },
  filter(ids) {
    POIService.all().forEach(p => {
      const show = ids.includes(p.id), m = this.markers[p.id], c = this.circles[p.id]; if (!m) return;
      if (show && !this.group.hasLayer(m)) { this.group.addLayer(c); this.group.addLayer(m); }
      if (!show && this.group.hasLayer(m)) { this.group.removeLayer(c); this.group.removeLayer(m); }
    });
  },
  markActive(id) {
    this.activeId = id;
    Object.keys(this.markers).forEach(k => { const el = this.markers[k].getElement && this.markers[k].getElement(); if (el) el.classList.toggle("on", Number(k) === id); });
  },
  labels() {
    const l = Settings.get().lang;
    POIService.all().forEach(p => { const m = this.markers[p.id], el = m && m.getElement && m.getElement(); const lb = el && el.querySelector(".lm-label"); if (lb) lb.textContent = p.name[l]; });
  },
  /* tìm kiếm / lọc: bản đồ nhảy tới kết quả (1 kết quả: tới thẳng điểm đó; nhiều kết quả: thu phóng vừa đủ thấy hết) */
  focus(list) {
    if (!this.map || !list.length) return;
    this.map.invalidateSize();
    if (list.length === 1) { this.map.setView([list[0].lat, list[0].lng], 17); this.pulse(list[0].id); }
    else this.map.fitBounds(L.latLngBounds(list.map(p => [p.lat, p.lng])).pad(0.3));
  },
  pulse(id) {
    const el = this.markers[id] && this.markers[id].getElement && this.markers[id].getElement(); if (!el) return;
    el.classList.add("focus"); setTimeout(() => el.classList.remove("focus"), 2500);
  },
  /* ----- chỉ đường / địa chỉ tìm được ----- */
  drawRoute(coords, fit = true) {
    if (!this.map) return; this.clearRoute();
    const o = { lineCap: "round", lineJoin: "round", interactive: false };
    this.routeLayer.addLayer(L.polyline(coords, Object.assign({ color: "#ffffff", weight: 10, opacity: .95 }, o)));
    this.routeLayer.addLayer(L.polyline(coords, Object.assign({ color: "#2563eb", weight: 6, opacity: .95 }, o)));
    if (fit) this.map.fitBounds(L.latLngBounds(coords).pad(0.2));
  },
  clearRoute() { if (this.routeLayer) this.routeLayer.clearLayers(); },
  setTemp(d) {
    this.clearTemp(); if (!this.map || d.type === "poi") return;
    this.tempLayer.addLayer(L.marker([d.lat, d.lng], { icon: L.divIcon({ className: "lm", iconSize: [34, 44], iconAnchor: [17, 40], html: '<div class="dest-pin"><i class="fas fa-map-marker-alt"></i></div>' }), keyboard: false, interactive: false }));
  },
  clearTemp() { if (this.tempLayer) this.tempLayer.clearLayers(); },
  goTo(lat, lng, zoom = 17) { if (this.map) this.map.setView([lat, lng], zoom); },
  /* dẫn đường: bản đồ bám theo vị trí của người dùng */
  followMe(pos) { if (this.map && this.follow) this.map.setView([pos.lat, pos.lng], Math.max(this.map.getZoom(), 18)); },
  resize() { if (this.map) setTimeout(() => this.map.invalidateSize(), 60); },
  /* xem tất cả địa điểm */
  fit() {
    if (!this.map) return;
    const pts = POIService.all().map(p => [p.lat, p.lng]);
    if (LocationService.hasFix) pts.push([LocationService.pos.lat, LocationService.pos.lng]);
    if (pts.length) this.map.fitBounds(L.latLngBounds(pts).pad(0.25)); else this.map.setView(this.CENTER, 16);
  },
  /* bản đồ nằm trong tab đang ẩn nên phải báo Leaflet đo lại kích thước khi tab hiện ra */
  shown() { if (!this.map) return; this.map.invalidateSize(); if (!this.fitted) { this.fitted = true; this.fit(); } this.markActive(this.activeId); }
};

/* Thanh trạng thái định vị + nút chọn nguồn vị trí */
const GpsUI = {
  TEXT: {
    sim: ["", "Chế độ giả lập: bấm vào bản đồ để đặt vị trí của bạn (kéo chấm xanh để di chuyển)"],
    asking: ["warn", "Đang xin quyền vị trí... hãy bấm \"Cho phép\" trên trình duyệt"],
    ok: ["ok", "GPS đang hoạt động"],
    weak: ["warn", "Tín hiệu GPS yếu — chưa dùng để kích hoạt thuyết minh"],
    denied: ["bad", "Bạn đã từ chối quyền vị trí. Bật lại ở biểu tượng ổ khoá cạnh địa chỉ rồi bấm \"GPS thật\" lần nữa. Đang dùng chế độ giả lập"],
    insecure: ["bad", "GPS chỉ hoạt động khi mở trang bằng HTTPS hoặc localhost. Đang dùng chế độ giả lập"],
    unsupported: ["bad", "Thiết bị/trình duyệt không hỗ trợ định vị. Đang dùng chế độ giả lập"],
    unavailable: ["warn", "Chưa xác định được vị trí. Hãy bật định vị (GPS/Location) của thiết bị"],
    timeout: ["warn", "Chờ GPS hơi lâu... hãy ra chỗ thoáng và đợi thêm"]
  },
  render({ status, accuracy }) {
    const [cls, txt] = this.TEXT[status] || this.TEXT.sim, chip = $("#gpsChip");
    chip.className = "map-legend " + cls;
    chip.textContent = status === "ok" || status === "weak" ? `${txt} · sai số ±${accuracy} m` : txt;
  },
  mode(m) {
    $("#modeGps").classList.toggle("on", m === "gps"); $("#modeSim").classList.toggle("on", m === "sim");
    $("#walkBtn").style.display = m === "sim" ? "" : "none";
  }
};
