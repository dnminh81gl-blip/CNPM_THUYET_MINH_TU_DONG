/* GeofenceService: chỉ trả lời "người dùng có đang trong vùng POI nào không".
   Vào vùng khi khoảng cách <= bán kính; ra vùng khi > 1,1 lần bán kính (hysteresis, tránh nhấp nháy do nhiễu GPS). */
const GeofenceService = {
  inside: new Set(),
  EXIT_FACTOR: 1.1,
  init() { Bus.on("loc:update", pos => this.check(pos)); },
  dist(p, pos) { return Geo.dist(p, pos); },
  isInside(id) { return this.inside.has(id); },
  /* xoá trạng thái "đang trong vùng" (khi mất vị trí / đổi chế độ) */
  reset() { this.inside.clear(); Bus.emit("geo:state", { inside: [], pos: null }); },
  check(pos) {
    if (!LocationService.hasFix) return;
    /* GPS thật mà sai số quá lớn thì không dùng để kích hoạt (tránh phát nhầm khi tín hiệu yếu) */
    if (pos.src === "gps" && pos.accuracy > LocationService.ACC_TRUST) return;
    POIService.all().forEach(p => {
      const d = this.dist(p, pos), was = this.inside.has(p.id);
      if (!was && d <= p.r) { this.inside.add(p.id); Bus.emit("geo:enter", { poi: p, dist: d }); }
      else if (was && d > p.r * this.EXIT_FACTOR) { this.inside.delete(p.id); Bus.emit("geo:exit", { poi: p }); }
    });
    Bus.emit("geo:state", { inside: [...this.inside], pos });
  }
};
