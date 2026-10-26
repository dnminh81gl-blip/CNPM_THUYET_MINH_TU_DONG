/* NarrationService: quyết định "có nên phát hay không".
   - Debounce: phải ở trong vùng liên tục DEBOUNCE ms mới xét (đi sượt qua không kích hoạt).
   - Cooldown: mỗi điểm không phát lại trong N giây (cài đặt được).
   - Ưu tiên: điểm mới có ưu tiên CAO HƠN điểm đang phát thì phát ngay (ngắt điểm đang phát).
   - Hàng đợi: đang phát mà vào vùng điểm khác (ưu tiên bằng hoặc thấp hơn) thì KHÔNG bỏ qua, mà xếp hàng;
     đọc xong điểm hiện tại sẽ tự phát tiếp điểm trong hàng đợi (ưu tiên cao trước, rồi tới điểm vào trước).
     Điểm chờ quá QUEUE_MAX_AGE (đã đi xa) thì bỏ; bấm Dừng thì xoá hàng đợi. */
const NarrationService = {
  DEBOUNCE: 800,
  QUEUE_MAX_AGE: 5 * 60 * 1000,
  last: {},
  timers: {},
  queue: [],
  init() {
    Bus.on("geo:enter", ({ poi }) => {
      if (!Settings.get().auto) return;
      clearTimeout(this.timers[poi.id]);
      this.timers[poi.id] = setTimeout(() => this.decide(poi), this.DEBOUNCE);
    });
    Bus.on("geo:exit", ({ poi }) => clearTimeout(this.timers[poi.id]));
    /* đọc xong một bài -> phát tiếp điểm đang chờ (đợi một chút để phần "nghe liền" của Tổng quan chạy trước) */
    Bus.on("audio:end", () => setTimeout(() => { if (AudioService.state === "idle") this.next(); }, 600));
    Bus.on("audio:stop", () => this.clearQueue());
  },
  coolingDown(poi) { const s = Settings.get(); return this.last[poi.id] && Date.now() - this.last[poi.id] < s.cool * 1000; },
  decide(poi) {
    if (!GeofenceService.isInside(poi.id)) return;
    if (this.coolingDown(poi)) { Bus.emit("narration:skip", { poi, reason: "cool" }); return; }
    const cur = AudioService.current;
    if (AudioService.state === "playing" && cur && cur.id !== poi.id && cur.pri >= poi.pri) { this.enqueue(poi); return; }
    this.play(poi, true);
  },
  enqueue(poi) {
    if (this.queue.some(q => q.poi.id === poi.id)) return;
    this.queue.push({ poi, at: Date.now() });
    Bus.emit("narration:queued", { poi, size: this.queue.length });
  },
  clearQueue() { if (this.queue.length) { this.queue = []; Bus.emit("narration:queue", { size: 0 }); } },
  next() {
    const now = Date.now();
    this.queue = this.queue.filter(q => now - q.at <= this.QUEUE_MAX_AGE && !this.coolingDown(q.poi));
    if (!this.queue.length) return;
    this.queue.sort((a, b) => (b.poi.pri - a.poi.pri) || (a.at - b.at));
    const { poi } = this.queue.shift();
    Bus.emit("narration:queue", { size: this.queue.length });
    this.play(poi, true);
  },
  /* auto=true: do geofence kích hoạt; auto=false: người dùng tự bấm nghe (bỏ qua cooldown/ưu tiên) */
  play(poi, auto = false) {
    this.last[poi.id] = Date.now();
    this.queue = this.queue.filter(q => q.poi.id !== poi.id);
    Bus.emit("narration:play", { poi, auto });
    AudioService.play(poi);
  }
};
