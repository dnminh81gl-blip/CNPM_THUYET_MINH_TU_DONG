/* AuthService: đăng ký / đăng nhập.
   BẢN DEMO: tài khoản lưu trong localStorage của trình duyệt (mật khẩu được băm SHA-256, chưa có muối).
   Bản thật: gọi POST /auth/register, /auth/login ở Auth Service (JWT), không lưu mật khẩu ở client. */
/* TÀI KHOẢN ADMIN MẶC ĐỊNH (tự tạo ở lần mở trang đầu tiên).
   Đăng nhập xong sẽ được chuyển tới trang Admin. HÃY ĐỔI MẬT KHẨU ngay (Hồ sơ > Mật khẩu) vì mật khẩu mặc định nằm trong mã nguồn.
   LƯU Ý: đây là kiểm tra phía trình duyệt cho bản demo, KHÔNG phải bảo mật thật; bản thật phải xác thực và phân quyền ở backend. */
const DEFAULT_ADMIN = { name: "Quản trị viên", email: "admin@tmtd.vn", pass: "Admin@123" };

const AuthService = {
  users() { return Store.get("users", []); },
  /* Phiên đăng nhập: "ghi nhớ" -> localStorage (còn sau khi đóng trình duyệt); không ghi nhớ -> sessionStorage (mất khi đóng tab) */
  current() {
    try { const s = sessionStorage.getItem("ttd:session"); if (s) return JSON.parse(s); } catch (e) {}
    return Store.get("session", null);
  },
  _saveSession(pub, remember) {
    if (remember === undefined) { try { remember = !sessionStorage.getItem("ttd:session"); } catch (e) { remember = true; } }
    try {
      if (remember) { sessionStorage.removeItem("ttd:session"); Store.set("session", pub); }
      else { Store.del("session"); sessionStorage.setItem("ttd:session", JSON.stringify(pub)); }
    } catch (e) { Store.set("session", pub); }
  },
  async _hash(s) {
    try {
      const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
    } catch (e) { return btoa(unescape(encodeURIComponent(s))); }
  },
  _pub(u) { return { id: u.id, name: u.name, email: u.email, phone: u.phone || "", city: u.city || "", lang: u.lang || "vi", role: u.role || "user" }; },
  /* tạo admin mặc định nếu chưa có */
  async seed() {
    const users = this.users();
    if (users.some(u => u.role === "admin")) return;
    if (users.some(u => u.email === DEFAULT_ADMIN.email)) return;
    users.push({ id: "admin", name: DEFAULT_ADMIN.name, email: DEFAULT_ADMIN.email, hash: await this._hash(DEFAULT_ADMIN.pass), role: "admin", lang: "vi" });
    Store.set("users", users);
  },
  /* kiểm tra lại vai trò trong danh sách tài khoản (không tin riêng vào phiên đăng nhập) */
  isAdmin() {
    const s = this.current(); if (!s) return false;
    const u = this.users().find(x => x.id === s.id);
    return !!(u && u.role === "admin" && !u.locked);
  },
  async changePassword(oldPass, newPass, newPass2) {
    const cur = this.current(); if (!cur) throw new Error("Bạn chưa đăng nhập.");
    const users = this.users(), u = users.find(x => x.id === cur.id);
    if (!u || u.hash !== await this._hash(oldPass || "")) throw new Error("Mật khẩu hiện tại không đúng.");
    if ((newPass || "").length < 6) throw new Error("Mật khẩu mới tối thiểu 6 ký tự.");
    if (newPass !== newPass2) throw new Error("Hai mật khẩu mới không khớp.");
    if (newPass === oldPass) throw new Error("Mật khẩu mới phải khác mật khẩu cũ.");
    u.hash = await this._hash(newPass); Store.set("users", users);
  },
  async register({ name, email, pass, pass2 }) {
    name = (name || "").trim(); email = (email || "").trim().toLowerCase();
    if (name.length < 2) throw new Error("Vui lòng nhập họ tên.");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Email không hợp lệ.");
    if ((pass || "").length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự.");
    if (pass !== pass2) throw new Error("Hai mật khẩu không khớp.");
    const users = this.users();
    if (users.some(u => u.email === email)) throw new Error("Email này đã được đăng ký.");
    const u = { id: "u" + Date.now(), name, email, hash: await this._hash(pass), role: "user", lang: Settings.get().lang };
    Store.set("users", [...users, u]);
    this._saveSession(this._pub(u), true); Bus.emit("auth:change");
    return this._pub(u);
  },
  async login({ email, pass, remember }) {
    await this.ready;
    email = (email || "").trim().toLowerCase();
    const u = this.users().find(x => x.email === email);
    if (!u || u.hash !== await this._hash(pass || "")) throw new Error("Email hoặc mật khẩu không đúng.");
    if (u.locked) throw new Error("Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.");
    this._saveSession(this._pub(u), remember !== false); Bus.emit("auth:change");
    return this._pub(u);
  },
  logout() { Store.del("session"); try { sessionStorage.removeItem("ttd:session"); } catch (e) {} Bus.emit("auth:change"); },
  update(patch) {
    const cur = this.current(); if (!cur) return;
    const users = this.users().map(u => u.id === cur.id ? Object.assign(u, patch) : u);
    Store.set("users", users);
    this._saveSession(this._pub(users.find(u => u.id === cur.id))); Bus.emit("auth:change");
  }
};

/* chạy tạo admin mặc định; login() đợi xong bước này */
AuthService.ready = AuthService.seed();
