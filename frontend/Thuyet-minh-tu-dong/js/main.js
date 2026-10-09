/* main: khởi tạo ứng dụng và nối các service với giao diện */
function renderFeatured() {
  const lang = Settings.get().lang;
  /* 3 điểm nổi bật = 3 điểm có mức ưu tiên cao nhất đang xuất bản (không phụ thuộc id cố định, nên Admin xoá/ẩn điểm nào cũng không lỗi) */
  const top = POIService.all().slice().sort((a, b) => b.pri - a.pri || a.id - b.id).slice(0, 3);
  if (!top.length) { $("#featured").innerHTML = '<div class="empty-box"><i class="fas fa-map-marked-alt"></i>Chưa có địa điểm nào được xuất bản.</div>'; return; }
  $("#featured").innerHTML = top.map((p, i) => {
    const id = p.id;
    const visual = `<div class="pi-visual" style="background:${POIService.grad(p)}"><i class="fas ${p.icon}"></i></div>`;
    const body = `<div class="product-introduce-content">
      <p class="product-introduce--content-title">${Helper.esc(p.name[lang])}</p>
      <p class="product-introduce--content-contents">${Helper.esc(p.text[lang])}</p>
      <div class="pi-actions">
        <button class="btn btn--primary" data-act="listen" data-id="${id}"><i class="fas fa-headphones"></i> Nghe thử</button>
        <button class="btn btn--ghost" data-act="open" data-id="${id}"><i class="fas fa-info-circle"></i> Xem chi tiết</button>
      </div></div>`;
    return `<div class="product-introduce">${i % 2 ? body + visual : visual + body}</div>`;
  }).join("");
}

function bindSettings() {
  const upd = () => {
    const s = Settings.get();
    $("#setAuto").classList.toggle("on", s.auto);
    $("#setCool").value = s.cool; $("#coolVal").textContent = s.cool + " giây giữa hai lần phát cùng một điểm";
    $("#setRate").value = s.rate; $("#rateVal").textContent = "×" + Number(s.rate).toFixed(1);
  };
  $("#setAuto").onclick = () => Settings.set({ auto: !Settings.get().auto });
  $("#setCool").oninput = e => Settings.set({ cool: Number(e.target.value) });
  $("#setRate").oninput = e => Settings.set({ rate: Number(Number(e.target.value).toFixed(1)) });
  Bus.on("settings:change", upd); upd();
}

document.addEventListener("DOMContentLoaded", () => {
  Modal.init();
  GeofenceService.init(); NarrationService.init(); HistoryService.init(); TourService.init();
  const safe = (name, fn) => { try { fn(); } catch (e) { console.error("Lỗi khởi tạo " + name, e); } };
  safe("Navigation", () => NavigationService.init());
  safe("Nav", () => Nav.init()); safe("MapUI", () => MapUI.init()); safe("PoiUI", () => PoiUI.init()); safe("PlayerUI", () => PlayerUI.init());
  safe("SearchUI", () => SearchUI.init()); safe("DestUI", () => DestUI.init()); safe("NavUI", () => NavUI.init());
  safe("TourUI", () => TourUI.init()); safe("AuthUI", () => AuthUI.init()); safe("Settings", bindSettings); safe("Featured", renderFeatured);

  $("#featured").addEventListener("click", e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const p = POIService.get(b.dataset.id);
    if (b.dataset.act === "listen") NarrationService.play(p, false); else Bus.emit("poi:open", p.id);
  });

  /* thông báo cho người dùng khi service ra quyết định */
  Bus.on("narration:play", ({ poi, auto }) => { if (auto) toast({ title: "Đã vào vùng", message: poi.name[Settings.get().lang], type: "success" }); });
  Bus.on("narration:skip", ({ poi, reason }) => toast({ title: poi.name[Settings.get().lang], type: "warning",
    message: reason === "cool" ? "Đang trong thời gian cooldown, bỏ qua." : "Đang phát điểm có ưu tiên cao hơn, bỏ qua." }));
  Bus.on("audio:unsupported", () => toast({ title: "Không có giọng đọc", message: "Trình duyệt này không hỗ trợ đọc văn bản thành tiếng.", type: "error" }));
  Bus.on("walk:done", () => toast({ title: "Hoàn thành", message: "Chấm xanh đã đi hết lộ trình.", type: "info" }));
  Bus.on("lang:change", () => { renderFeatured(); if (AudioService.state === "playing") AudioService.replay(); });
  /* thao tác đầu tiên của người dùng mở khoá âm thanh trên trình duyệt */
  document.addEventListener("pointerdown", () => AudioService.unlock(), { once: true });

  safe("LocationService", () => LocationService.init());
});
