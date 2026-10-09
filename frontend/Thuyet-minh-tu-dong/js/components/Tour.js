/* Tour: trang "Tour của tôi" (giống giỏ hàng): danh sách điểm dừng + tóm tắt + bắt đầu */
const TourUI = {
  init() {
    $("#presetBox").addEventListener("click", e => {
      const b = e.target.closest("[data-preset]"); if (!b) return;
      const t = TourService.presets().find(x => x.id == b.dataset.preset); if (!t) return;
      const ids = t.poiIds.filter(id => POIService.get(id));
      if (!ids.length) { toast({ title: "Tour trống", message: "Các điểm trong tour này hiện không khả dụng.", type: "warning" }); return; }
      TourService.setList(ids); toast({ title: "Đã nạp tour gợi ý", message: t.name, type: "success" });
    });
    $("#tourList").addEventListener("click", e => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const id = Number(b.dataset.id), a = b.dataset.act;
      if (a === "rm") TourService.remove(id);
      else if (a === "up") TourService.move(id, -1);
      else if (a === "down") TourService.move(id, 1);
      else if (a === "listen") NarrationService.play(POIService.get(id), false);
    });
    $("#tourStart").onclick = () => {
      const ids = TourService.list();
      if (!ids.length) { toast({ title: "Tour đang trống", message: "Hãy thêm vài địa điểm trước.", type: "warning" }); return; }
      TourService.resetVisited(); AudioService.stop(); Nav.go("places");
      if (LocationService.mode === "gps") { toast({ title: "Bắt đầu tour", message: `Hãy đi bộ tới ${ids.length} điểm dừng, thuyết minh sẽ tự phát khi bạn đến gần.`, type: "success", duration: 4500 }); return; }
      LocationService.startWalk(ids); toast({ title: "Bắt đầu tour", message: `${ids.length} điểm dừng (chế độ giả lập)`, type: "success" });
    };
    $("#tourClear").onclick = () => { if (TourService.list().length && confirm("Xoá toàn bộ tour?")) TourService.clear(); };
    Bus.on("tour:change", () => this.render());
    Bus.on("lang:change", () => this.render());
    this.render();
  },
  render() {
    const pr = TourService.presets();
    $("#presetBox").innerHTML = pr.length ? `<div class="preset-box"><h3><i class="fas fa-star"></i> Tour gợi ý</h3>` + pr.map(t =>
      `<div class="preset"><div><b>${Helper.esc(t.name)}</b><small>${t.poiIds.filter(id => POIService.get(id)).length} điểm${t.desc ? " · " + Helper.esc(t.desc) : ""}</small></div><button class="btn btn--ghost" data-preset="${t.id}">Dùng tour này</button></div>`).join("") + `</div>` : "";
    const ids = TourService.list(), done = TourService.visited();
    $("#tourBadge").textContent = ids.length;
    $("#sumCount").textContent = ids.length; $("#sumDone").textContent = `${done.filter(i => ids.includes(i)).length}/${ids.length}`;
    $("#sumTime").textContent = Helper.mmss(TourService.estimate());
    $("#tourList").innerHTML = ids.length ? ids.map((id, i) => {
      const p = POIService.get(id), ok = done.includes(id), lang = Settings.get().lang;
      return `<div class="tour-row ${ok ? "done" : ""}">
        <div class="tour-no">${ok ? '<i class="fas fa-check"></i>' : i + 1}</div>
        <div class="tour-ico" style="background:${POIService.grad(p)}"><i class="fas ${p.icon}"></i></div>
        <div class="tour-body"><b>${Helper.esc(p.name[lang])}<span class="tour-badge">${ok ? "Đã nghe" : "Chưa nghe"}</span></b><small>${Helper.esc(p.cat)} · bán kính ${p.r} m</small></div>
        <div class="tour-acts">
          <button data-act="up" data-id="${id}" aria-label="Lên"><i class="fas fa-arrow-up"></i></button>
          <button data-act="down" data-id="${id}" aria-label="Xuống"><i class="fas fa-arrow-down"></i></button>
          <button data-act="listen" data-id="${id}" aria-label="Nghe"><i class="fas fa-headphones"></i></button>
          <button class="rm" data-act="rm" data-id="${id}" aria-label="Xoá"><i class="fas fa-trash"></i></button>
        </div></div>`;
    }).join("") : `<div class="empty-box"><i class="fas fa-route"></i><p>Tour của bạn đang trống.</p><br><button class="btn btn--primary" data-go="places"><i class="fas fa-map-marked-alt"></i> Khám phá địa điểm</button></div>`;
  }
};
