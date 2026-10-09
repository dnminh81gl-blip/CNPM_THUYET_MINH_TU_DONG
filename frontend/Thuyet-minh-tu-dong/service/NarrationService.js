/* NarrationService: quyết định "có nên phát hay không".
   - Debounce: phải ở trong vùng liên tục DEBOUNCE ms mới xét (đi sượt qua không kích hoạt).
   - Cooldown: mỗi điểm không phát lại trong N giây (cài đặt được).
   - Ưu tiên: đang phát điểm có ưu tiên >= điểm mới thì bỏ qua điểm mới. */
const NarrationService = {
  DEBOUNCE: 800,
  last: {},
  timers: {},
  init() {
    Bus.on("geo:enter", ({ poi }) => {
      if (!Settings.get().auto) return;
      clearTimeout(this.timers[poi.id]);
      this.timers[poi.id] = setTimeout(() => this.decide(poi), this.DEBOUNCE);
    });
    Bus.on("geo:exit", ({ poi }) => clearTimeout(this.timers[poi.id]));
  },
  decide(poi) {
    if (!GeofenceService.isInside(poi.id)) return;
    const s = Settings.get(), cur = AudioService.current;
    if (this.last[poi.id] && Date.now() - this.last[poi.id] < s.cool * 1000) { Bus.emit("narration:skip", { poi, reason: "cool" }); return; }
    if (AudioService.state === "playing" && cur && cur.id !== poi.id && cur.pri >= poi.pri) { Bus.emit("narration:skip", { poi, reason: "busy" }); return; }
    this.play(poi, true);
  },
  /* auto=true: do geofence kích hoạt; auto=false: người dùng tự bấm nghe (bỏ qua cooldown/ưu tiên) */
  play(poi, auto = false) {
    this.last[poi.id] = Date.now();
    Bus.emit("narration:play", { poi, auto });
    AudioService.play(poi);
  }
};
