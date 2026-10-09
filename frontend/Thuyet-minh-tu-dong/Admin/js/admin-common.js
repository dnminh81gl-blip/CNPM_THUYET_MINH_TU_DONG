/* Admin chung: header điều hướng, phân trang, nghe thử, tiện ích.
   Dùng chung localStorage với trang người dùng (khoá "ttd:...") nên Admin sửa thì trang người dùng thấy sau khi tải lại. */
const ADMIN_PAGES = [
  ["dashboard", "Tổng quan", "fa-chart-pie"], ["places", "Địa điểm", "fa-map-marker-alt"], ["content", "Nội dung", "fa-language"],
  ["audio", "Audio", "fa-volume-up"], ["tours", "Tour", "fa-route"], ["history", "Thống kê", "fa-chart-line"], ["users", "Người dùng", "fa-users"]
];
const ICONS = [["fa-landmark", "\uf66f", "Di tích"], ["fa-church", "\uf51d", "Nhà thờ"], ["fa-envelope", "\uf0e0", "Bưu điện"], ["fa-theater-masks", "\uf630", "Nhà hát"],
  ["fa-university", "\uf19c", "Bảo tàng"], ["fa-monument", "\uf5a6", "Tượng đài"], ["fa-utensils", "\uf2e7", "Ẩm thực"], ["fa-coffee", "\uf0f4", "Quán cà phê"],
  ["fa-shopping-bag", "\uf290", "Mua sắm"], ["fa-tree", "\uf1bb", "Công viên"], ["fa-umbrella-beach", "\uf5ca", "Bãi biển"], ["fa-map-marker-alt", "\uf3c5", "Địa điểm khác"]];
const GRADS = [["#2563eb", "#7c3aed"], ["#0ea5e9", "#2563eb"], ["#f59e0b", "#ef4444"], ["#ec4899", "#8b5cf6"], ["#10b981", "#0ea5e9"], ["#14b8a6", "#22c55e"], ["#64748b", "#334155"]];
const A = {
  page: "",
  init(page) {
    this.page = page;
    /* chỉ tài khoản admin mới được vào; người khác bị chuyển về trang đăng nhập */
    if (!AuthService.isAdmin()) { document.body.style.visibility = "hidden"; location.replace("../index.html?admin=1"); return false; }
    const me = AuthService.current();
    const nav = ADMIN_PAGES.map(([k, t, i]) => `<div class="header-navbar--item ${k === page ? "headerActive" : ""}"><a href="${k}.html"><i class="fas ${i}"></i>${t}</a></div>`).join("");
    $("#adminHeader").innerHTML = `<div class="grid wide"><div class="header-content">
      <div class="header-logo"><a href="dashboard.html" class="header-logo--link"><i class="fas fa-cogs"></i> TMTĐ Admin</a></div>
      <div class="header-navbar--list">${nav}<div class="header-navbar--item"><a href="../index.html"><i class="fas fa-external-link-alt"></i>Xem web</a></div><div class="header-navbar--item" id="admOut" title="${Helper.esc(me.email)}"><i class="fas fa-sign-out-alt"></i> Đăng xuất</div></div>
      <div class="header-mobile--btn js-mobile-bars"><i class="fas fa-bars"></i></div></div></div>`;
    $(".js-mobile-bars").onclick = () => $("#adminHeader").classList.toggle("open");
    $("#admOut").onclick = () => { AuthService.logout(); location.href = "../index.html"; };
    Modal.init();
    return true;
  },
  paginate(items, page, per = 8) {
    const pages = Math.max(1, Math.ceil(items.length / per)); page = Math.min(Math.max(1, page), pages);
    return { rows: items.slice((page - 1) * per, page * per), page, pages };
  },
  pager(el, page, pages, cb) {
    el.innerHTML = pages <= 1 ? "" : Array.from({ length: pages }, (_, i) => `<button class="${i + 1 === page ? "on" : ""}" data-p="${i + 1}">${i + 1}</button>`).join("");
    el.onclick = e => { const b = e.target.closest("[data-p]"); if (b) cb(Number(b.dataset.p)); };
  },
  /* dữ liệu */
  pois() { return POIService.raw(); },
  savePois(l) { POIService.save(l); },
  tours() { return Store.get("tours", []); },
  saveTours(l) { Store.set("tours", l); },
  has(p, l) { return !!(p.text[l] && p.text[l].trim() && p.name[l] && p.name[l].trim()); },
  gradOf(p) { return `linear-gradient(135deg, ${p.grad[0]}, ${p.grad[1]})`; },
  dur(text, lang, rate = 1) { return text.length / LANGS[lang].cps / rate; },
  /* nghe thử bằng giọng đã chọn */
  speak(text, lang) {
    if (!("speechSynthesis" in window)) { toast({ title: "Không hỗ trợ", message: "Trình duyệt không có giọng đọc.", type: "error" }); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = LANGS[lang].tts; u.rate = Settings.get().rate;
    const vn = Store.get("voices", {})[lang]; if (vn) { const v = speechSynthesis.getVoices().find(x => x.name === vn); if (v) u.voice = v; }
    speechSynthesis.speak(u);
  },
  stopSpeak() { if ("speechSynthesis" in window) speechSynthesis.cancel(); },
  dayKey(ts) { const d = new Date(ts); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); },
  lastDays(n) { return Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return { key: this.dayKey(d), label: String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") }; }); }
};
