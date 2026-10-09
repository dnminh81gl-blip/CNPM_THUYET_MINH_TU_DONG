/* LocationService: nguồn vị trí người dùng, có 2 chế độ:
   - "gps": GPS thật của thiết bị (navigator.geolocation.watchPosition)
   - "sim": giả lập (kéo chấm / "Đi dạo thử") để demo trong phòng
   Điều kiện dùng GPS thật: trang chạy bằng HTTPS hoặc localhost, người dùng cho phép vị trí, thiết bị bật định vị. */
const LocationService = {
  START: { lat: 10.7783, lng: 106.6978 },
  pos: { lat: 10.7783, lng: 106.6978, accuracy: 5, src: "sim" },
  hasFix: false,       // đã có vị trí dùng được chưa (giả lập: chỉ có sau khi bấm lên bản đồ)
  mode: "sim",         // "sim" | "gps"
  status: "sim",       // sim | asking | ok | weak | denied | insecure | unsupported | unavailable | timeout
  ACC_TRUST: 80,       // sai số tối đa (m) để dùng vị trí GPS cho geofence
  WALK_SPEED: 40,      // m/s ở chế độ giả lập
  watchId: null, wake: null, walking: false, _raf: 0,

  init() {
    document.addEventListener("visibilitychange", () => { if (!document.hidden && this.mode === "gps") this._wake(); });
    if (Store.get("locMode", "sim") === "gps" && this.supported()) {
      /* chỉ tự bật lại nếu trình duyệt đã được cấp quyền trước đó (không tự hiện hộp xin quyền khi vừa mở trang) */
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "geolocation" }).then(r => r.state === "granted" ? this.startGps() : this._status("sim")).catch(() => this._status("sim"));
      } else this._status("sim");
    } else this._status("sim");
    Bus.emit("loc:mode", this.mode); Bus.emit("loc:update", this.pos);
  },
  supported() { return "geolocation" in navigator; },
  _status(s) { this.status = s; Bus.emit("loc:status", { status: s, mode: this.mode, accuracy: this.pos.accuracy }); },

  /* ----- giả lập ----- */
  set(lat, lng, accuracy = 5, src = "sim") { this.pos = { lat, lng, accuracy, src }; this.hasFix = true; Bus.emit("loc:update", this.pos); },
  startWalk(ids) {
    if (this.mode !== "sim") return;
    const route = (ids && ids.length ? ids : POIService.all().map(p => p.id)).map(id => POIService.get(id)).filter(Boolean);
    if (!route.length) return;
    this.stopWalk(true); this.walking = true; Bus.emit("walk:state", true);
    this.set(route[0].lat - 0.002, route[0].lng - 0.002);
    let i = 0, last = performance.now();
    const step = now => {
      if (!this.walking) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const next = Geo.move(this.pos, route[i], this.WALK_SPEED * dt);
      this.set(next.lat, next.lng);
      if (Geo.dist(this.pos, route[i]) < 1) { i++; if (i >= route.length) { this.stopWalk(); Bus.emit("walk:done"); return; } }
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  },
  /* chạy chấm xanh dọc theo một đường (mảng [lat,lng]) - dùng để thử dẫn đường khi giả lập */
  walkPath(coords, speed) {
    if (this.mode !== "sim" || !coords || coords.length < 2) return;
    speed = speed || 30;
    this.stopWalk(true); this.walking = true; Bus.emit("walk:state", true);
    const pts = coords.map(c => ({ lat: c[0], lng: c[1] }));
    this.set(pts[0].lat, pts[0].lng);
    let i = 1, last = performance.now();
    const step = now => {
      if (!this.walking) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (i >= pts.length) { this.stopWalk(); Bus.emit("walk:done"); return; }
      const nx = Geo.move(this.pos, pts[i], speed * dt); this.set(nx.lat, nx.lng);
      if (Geo.dist(this.pos, pts[i]) < 0.5) i++;
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  },
  stopWalk(silent) { cancelAnimationFrame(this._raf); if (this.walking) { this.walking = false; if (!silent) Bus.emit("walk:state", false); } },

  /* ----- GPS thật ----- */
  startGps() {
    if (!window.isSecureContext) { this._fallback("insecure"); return; }
    if (!this.supported()) { this._fallback("unsupported"); return; }
    this.stopWalk();
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    this.mode = "gps"; this.hasFix = false; Store.set("locMode", "gps");
    Bus.emit("loc:mode", "gps"); this._status("asking");
    this.watchId = navigator.geolocation.watchPosition(p => this._onFix(p), e => this._onErr(e), { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
    this._wake();
  },
  stopGps() {
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null; this._unwake(); this.mode = "sim"; Store.set("locMode", "sim");
    this._resetSim();
    Bus.emit("loc:mode", "sim"); this._status("sim");
  },
  /* vào chế độ giả lập: chưa có vị trí, chấm xanh ẩn cho tới khi người dùng bấm lên bản đồ */
  _resetSim() {
    this.stopWalk(true);
    this.hasFix = false; this.pos = Object.assign({}, this.START, { accuracy: 5, src: "sim" });
    GeofenceService.reset(); Bus.emit("loc:update", this.pos);
  },
  _onFix(p) {
    const c = p.coords;
    this.pos = { lat: c.latitude, lng: c.longitude, accuracy: Math.round(c.accuracy), src: "gps", ts: p.timestamp };
    this.hasFix = true; Bus.emit("loc:update", this.pos);
    this._status(c.accuracy <= this.ACC_TRUST ? "ok" : "weak");
  },
  _onErr(e) {
    if (e.code === 1) this._fallback("denied");        // người dùng từ chối
    else if (e.code === 2) this._status("unavailable"); // không xác định được vị trí
    else this._status("timeout");                       // hết thời gian chờ (watchPosition vẫn tiếp tục thử)
  },
  /* GPS không dùng được -> quay về giả lập và báo lý do */
  _fallback(reason) {
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null; this._unwake(); this.mode = "sim"; Store.set("locMode", "sim");
    this._resetSim();
    Bus.emit("loc:mode", "sim"); this._status(reason);
  },
  /* giữ màn hình sáng để GPS không bị trình duyệt tạm dừng */
  async _wake() {
    try { if (!("wakeLock" in navigator) || this.wake) return; this.wake = await navigator.wakeLock.request("screen"); this.wake.addEventListener("release", () => { this.wake = null; }); } catch (e) {}
  },
  _unwake() { try { if (this.wake) this.wake.release(); } catch (e) {} this.wake = null; }
};
