/* main: khởi tạo ứng dụng và nối các service với giao diện */
function renderFeatured() {
  const lang = Settings.get().lang;
  /* Một mã QR vào web: trang chủ liệt kê MỌI điểm đang xuất bản (theo thứ tự tham quan), du khách chạm điểm nào thì nghe điểm đó */
  const top = POIService.all().slice().sort((a, b) => a.id - b.id);
  if (!top.length) { $("#featured").innerHTML = `<div class="empty-box"><i class="fas fa-map-marked-alt"></i>${t("pl.none")}</div>`; return; }
  const curId = AudioService.state !== "idle" && AudioService.current ? AudioService.current.id : null;
  $("#featured").innerHTML = top.map((p, i) => {
    const id = p.id, sub = lang !== "vi" ? `<small class="stop-vi">${Helper.esc(p.name.vi)}</small>` : "";
    return `<article class="stop ${id === curId ? "is-playing" : ""}" data-stop="${id}">
      <button class="stop-visual" type="button" data-act="open" data-id="${id}" aria-label="${Helper.esc(t("st.detailAria", { name: p.name[lang] }))}">
        ${POIService.media(p, 800)}<span class="stop-no">${String(i + 1).padStart(2, "0")}</span><span class="stop-cat">${Helper.esc(tv(p.cat))}</span>
        <span class="stop-eq" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
      <div class="stop-body">
        <h3 class="stop-name">${Helper.esc(p.name[lang])}${sub}</h3>
        <p class="stop-addr"><i class="fas fa-map-marker-alt"></i> ${Helper.esc(tv(p.addr))} <span class="stop-dur"><i class="far fa-clock"></i> ${Helper.mmss(POIService.duration(p, lang, Settings.get().rate))}</span></p>
        <p class="stop-text">${Helper.esc(p.text[lang])}</p>
        <div class="stop-acts">
          <button class="btn btn--primary" type="button" data-act="listen" data-id="${id}"><i class="fas fa-headphones"></i> ${t("st.listen")}</button>
          <button class="btn btn--ghost" type="button" data-act="open" data-id="${id}"><i class="fas fa-info-circle"></i> ${t("st.detail")}</button>
        </div>
      </div></article>`;
  }).join("");
}

/* Hiện vật và không gian trưng bày: bấm vào để xem ảnh lớn */
function renderGallery() {
  const lang = Settings.get().lang, list = POIService.EXHIBITS;
  $("#gallery").innerHTML = list.map((x, i) => `
    <button class="gallery-item ${i === 0 ? "gallery-item--big" : ""}" type="button" data-ex="${i}" aria-label="${Helper.esc(x.cap[lang] || x.cap.vi)}">
      <i class="fas fa-image poi-fallback"></i>
      <img class="poi-photo" src="${Helper.esc(POIService.photoUrl(x.img, i === 0 ? 1024 : 640))}" alt="${Helper.esc(x.cap.vi)}" loading="lazy" decoding="async" onerror="this.remove()" />
      <span class="gallery-cap"><b>${Helper.esc(x.cap[lang] || x.cap.vi)}</b></span>
    </button>`).join("");
}
function openExhibit(i) {
  const x = POIService.EXHIBITS[i], lang = Settings.get().lang; if (!x) return;
  $("#lbImg").src = POIService.photoUrl(x.img, 1600); $("#lbImg").alt = x.cap.vi;
  $("#lbCap").textContent = x.cap[lang] || x.cap.vi; $("#lbCredit").textContent = x.credit ? t("photo") + ": " + tv(x.credit) : "";
  Modal.open("lightbox");
}

/* Dải số liệu dưới banner */
function renderFacts() {
  const n = POIService.all().length;
  $("#facts").innerHTML = POIService.OVERVIEW.facts.concat([{ v: n, k: "fact.poi" }, { v: "3", k: "fact.lang" }])
    .map(f => `<li><b>${Helper.esc(String(f.v))}</b><small>${Helper.esc(f.k ? t(f.k) : tv(f.t))}</small></li>`).join("");
}

