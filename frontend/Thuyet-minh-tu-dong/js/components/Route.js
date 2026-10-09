/* Route: thẻ điểm đến + chỉ đường (DestUI) và giao diện dẫn đường kiểu Google Maps (NavUI) */
const ICON_ROT = { 0: -90, 1: 90, 2: -135, 3: 135, 4: -45, 5: 45, 6: 0, 9: 180, 12: -45, 13: 45 };
function stepIcon(type) {
  if (type === 10) return '<i class="fas fa-flag-checkered"></i>';
  if (type === 11) return '<i class="fas fa-walking"></i>';
  if (type === 7 || type === 8) return '<i class="fas fa-sync-alt"></i>';
  return `<i class="fas fa-arrow-up" style="transform:rotate(${ICON_ROT[type] || 0}deg)"></i>`;
}

const DestUI = {
  dest: null, state: "idle", err: null, route: null,
  init() {
    $("#dcClose").onclick = () => this.close();
    $("#dcRoute").onclick = () => this.requestRoute();
    $("#dcStart").onclick = () => NavigationService.start();
    $("#dcListen").onclick = () => { if (this.dest && this.dest.poi) NarrationService.play(this.dest.poi, false); };
    Bus.on("loc:update", () => this.render());
    Bus.on("route:ready", e => this.ready(e));
    Bus.on("route:clear", () => { this.route = null; if (this.state !== "idle") this.state = "idle"; MapUI.clearRoute(); this.hideSteps(); this.render(); });
    Bus.on("dest:route", d => { this.show(d); this.requestRoute(); });
    Bus.on("lang:change", () => { if (this.dest && this.dest.poi) { this.dest.name = this.dest.poi.name[Settings.get().lang]; } this.render(); if (this.route) this.renderSteps(this.route); });
  },
  poiDest(p) { return { type: "poi", id: p.id, name: p.name[Settings.get().lang], sub: p.addr, lat: p.lat, lng: p.lng, poi: p }; },
  showPoi(p) { this.show(this.poiDest(p)); },
  showPlace(g) { this.show({ type: "place", name: g.name, sub: g.label, lat: g.lat, lng: g.lng }); },
  show(d) {
    NavigationService.clear(); this.dest = d; this.state = "idle"; this.err = null;
    MapUI.setTemp(d); MapUI.goTo(d.lat, d.lng, 17);
    if (d.type === "poi") MapUI.pulse(d.id);
    this.render();
  },
  close() { NavigationService.clear(); this.dest = null; MapUI.clearTemp(); this.render(); },

  async requestRoute() {
    const d = this.dest; if (!d) return;
    if (!LocationService.hasFix) {
      toast({ title: "Chưa có vị trí xuất phát", type: "warning", duration: 4500,
        message: LocationService.mode === "gps" ? "Đang chờ GPS xác định vị trí của bạn..." : "Hãy bấm lên bản đồ để đặt vị trí xuất phát của bạn (chế độ Giả lập), hoặc bật GPS thật." });
      return;
    }
    this.state = "loading"; this.err = null; this.render();
    try {
      const r = await RouteService.route(LocationService.pos, d);
      if (this.dest !== d) return;
      NavigationService.setRoute(r, d);
    } catch (e) { if (this.dest !== d) return; this.state = "error"; this.err = e; this.render(); }
  },
  ready({ route, dest, rerouted }) {
    if (!this.dest) return;
    this.route = route; this.state = "ready"; this.err = null; this.render();
    MapUI.drawRoute(route.coords, !rerouted); this.renderSteps(route);
  },

  render() {
    const card = $("#destCard"), d = this.dest, lang = Settings.get().lang;
    if (!d) { card.hidden = true; return; }
    card.hidden = NavigationService.active;
    $("#dcName").textContent = d.name; $("#dcSub").textContent = d.sub || "";
    const info = $("#dcInfo"); info.classList.toggle("err", this.state === "error");
    if (this.state === "loading") info.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tìm đường đi bộ...';
    else if (this.state === "ready" && this.route) info.innerHTML = `<i class="fas fa-walking"></i> ${RouteService.fmtDur(this.route.duration, lang)} · ${RouteService.fmtDist(this.route.distance, lang)}`;
    else if (this.state === "error" && this.err) info.textContent = this.err.message;
    else info.textContent = LocationService.hasFix ? "Cách bạn khoảng " + RouteService.fmtDist(Geo.dist(d, LocationService.pos), lang) + " (đường chim bay)" : "Bấm \"Chỉ đường\" để xem đường đi";
    $("#dcRoute").hidden = this.state === "ready"; $("#dcRoute").disabled = this.state === "loading";
    $("#dcRoute").innerHTML = this.state === "error" ? '<i class="fas fa-redo"></i> Thử lại' : '<i class="fas fa-route"></i> Chỉ đường';
    $("#dcStart").hidden = this.state !== "ready";
    $("#dcListen").hidden = d.type !== "poi";
    $("#dcGmaps").href = RouteService.gmapsUrl(LocationService.hasFix ? LocationService.pos : null, d);
  },

  renderSteps(route) {
    const lang = Settings.get().lang, box = $("#routeSteps");
    box.innerHTML = `<h4>Hướng dẫn đi bộ <span>${RouteService.fmtDur(route.duration, lang)} · ${RouteService.fmtDist(route.distance, lang)}</span></h4><ol>` +
      route.steps.map(s => `<li><span class="rs-ic">${stepIcon(s.type)}</span><span>${Helper.esc(RouteService.instr(s, lang))}</span><span class="rs-d">${s.type === 10 ? "" : RouteService.fmtDist(s.distance, lang)}</span></li>`).join("") + `</ol>`;
    box.hidden = false;
  },
  hideSteps() { $("#routeSteps").hidden = true; }
};

