/* Quản lý tour gợi ý: người dùng thấy các tour này ở tab Tour và có thể nạp vào tour của mình */
const ToursPage = {
  editing: null, sel: [],
  init() {
    if (!A.init("tours")) return;
    $("#app").innerHTML = `
      <div class="adm-title"><h1><i class="fas fa-route"></i> Quản lý tour</h1><button class="btn btn--primary" id="add"><i class="fas fa-plus"></i> Tạo tour</button></div>
      <div class="adm-card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tên tour</th><th>Số điểm</th><th>Thời lượng nghe</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody id="rows"></tbody></table></div></div>`;
    document.body.insertAdjacentHTML("beforeend", `<div class="modal-wrap" id="tModal"><div class="modal-main adm-modal"><button class="modal-close" data-close><i class="fas fa-times"></i></button>
      <h2 id="mt"></h2><form id="tForm" autocomplete="off">
        <label>Tên tour *</label><input class="input-field" id="tn" required maxlength="80" />
        <label>Mô tả ngắn</label><input class="input-field" id="td" maxlength="120" />
        <label>Trạng thái</label><select class="input-field" id="ts"><option value="published">Đã xuất bản</option><option value="draft">Nháp</option></select>
        <label>Chọn các điểm dừng</label><div class="sel-list" id="tpick"></div>
        <label>Thứ tự đi (lên / xuống để sắp xếp)</label><div id="tord"></div>
        <div class="mfoot"><button type="button" class="btn btn--ghost" data-close>Huỷ</button><button class="btn btn--primary" type="submit"><i class="fas fa-save"></i> Lưu</button></div></form></div></div>`);
    $("#add").onclick = () => this.open(null);
    $("#rows").onclick = e => { const b = e.target.closest("[data-a]"); if (!b) return; const id = Number(b.dataset.id); b.dataset.a === "edit" ? this.open(id) : this.del(id); };
    $("#tpick").onchange = e => { const id = Number(e.target.value); this.sel = e.target.checked ? [...this.sel, id] : this.sel.filter(x => x !== id); this.ord(); };
    $("#tord").onclick = e => { const b = e.target.closest("[data-m]"); if (!b) return; const i = this.sel.indexOf(Number(b.dataset.id)), j = i + Number(b.dataset.m); if (j < 0 || j >= this.sel.length) return; [this.sel[i], this.sel[j]] = [this.sel[j], this.sel[i]]; this.ord(); };
    $("#tForm").onsubmit = e => { e.preventDefault(); this.save(); };
    this.render();
  },
  render() {
    const l = A.tours(), pois = A.pois(), rate = Settings.get().rate;
    $("#rows").innerHTML = l.length ? l.map(t => {
      const ps = t.poiIds.map(id => pois.find(p => p.id === id)).filter(Boolean), sec = ps.reduce((s, p) => s + A.dur(p.text.vi, "vi", rate), 0);
      return `<tr><td><b>${Helper.esc(t.name)}</b><br><small style="color:#888">${Helper.esc(t.desc || "")}</small></td><td>${ps.length}</td><td>${Helper.mmss(sec)}</td>
        <td><span class="badge ${t.status === "draft" ? "warn" : "ok"}">${t.status === "draft" ? "Nháp" : "Đã xuất bản"}</span></td>
        <td><div class="acts"><button class="ibtn" data-a="edit" data-id="${t.id}"><i class="fas fa-pen"></i></button><button class="ibtn del" data-a="del" data-id="${t.id}"><i class="fas fa-trash"></i></button></div></td></tr>`; }).join("")
      : `<tr><td colspan="5" class="empty">Chưa có tour nào. Bấm "Tạo tour" để bắt đầu.</td></tr>`;
  },
  open(id) {
    this.editing = id; const t = id ? A.tours().find(x => x.id === id) : { name: "", desc: "", status: "published", poiIds: [] };
    this.sel = t.poiIds.filter(i => A.pois().some(p => p.id === i));
    $("#mt").textContent = id ? "Sửa tour" : "Tạo tour"; $("#tn").value = t.name; $("#td").value = t.desc || ""; $("#ts").value = t.status || "published";
    $("#tpick").innerHTML = A.pois().map(p => `<label><input type="checkbox" value="${p.id}" ${this.sel.includes(p.id) ? "checked" : ""}/> ${Helper.esc(p.name.vi)} <small style="color:#888">(${Helper.esc(p.cat)})</small></label>`).join("");
    this.ord(); Modal.open("tModal");
  },
  ord() {
    const pois = A.pois();
    $("#tord").innerHTML = this.sel.length ? this.sel.map((id, i) => { const p = pois.find(x => x.id === id);
      return `<div class="ord"><span class="n">${i + 1}</span><b>${Helper.esc(p.name.vi)}</b><button type="button" class="ibtn" data-m="-1" data-id="${id}"><i class="fas fa-arrow-up"></i></button><button type="button" class="ibtn" data-m="1" data-id="${id}"><i class="fas fa-arrow-down"></i></button></div>`; }).join("")
      : `<div class="hint">Chưa chọn điểm nào.</div>`;
  },
  save() {
    const name = $("#tn").value.trim(); if (!name) return;
    if (!this.sel.length) { toast({ title: "Chưa chọn điểm", message: "Tour cần ít nhất một điểm dừng.", type: "warning" }); return; }
    const l = A.tours(), g = { name, desc: $("#td").value.trim(), status: $("#ts").value, poiIds: this.sel.slice() };
    if (this.editing) Object.assign(l.find(x => x.id === this.editing), g); else l.push(Object.assign({ id: Date.now() }, g));
    A.saveTours(l); Modal.close("tModal"); toast({ title: "Đã lưu tour", message: name, type: "success" }); this.render();
  },
  del(id) { const t = A.tours().find(x => x.id === id); if (confirm(`Xoá tour "${t.name}"?`)) { A.saveTours(A.tours().filter(x => x.id !== id)); toast({ title: "Đã xoá", message: t.name, type: "success" }); this.render(); } }
};
document.addEventListener("DOMContentLoaded", () => ToursPage.init());