/* Giới thiệu tổng quan: 3 phần, nghe từng phần hoặc nghe liền (tự chuyển sang phần sau khi đọc xong) */
const OverviewUI = {
  queue: null,
  init() {
    const ov = POIService.OVERVIEW, h = POIService.HERO[0];
    $("#ovVisual").innerHTML = `<i class="fas fa-landmark poi-fallback"></i><img class="poi-photo" src="${Helper.esc(POIService.photoUrl(h.img, 1024))}" alt="${Helper.esc(t("logo.name"))}" loading="lazy" onerror="this.remove()" />
      <div class="ov-badge"><b>1962 – 1966</b><small data-i="ov.arch">${Helper.esc(t("ov.arch"))}</small></div>`;
    this.render();
    $("#ovList").addEventListener("click", e => { const b = e.target.closest("[data-ch]"); if (b) this.toggle(Number(b.dataset.ch)); });
    $("#ovAll").onclick = () => this.isAll() ? AudioService.stop() : this.playAll();
    $("#heroListen").onclick = () => { this.playAll(); $("#tongQuan").scrollIntoView({ behavior: "smooth" }); };
    Bus.on("audio:end", ({ poi }) => {
      if (!this.queue || !poi || poi.ov == null) return;
      const next = this.queue.shift();
      if (next == null) { this.queue = null; this.mark(); return; }
      setTimeout(() => { if (this.queue) this.play(next); }, 400);
    });
    Bus.on("audio:start", ({ poi }) => { if (!poi || poi.ov == null) this.queue = null; });
    Bus.on("audio:state", () => this.mark());
    Bus.on("lang:change", () => this.render());
    Bus.on("settings:change", () => this.times());
  },
  render() {
    const lang = Settings.get().lang;
    $("#ovList").innerHTML = POIService.OVERVIEW.chapters.map((c, k) => `
      <li class="ov-ch" data-k="${k}">
        <button class="ov-play" type="button" data-ch="${k}" aria-label="${Helper.esc(t("ov.playPart", { n: k + 1 }))}"><i class="fas fa-play"></i></button>
        <div class="ov-txt"><span class="ov-no">${Helper.esc(t("ov.part", { n: k + 1 }))}<small class="ov-time" data-t="${k}"></small></span>
          <b>${Helper.esc(c.title[lang] || c.title.vi)}</b><small>${Helper.esc(tv(c.sub))}</small></div>
      </li>`).join("");
    this.times(); this.mark();
  },
  dur(k) { const { lang, rate } = Settings.get(); return POIService.duration(POIService.OVERVIEW.item(k), lang, rate); },
  times() {
    let all = 0;
    POIService.OVERVIEW.chapters.forEach((c, k) => { const d = this.dur(k); all += d; const el = $(`.ov-time[data-t="${k}"]`); if (el) el.textContent = " · " + Helper.mmss(d); });
    $("#ovAllTime").textContent = "· " + Helper.mmss(all);
  },
  cur() { const p = AudioService.current; return AudioService.state !== "idle" && p && p.ov != null ? p.ov : null; },
  isAll() { return this.queue !== null && this.cur() !== null; },
  play(k) { NarrationService.play(POIService.OVERVIEW.item(k), false); },
  playAll() { this.queue = [1, 2]; this.play(0); this.mark(); },
  toggle(k) { if (this.cur() === k) AudioService.toggle(); else { this.queue = null; this.play(k); } },
  mark() {
    const c = this.cur(), playing = AudioService.state === "playing";
    $$("#ovList .ov-ch").forEach(li => {
      const on = Number(li.dataset.k) === c;
      li.classList.toggle("on", on);
      li.querySelector(".ov-play").innerHTML = `<i class="fas fa-${on && playing ? "pause" : "play"}"></i>`;
    });
    const all = this.isAll();
    $("#ovAll").classList.toggle("on", all);
    $("#ovAll i").className = "fas fa-" + (all ? "stop" : "play");
    $("#ovAll span").textContent = all ? t("ov.stop") : t("ov.all");
  }
};

