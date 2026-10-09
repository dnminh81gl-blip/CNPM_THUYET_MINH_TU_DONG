/* Header: chuyển tab (có thanh gạch chân trượt), menu mobile, chọn ngôn ngữ thuyết minh */
const Nav = {
  current: "home",
  init() {
    $$(".js-TabHeader").forEach(t => t.addEventListener("click", () => this.go(t.dataset.tab)));
    document.addEventListener("click", e => {
      const el = e.target.closest("[data-go]");
      if (el) { e.preventDefault(); this.go(el.dataset.go); }
    });
    /* menu mobile */
    const header = $(".js-OpenHeaderForMobile");
    $(".js-mobile-bars").addEventListener("click", () => header.classList.toggle("open"));
    $$(".js-TabHeader, .header-account").forEach(i => i.addEventListener("click", () => header.classList.remove("open")));
    /* ngôn ngữ */
    const sel = $("#langSelect");
    sel.value = Settings.get().lang;
    sel.addEventListener("change", () => { Settings.set({ lang: sel.value }); Bus.emit("lang:change", sel.value); });
    Bus.on("settings:change", s => { sel.value = s.lang; });
    window.addEventListener("resize", () => this.moveLine());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.moveLine());
    this.moveLine();
  },
  go(name) {
    this.current = name;
    $$(".js-TabHeader").forEach(t => t.classList.toggle("headerActive", t.dataset.tab === name));
    $$(".js-Container").forEach(c => c.classList.toggle("headerActive", c.dataset.pane === name));
    this.moveLine();
    window.scrollTo({ top: 0 });
    Bus.emit("nav:change", name);
  },
  moveLine() {
    const tab = $(".js-TabHeader.headerActive"), line = $(".header-navbar--list .line");
    if (!tab || !line) return;
    line.style.width = tab.offsetWidth + "px";
    line.style.left = tab.offsetLeft + "px";
  }
};