const NavUI = {
  voice: true,
  init() {
    $("#nbStop").onclick = () => NavigationService.stop();
    $("#nbVoice").onclick = () => { this.voice = !this.voice; $("#nbVoice").classList.toggle("mute", !this.voice); };
    $("#nbSim").onclick = () => { if (NavigationService.route) LocationService.walkPath(NavigationService.route.coords, 30); };
    Bus.on("nav:start", () => this.enter());
    Bus.on("nav:update", e => this.update(e));
    Bus.on("nav:say", e => this.say(e));
    Bus.on("nav:reroute", e => {
      if (e.state === "start") toast({ title: "Bạn đã đi lệch tuyến", message: "Đang tính lại đường...", type: "warning" });
      else if (e.state === "fail") toast({ title: "Không tính lại được đường", message: e.error && e.error.message || "", type: "error", duration: 4000 });
    });
    Bus.on("nav:arrive", e => this.arrive(e));
    Bus.on("nav:stop", () => this.exit());
    Bus.on("map:userpan", () => { if (NavigationService.active) $("#zme").classList.add("attn"); });
  },
  enter() {
    const c = document.querySelector(".map-card"); c.classList.add("nav-on");
    $("#destCard").hidden = true; $("#navTop").hidden = false; $("#navBottom").hidden = false; $("#navTop").classList.remove("off");
    $("#nbSim").hidden = LocationService.mode !== "sim";
    $("#ntIc").innerHTML = stepIcon(11); $("#ntText").textContent = "Bắt đầu đi"; $("#ntSub").textContent = "";
    $("#nbRem").textContent = RouteService.fmtDist(NavigationService.route.total, Settings.get().lang); $("#nbTime").textContent = "";
    MapUI.follow = true; $("#zme").classList.remove("attn"); MapUI.resize();
    setTimeout(() => { c.scrollIntoView({ block: "start", behavior: "smooth" }); if (LocationService.hasFix) MapUI.followMe(LocationService.pos); }, 120);
  },
  exit() {
    document.querySelector(".map-card").classList.remove("nav-on");
    $("#navTop").hidden = true; $("#navBottom").hidden = true; $("#zme").classList.remove("attn");
    if (LocationService.walking) LocationService.stopWalk();
    DestUI.render(); MapUI.resize();
  },
  update({ remaining, remTime, next, distToNext, off, pos }) {
    const lang = Settings.get().lang, s = next || { type: 10, name: "" };
    $("#navTop").classList.toggle("off", off);
    $("#ntIc").innerHTML = off ? '<i class="fas fa-exclamation-triangle"></i>' : stepIcon(s.type);
    $("#ntText").textContent = off ? "Bạn đã đi lệch tuyến" : RouteService.instr(s, lang);
    $("#ntSub").textContent = off ? "Hãy quay lại đường đã vẽ, hoặc chờ tính lại đường" : (next ? "Sau " + RouteService.fmtDist(distToNext, lang) : "Còn " + RouteService.fmtDist(remaining, lang));
    $("#nbRem").textContent = RouteService.fmtDist(remaining, lang);
    const eta = new Date(Date.now() + remTime * 1000);
    $("#nbTime").textContent = RouteService.fmtDur(remTime, lang) + " · đến " + String(eta.getHours()).padStart(2, "0") + ":" + String(eta.getMinutes()).padStart(2, "0");
    MapUI.followMe(pos);
  },
  /* đọc to chỉ dẫn. Thuyết minh địa điểm được ưu tiên: đang phát thuyết minh thì chỉ hiện chữ, không đọc chồng */
  say({ step, dist, stage }) {
    if (!this.voice || !("speechSynthesis" in window) || AudioService.state !== "idle") return;
    const lang = Settings.get().lang, text = (stage === "start" || stage === "reroute") ? RouteService.instr(step, lang) : RouteService.spoken(step, dist, lang);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANGS[lang].tts; u.rate = Settings.get().rate;
    const vn = Store.get("voices", {})[lang]; if (vn) { const v = speechSynthesis.getVoices().find(x => x.name === vn); if (v) u.voice = v; }
    speechSynthesis.speak(u);
  },
  arrive({ dest }) {
    toast({ title: "Bạn đã đến nơi", message: dest ? dest.name : "", type: "success", duration: 4500 });
    this.say({ step: { type: 10, name: "" }, dist: 0 });
    this.exit();
    NavigationService.clear();
  }
};