/* Đánh dấu thẻ điểm đang phát */
function markPlayingStop() {
  const p = AudioService.current, id = AudioService.state !== "idle" && p ? p.id : null;
  $$("#featured .stop").forEach(el => el.classList.toggle("is-playing", Number(el.dataset.stop) === id && id !== 0));
}

/* Banner trang chủ: ảnh toàn cảnh thành phố tự chuyển */
const Hero = {
  i: 0, t: null,
  init() {
    const h = POIService.HERO; if (!h.length) return;
    $("#heroSlides").innerHTML = h.map((s, i) => `<div class="hero-slide ${i ? "" : "on"}" style="background-image:url('${POIService.photoUrl(s.img, 1920)}')" role="img" aria-label="${Helper.esc(tv(s.cap))}"></div>`).join("");
    $("#heroDots").innerHTML = h.map((s, i) => `<button class="${i ? "" : "on"}" data-idx="${i}" aria-label="${Helper.esc(t("photoN", { n: i + 1, cap: tv(s.cap) }))}"></button>`).join("");
    $("#heroDots").onclick = e => { const b = e.target.closest("[data-idx]"); if (b) { this.show(Number(b.dataset.idx)); this.play(); } };
    this.caption();
    let reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    if (!reduce && h.length > 1) this.play();
    document.addEventListener("visibilitychange", () => document.hidden ? clearInterval(this.t) : (!reduce && this.play()));
  },
  play() { clearInterval(this.t); this.t = setInterval(() => this.show((this.i + 1) % POIService.HERO.length), 6000); },
  show(i) {
    this.i = i;
    $$("#heroSlides .hero-slide").forEach((el, k) => el.classList.toggle("on", k === i));
    $$("#heroDots button").forEach((el, k) => el.classList.toggle("on", k === i));
    this.caption();
  },
  relabel() {
    const h = POIService.HERO;
    $$("#heroSlides .hero-slide").forEach((el, k) => el.setAttribute("aria-label", tv(h[k].cap)));
    $$("#heroDots button").forEach((el, k) => el.setAttribute("aria-label", t("photoN", { n: k + 1, cap: tv(h[k].cap) })));
    this.caption();
  },
  caption() { const s = POIService.HERO[this.i]; $("#heroCredit").innerHTML = `<i class="fas fa-camera"></i> ${Helper.esc(tv(s.cap))} · ${t("photo")}: ${Helper.esc(tv(s.credit))}`; }
};

/* Ghi nguồn ảnh (bắt buộc với ảnh giấy phép CC BY / CC BY-SA) */
function renderCredits() {
  $("#photoCredits").innerHTML = POIService.credits().map(c =>
    `<li><b>${Helper.esc(tv(c.name))}</b>: ${c.page ? `<a href="${Helper.esc(c.page)}" target="_blank" rel="noopener">${Helper.esc(c.credit)}</a>` : Helper.esc(c.credit)}</li>`).join("");
}

function bindSettings() {
  const upd = () => {
    const s = Settings.get();
    $("#setAuto").classList.toggle("on", s.auto);
    $("#setCool").value = s.cool; $("#coolVal").textContent = t("set.coolV", { n: s.cool });
    $("#setRate").value = s.rate; $("#rateVal").textContent = "×" + Number(s.rate).toFixed(1);
  };
  bindSettings.upd = upd;
  $("#setAuto").onclick = () => Settings.set({ auto: !Settings.get().auto });
  $("#setCool").oninput = e => Settings.set({ cool: Number(e.target.value) });
  $("#setRate").oninput = e => Settings.set({ rate: Number(Number(e.target.value).toFixed(1)) });
  Bus.on("settings:change", upd); upd();
}

