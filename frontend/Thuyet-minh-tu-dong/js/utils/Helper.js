/* Tiện ích dùng chung: chọn phần tử, bus sự kiện, định dạng, toast */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Bus sự kiện: các service phát sự kiện, component lắng nghe -> service không đụng vào giao diện */
const Bus = {
  h: {},
  on(e, f) { (this.h[e] || (this.h[e] = [])).push(f); },
  emit(e, d) { (this.h[e] || []).forEach(f => { try { f(d); } catch (err) { console.error(e, err); } }); }
};

const Helper = {
  esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },
  mmss(s) { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); },
  time(ts) { return new Date(ts).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }); }
};

/* Toast: dùng đúng class của Toast.css (toast_success / toast_warning / toast_error) */
function toast({ title = "", message = "", type = "info", duration = 2500 }) {
  const main = document.getElementById("toast");
  if (!main) return;
  const el = document.createElement("div");
  const icons = { success: "fas fa-check-circle", warning: "fas fa-exclamation-circle", error: "fas fa-exclamation-triangle", info: "fas fa-info-circle" };
  const delay = (duration / 1000).toFixed(2);
  el.classList.add("toast", "toast_" + type);
  el.style.animation = `slideInleft ease .3s, fadeOut linear 1s ${delay}s forwards`;
  el.innerHTML = `<div class="toast_icon"><i class="${icons[type] || icons.info}"></i></div>
    <div class="toast_body"><h3 class="toast_title">${Helper.esc(title)}</h3><p class="toast_msg">${Helper.esc(message)}</p></div>
    <div class="toast_close"><i class="fas fa-times"></i></div>`;
  main.appendChild(el);
  const t = setTimeout(() => el.remove(), duration + 1000);
  el.querySelector(".toast_close").onclick = () => { el.remove(); clearTimeout(t); };
}

/* Popup (modal) dùng chung */
const Modal = {
  open(id) { $("#" + id).classList.add("isOpen"); },
  close(id) { $("#" + id).classList.remove("isOpen"); },
  closeAll() { $$(".modal-wrap.isOpen").forEach(m => m.classList.remove("isOpen")); },
  init() {
    $$(".modal-wrap").forEach(m => m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-close]")) m.classList.remove("isOpen"); }));
    document.addEventListener("keydown", e => { if (e.key === "Escape") Modal.closeAll(); });
  }
};

/* Địa lý: khoảng cách giữa hai toạ độ (mét) theo công thức Haversine, và bước di chuyển cho chế độ giả lập */
const Geo = {
  R: 6371000,
  dist(a, b) {
    const t = Math.PI / 180, dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2;
    return 2 * this.R * Math.asin(Math.sqrt(s));
  },
  /* đi từ a về phía b một đoạn `step` mét (không vượt quá b) */
  move(a, b, step) {
    const d = this.dist(a, b);
    if (d <= step) return { lat: b.lat, lng: b.lng };
    const f = step / d;
    return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
  }
};

/* chuẩn hoá chuỗi để so sánh: bỏ dấu tiếng Việt, đ -> d, chữ thường */
Helper.norm = s => String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ").trim();
