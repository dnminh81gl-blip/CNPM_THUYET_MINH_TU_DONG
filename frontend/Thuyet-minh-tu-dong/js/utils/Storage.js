/* Lưu trữ cục bộ (localStorage) - bọc try/catch để không lỗi khi bị chặn */
const Store = {
  get(k, def) { try { const v = localStorage.getItem("ttd:" + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem("ttd:" + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem("ttd:" + k); } catch (e) {} }
};

/* Cài đặt thuyết minh */
const Settings = {
  defaults: { auto: true, cool: 30, rate: 1, lang: "vi" },
  get() { return Object.assign({}, this.defaults, Store.get("settings", {})); },
  set(patch) { const s = Object.assign(this.get(), patch); Store.set("settings", s); Bus.emit("settings:change", s); return s; }
};