document.addEventListener("DOMContentLoaded", () => {
  Modal.init();
  try { I18n.init(); } catch (e) { console.error("Lỗi khởi tạo I18n", e); }
  GeofenceService.init(); NarrationService.init(); HistoryService.init();
  const safe = (name, fn) => { try { fn(); } catch (e) { console.error("Lỗi khởi tạo " + name, e); } };
  safe("Navigation", () => NavigationService.init());
  safe("Nav", () => Nav.init()); safe("MapUI", () => MapUI.init()); safe("PoiUI", () => PoiUI.init()); safe("PlayerUI", () => PlayerUI.init());
  safe("SearchUI", () => SearchUI.init()); safe("DestUI", () => DestUI.init()); safe("NavUI", () => NavUI.init());
  safe("AuthUI", () => AuthUI.init()); safe("Settings", bindSettings); safe("Featured", renderFeatured);
  safe("Hero", () => Hero.init()); safe("Gallery", renderGallery); safe("Credits", renderCredits);
  safe("Facts", renderFacts); safe("Overview", () => OverviewUI.init());

  $("#featured").addEventListener("click", e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const p = POIService.get(b.dataset.id);
    if (b.dataset.act === "listen") NarrationService.play(p, false); else Bus.emit("poi:open", p.id);
  });
  $("#gallery").addEventListener("click", e => { const b = e.target.closest("[data-ex]"); if (b) openExhibit(Number(b.dataset.ex)); });
  document.addEventListener("click", e => { const b = e.target.closest("[data-scroll]"); if (b) { e.preventDefault(); const t = document.getElementById(b.dataset.scroll); if (t) t.scrollIntoView({ behavior: "smooth" }); } });
  Bus.on("audio:state", markPlayingStop);

  /* thông báo cho người dùng khi service ra quyết định */
  Bus.on("narration:play", ({ poi, auto }) => { if (auto) toast({ title: t("ts.enter"), message: poi.name[Settings.get().lang], type: "success" }); });
  Bus.on("narration:skip", ({ poi, reason }) => toast({ title: poi.name[Settings.get().lang], type: "warning",
    message: reason === "cool" ? t("ts.cool") : t("ts.busy") }));
  Bus.on("narration:queued", ({ poi }) => toast({ title: t("ts.queuedT"), message: t("ts.queuedM", { name: poi.name[Settings.get().lang] }), type: "info", duration: 3500 }));
  Bus.on("audio:unsupported", () => toast({ title: t("ts.noVoiceT"), message: t("ts.noVoiceM"), type: "error" }));
  Bus.on("walk:done", () => toast({ title: t("ts.walkT"), message: t("ts.walkM"), type: "info" }));
  Bus.on("lang:change", () => { renderFeatured(); renderGallery(); renderFacts(); renderCredits(); Hero.relabel(); bindSettings.upd && bindSettings.upd(); if (AudioService.state === "playing") AudioService.replay(); });
  /* thao tác đầu tiên của người dùng mở khoá âm thanh trên trình duyệt */
  document.addEventListener("pointerdown", () => AudioService.unlock(), { once: true });

  safe("LocationService", () => LocationService.init());
  safe("DeviceService", () => DeviceService.init());
  /* thông báo thời gian thực + nội dung mới do quản trị viên xuất bản (T11) */
  safe("RemoteContent", () => RemoteContentService.init());
  safe("Notification", () => NotificationService.start());
  Bus.on("content:update", ({ poiId, quiet }) => {
    renderFeatured(); try { PoiUI.render(); if (PoiUI.openId === poiId) PoiUI.openDetail(poiId); } catch (e) {}
    const p = POIService.get(poiId);
    if (!quiet && p) toast({ title: t("ts.updT"), message: t("ts.updM", { name: p.name[Settings.get().lang] }), type: "success", duration: 4000 });
  });
  /* thống kê thiết bị (ẩn danh, không cần tài khoản) */

  /* mã QR riêng của một POI: index.html?poi=<id>&src=qr -> mở thẳng điểm đó; bấm "Nghe thuyết minh" để phát
     (iPhone không cho tự phát âm thanh khi người dùng chưa chạm vào trang) */
  safe("QR", () => {
    const id = DeviceService.entry().poiId, p = id && POIService.get(id);
    if (!p) return;
    Nav.go("places");
    setTimeout(() => Bus.emit("poi:open", p.id), 300);
  });
});
