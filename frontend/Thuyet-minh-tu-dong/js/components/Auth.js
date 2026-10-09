/* Auth: khu vực tài khoản trên header, popup đăng nhập/đăng ký, popup hồ sơ + lịch sử nghe */
const AuthUI = {
  init() {
    $("#accountArea").addEventListener("click", e => {
      if (e.target.closest(".js-HandlerLR")) { this.showLR("login"); Modal.open("lrModal"); }
      else if (e.target.closest(".header-navbar-profile")) { this.fillProfile(); Modal.open("profileModal"); }
      else if (e.target.closest(".header-navbar-logout")) { AuthService.logout(); toast({ title: "Đã đăng xuất", message: "Hẹn gặp lại bạn!", type: "info" }); }
    });
    $$("[data-lr]").forEach(t => t.onclick = () => this.showLR(t.dataset.lr));
    $("#loginForm").addEventListener("submit", e => this.submit(e, "login"));
    $("#registerForm").addEventListener("submit", e => this.submit(e, "register"));
    $$("[data-pf]").forEach(t => t.onclick = () => this.showPf(t.dataset.pf));
    $("#pwForm").addEventListener("submit", async e => {
      e.preventDefault(); const f = new FormData(e.target), err = $("#pwErr"); err.textContent = "";
      try { await AuthService.changePassword(f.get("old"), f.get("new1"), f.get("new2")); e.target.reset(); toast({ title: "Đã đổi mật khẩu", message: "Lần đăng nhập sau hãy dùng mật khẩu mới.", type: "success" }); }
      catch (ex) { err.textContent = ex.message; }
    });
    if (new URLSearchParams(location.search).get("admin") && !AuthService.isAdmin()) { this.showLR("login"); Modal.open("lrModal"); toast({ title: "Cần đăng nhập quản trị", message: "Hãy đăng nhập bằng tài khoản admin để vào trang Admin.", type: "warning", duration: 4000 }); }
    $("#pfForm").addEventListener("submit", e => {
      e.preventDefault(); const f = new FormData(e.target);
      AuthService.update({ name: f.get("name").trim(), phone: f.get("phone").trim(), city: f.get("city").trim(), lang: f.get("lang") });
      Settings.set({ lang: f.get("lang") }); Bus.emit("lang:change", f.get("lang"));
      toast({ title: "Đã lưu", message: "Thông tin tài khoản đã được cập nhật.", type: "success" }); this.fillProfile();
    });
    Bus.on("auth:change", () => { this.renderAccount(); this.fillProfile(); });
    Bus.on("history:change", () => this.renderHistory());
    Bus.on("lang:change", () => this.renderHistory());
    this.eyes();
    this.renderAccount();
  },
  /* nút con mắt: xem / ẩn mật khẩu đang nhập ở mọi ô mật khẩu */
  eyes() {
    $$('input[type="password"]').forEach(inp => {
      const w = document.createElement("div"); w.className = "pw-wrap";
      inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
      const b = document.createElement("button"); b.type = "button"; b.className = "pw-eye"; w.appendChild(b);
      const set = show => { inp.type = show ? "text" : "password"; b.innerHTML = `<i class="far fa-eye${show ? "-slash" : ""}"></i>`; b.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu"); b.title = show ? "Ẩn mật khẩu" : "Hiện mật khẩu"; };
      set(false);
      b.onclick = () => set(inp.type === "password");
      if (inp.form) inp.form.addEventListener("reset", () => setTimeout(() => set(false)));
    });
  },
  renderAccount() {
    const u = AuthService.current();
    $("#accountArea").innerHTML = u
      ? `<span class="header-username">Xin chào, ${Helper.esc(u.name)}</span>${u.role === "admin" ? '<a class="header-navbar-profile header-admin-link" href="./Admin/dashboard.html"><i class="fas fa-cogs"></i> Quản trị</a>' : ""}<span class="header-navbar-profile"><i class="fas fa-id-card"></i> Hồ sơ</span><span class="header-navbar-logout"><i class="fas fa-sign-out-alt"></i> Đăng xuất</span>`
      : `<div class="header-navbar--item js-HandlerLR"><i class="header-user--icon far fa-user"></i> Tài khoản</div>`;
    Nav.moveLine();
  },
  showLR(which) {
    $$("[data-lr]").forEach(t => t.classList.toggle("isActive", t.dataset.lr === which));
    $$(".LR-form").forEach(f => f.classList.toggle("isActive", f.dataset.form === which));
    $("#loginErr").textContent = ""; $("#registerErr").textContent = "";
    /* điền sẵn email đã ghi nhớ (KHÔNG lưu mật khẩu; mật khẩu do trình duyệt tự điền nếu bạn đã lưu) */
    const em = $("#loginForm [name=email]"); if (which === "login" && !em.value) em.value = Store.get("rememberEmail", "");
  },
  async submit(e, kind) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target)), err = $(kind === "login" ? "#loginErr" : "#registerErr");
    if (kind === "login") data.remember = !!data.remember;
    err.textContent = "";
    try {
      const u = kind === "login" ? await AuthService.login(data) : await AuthService.register(data);
      /* ghi nhớ email; mật khẩu giao cho trình duyệt cất giữ an toàn (Credential Management API) */
      if (kind === "login") { data.remember ? Store.set("rememberEmail", data.email.trim().toLowerCase()) : Store.del("rememberEmail"); }
      if ((kind === "register" || data.remember) && window.PasswordCredential && navigator.credentials) {
        try { Promise.resolve(navigator.credentials.store(new PasswordCredential({ id: data.email.trim().toLowerCase(), password: data.pass, name: u.name }))).catch(() => {}); } catch (ex) {}
      }
      Modal.close("lrModal"); e.target.reset();
      if (u.lang && u.lang !== Settings.get().lang) { Settings.set({ lang: u.lang }); Bus.emit("lang:change", u.lang); }
      toast({ title: kind === "login" ? "Đăng nhập thành công" : "Tạo tài khoản thành công", message: "Xin chào " + u.name, type: "success" });
      if (kind === "login" && u.role === "admin") { toast({ title: "Tài khoản quản trị", message: "Đang chuyển tới trang Admin...", type: "info" }); setTimeout(() => { location.href = "./Admin/dashboard.html"; }, 700); }
    } catch (ex) { err.textContent = ex.message; }
  },
  showPf(which) {
    $$("[data-pf]").forEach(t => t.classList.toggle("isActive", t.dataset.pf === which));
    $$("[data-pfpane]").forEach(p => p.classList.toggle("isActive", p.dataset.pfpane === which));
    if (which === "history") this.renderHistory();
  },
  fillProfile() {
    const u = AuthService.current(); if (!u) { Modal.close("profileModal"); return; }
    $("#pfAvatar").textContent = (u.name[0] || "?").toUpperCase(); $("#pfName").textContent = u.name; $("#pfMail").textContent = u.email;
    $("#pfInfo").innerHTML = [["Họ và tên", u.name], ["Email", u.email], ["Số điện thoại", u.phone || "—"], ["Thành phố", u.city || "—"], ["Ngôn ngữ ưa thích", LANGS[u.lang || "vi"].f]]
      .map(([k, v]) => `<div class="pf-card"><span>${k}</span><b>${Helper.esc(v)}</b></div>`).join("");
    const f = $("#pfForm"); f.name.value = u.name; f.phone.value = u.phone || ""; f.city.value = u.city || ""; f.lang.value = u.lang || "vi";
    this.renderHistory();
  },
  renderHistory() {
    const box = $("#pfHistory"), list = HistoryService.list(), lang = Settings.get().lang;
    box.innerHTML = list.length ? list.map(h => { const p = POIService.get(h.poiId); return p
      ? `<div class="hist-item"><i class="fas ${p.icon}" style="background:${POIService.grad(p)}"></i><div><b>${Helper.esc(p.name[lang])}</b><small>${Helper.time(h.at)} · ${LANGS[h.lang].f}</small></div></div>` : ""; }).join("")
      + `<button class="btn btn--ghost btn--block" id="histClear"><i class="fas fa-trash"></i> Xoá lịch sử</button>`
      : `<div class="empty-box"><i class="fas fa-headphones"></i>Chưa có lượt nghe nào.</div>`;
    const c = $("#histClear"); if (c) c.onclick = () => HistoryService.clear();
  }
};
