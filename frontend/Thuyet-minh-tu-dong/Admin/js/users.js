/* Quản lý người dùng: tìm kiếm, phân trang, khoá / mở khoá, xoá */
const UsersPage = {
  page: 1, q: "", st: "",
  init() {
    if (!A.init("users")) return;
    $("#app").innerHTML = `
      <div class="adm-title"><h1><i class="fas fa-users"></i> Quản lý người dùng</h1></div>
      <div class="adm-note"><i class="fas fa-info-circle"></i> Tài khoản hiện lưu trong trình duyệt (bản demo). Phân quyền tourist / owner / admin và đặt lại mật khẩu sẽ do Auth Service ở backend đảm nhiệm.</div>
      <div class="adm-card"><div class="toolbar"><input class="input-field" id="q" placeholder="Tìm theo tên hoặc email..." />
        <select class="input-field" id="st"><option value="">Mọi trạng thái</option><option value="ok">Đang hoạt động</option><option value="locked">Đã khoá</option></select><span class="sp"></span><span class="hint" id="cnt" style="margin:0"></span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Ngôn ngữ</th><th>Lượt nghe</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody id="rows"></tbody></table></div><div class="pager" id="pager"></div></div>`;
    $("#q").oninput = e => { this.q = e.target.value; this.page = 1; this.render(); };
    $("#st").onchange = e => { this.st = e.target.value; this.page = 1; this.render(); };
    $("#rows").onclick = e => {
      const b = e.target.closest("[data-a]"); if (!b) return; const users = AuthService.users(), u = users.find(x => x.id === b.dataset.id);
      if (u.role === "admin") { toast({ title: "Không thể thao tác", message: "Không khoá hoặc xoá tài khoản admin.", type: "warning" }); return; }
      if (b.dataset.a === "lock") { u.locked = !u.locked; Store.set("users", users); const s = AuthService.current(); if (u.locked && s && s.id === u.id) AuthService.logout(); toast({ title: u.locked ? "Đã khoá tài khoản" : "Đã mở khoá", message: u.email, type: "success" }); }
      else if (confirm(`Xoá tài khoản ${u.email}? Lịch sử nghe của tài khoản này cũng bị xoá.`)) { Store.set("users", users.filter(x => x.id !== u.id)); Store.del("history:" + u.id); toast({ title: "Đã xoá", message: u.email, type: "success" }); }
      this.render();
    };
    this.render();
  },
  render() {
    const q = this.q.trim().toLowerCase(), hist = HistoryService.all();
    const list = AuthService.users().filter(u => (!q || u.name.toLowerCase().includes(q) || u.email.includes(q)) && (!this.st || (this.st === "locked") === !!u.locked));
    $("#cnt").textContent = `${list.length} / ${AuthService.users().length} tài khoản`;
    const r = A.paginate(list, this.page, 10); this.page = r.page;
    $("#rows").innerHTML = r.rows.length ? r.rows.map(u => `<tr><td><b>${Helper.esc(u.name)}</b></td><td>${Helper.esc(u.email)}</td><td><span class="badge ${u.role === "admin" ? "warn" : ""}">${u.role === "admin" ? "Admin" : "Người dùng"}</span></td><td>${(LANGS[u.lang || "vi"] || LANGS.vi).f}</td><td>${hist.filter(h => h.uid === u.id).length}</td>
      <td><span class="badge ${u.locked ? "bad" : "ok"}">${u.locked ? "Đã khoá" : "Hoạt động"}</span></td>
      <td><div class="acts"><button class="ibtn" data-a="lock" data-id="${u.id}" title="${u.locked ? "Mở khoá" : "Khoá"}"><i class="fas fa-${u.locked ? "unlock" : "lock"}"></i></button><button class="ibtn del" data-a="del" data-id="${u.id}" title="Xoá"><i class="fas fa-trash"></i></button></div></td></tr>`).join("")
      : `<tr><td colspan="7" class="empty">Chưa có tài khoản nào. Người dùng đăng ký ở trang web sẽ hiện tại đây.</td></tr>`;
    A.pager($("#pager"), r.page, r.pages, n => { this.page = n; this.render(); });
  }
};
document.addEventListener("DOMContentLoaded", () => UsersPage.init());
