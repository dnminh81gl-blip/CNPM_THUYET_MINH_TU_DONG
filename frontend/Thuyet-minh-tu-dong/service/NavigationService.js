/* NavigationService: máy trạng thái dẫn đường (giống nút "Bắt đầu" của Google Maps). Không đụng vào giao diện, chỉ phát sự kiện:
   route:ready · nav:start · nav:update · nav:say · nav:reroute · nav:arrive · nav:stop
   Mỗi lần vị trí đổi: tính đã đi được bao nhiêu dọc tuyến, còn bao xa, bước kế tiếp, có lệch tuyến không (lệch quá OFF_ROUTE_M
   nhiều lần liên tiếp thì tính lại đường, tối thiểu cách nhau REROUTE_MIN_GAP_S giây). */
const NavigationService = {
  route: null, dest: null, active: false,
  progress: 0, seg: 0, off: 0, lastReroute: 0, rerouting: false, said: {},

  init() { Bus.on("loc:update", pos => this.onLoc(pos)); },
  setRoute(route, dest) { this.stop(true); this.route = route; this.dest = dest; this.progress = 0; this.seg = 0; Bus.emit("route:ready", { route, dest }); },
  clear() { this.stop(true); this.route = null; this.dest = null; Bus.emit("route:clear"); },

  start() {
    if (!this.route) return;
    this.active = true; this.progress = 0; this.seg = 0; this.off = 0; this.said = {}; this.lastReroute = Date.now();
    LocationService._wake();                       // giữ màn hình sáng khi dẫn đường
    Bus.emit("nav:start", { route: this.route, dest: this.dest });
    const s0 = this.route.steps[0];
    if (s0) Bus.emit("nav:say", { step: s0, dist: s0.distance, stage: "start" });
    if (LocationService.hasFix) this.onLoc(LocationService.pos);
  },
  stop(silent) { if (this.active) { this.active = false; if (!silent) Bus.emit("nav:stop"); } },

  onLoc(pos) {
    if (!this.active || !this.route || !LocationService.hasFix) return;
    if (pos.src === "gps" && pos.accuracy > LocationService.ACC_TRUST) return;   // tín hiệu yếu: không dùng để dẫn đường
    const r = this.route, n = RouteService.nearest(r, pos, this.seg);
    if (!n) return;
    const off = n.dist > CONFIG.OFF_ROUTE_M;
    if (!off) { this.seg = n.seg; this.progress = Math.max(this.progress, n.along); this.off = 0; } else this.off++;
    const remaining = Math.max(0, r.total - this.progress);
    const idx = RouteService.stepIndex(r, this.seg), next = r.steps[idx + 1] || null;
    const distToNext = next ? Math.max(0, r.cum[next.wp[0]] - this.progress) : remaining;
    const remTime = r.duration * (r.total ? remaining / r.total : 0);
    Bus.emit("nav:update", { remaining, remTime, idx, step: r.steps[idx], next, distToNext, off, offDist: n.dist, pos });

    /* đã đến nơi */
    const toDest = Geo.dist(pos, { lat: r.coords[r.coords.length - 1][0], lng: r.coords[r.coords.length - 1][1] });
    if (remaining <= CONFIG.ARRIVE_M || toDest <= CONFIG.ARRIVE_M) { this.active = false; Bus.emit("nav:arrive", { dest: this.dest }); return; }

    /* báo bước kế tiếp: một lần khi còn ~120 m, một lần khi còn ~30 m */
    if (next && !off) {
      const k = idx + 1;
      if (distToNext <= 130 && distToNext > 45 && !this.said[k + "f"]) { this.said[k + "f"] = 1; Bus.emit("nav:say", { step: next, dist: distToNext, stage: "far" }); }
      if (distToNext <= 35 && !this.said[k + "n"]) { this.said[k + "n"] = 1; this.said[k + "f"] = 1; Bus.emit("nav:say", { step: next, dist: distToNext, stage: "near" }); }
    }
    /* lệch tuyến: tính lại đường */
    if (off && this.off >= 3 && !this.rerouting && Date.now() - this.lastReroute > CONFIG.REROUTE_MIN_GAP_S * 1000) this.reroute(pos);
  },

  async reroute(pos) {
    this.rerouting = true; this.lastReroute = Date.now(); Bus.emit("nav:reroute", { state: "start" });
    try {
      const nr = await RouteService.route(pos, this.dest);
      if (!this.active) return;
      this.route = nr; this.progress = 0; this.seg = 0; this.off = 0; this.said = {};
      Bus.emit("route:ready", { route: nr, dest: this.dest, rerouted: true }); Bus.emit("nav:reroute", { state: "done" });
      const s0 = nr.steps[0]; if (s0) Bus.emit("nav:say", { step: s0, dist: s0.distance, stage: "reroute" });
    } catch (e) { Bus.emit("nav:reroute", { state: "fail", error: e }); }
    finally { this.rerouting = false; }
  }
};
