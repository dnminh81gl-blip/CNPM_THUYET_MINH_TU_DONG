/* TourService: danh sách điểm dừng người dùng đã chọn (giống giỏ hàng) và trạng thái đã nghe. */
const TourService = {
  init() { Bus.on("audio:start", ({ poi }) => { if (this.has(poi.id)) this.markVisited(poi.id); }); },
  list() { return Store.get("tour", []).filter(id => POIService.get(id)); },
  setList(ids) { Store.set("tour", ids); Store.set("tourVisited", []); Bus.emit("tour:change"); },
  presets() { return Store.get("tours", []).filter(t => t.status !== "draft"); },
  visited() { return Store.get("tourVisited", []); },
  has(id) { return this.list().includes(id); },
  add(id) { if (!this.has(id)) { Store.set("tour", [...this.list(), id]); Bus.emit("tour:change"); } },
  remove(id) { Store.set("tour", this.list().filter(x => x !== id)); Store.set("tourVisited", this.visited().filter(x => x !== id)); Bus.emit("tour:change"); },
  move(id, dir) { const l = this.list(), i = l.indexOf(id), j = i + dir; if (i < 0 || j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; Store.set("tour", l); Bus.emit("tour:change"); },
  toggle(id) { this.has(id) ? this.remove(id) : this.add(id); return this.has(id); },
  clear() { Store.set("tour", []); Store.set("tourVisited", []); Bus.emit("tour:change"); },
  resetVisited() { Store.set("tourVisited", []); Bus.emit("tour:change"); },
  markVisited(id) { if (!this.visited().includes(id)) { Store.set("tourVisited", [...this.visited(), id]); Bus.emit("tour:change"); } },
  estimate() { const { lang, rate } = Settings.get(); return this.list().reduce((s, id) => s + POIService.duration(POIService.get(id), lang, rate), 0); }
};
