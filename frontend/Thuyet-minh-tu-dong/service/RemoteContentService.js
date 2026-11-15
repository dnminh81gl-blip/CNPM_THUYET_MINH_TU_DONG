/* RemoteContentService (T11): web du khách dùng NỘI DUNG MỚI do quản trị viên xuất bản.
   - Khi quản trị viên xuất bản một POI, backend tự soạn bài, dịch sang en/zh và gửi thông báo translation.completed
     (kèm scripts {vi, en, zh}). Trang đang mở nhận qua NotificationService và cập nhật ngay, không cần tải lại.
   - Người mở trang SAU khi xuất bản: lúc mở trang hỏi backend 1 lần (GET /api/pois); POI nào có phiên bản mới hơn
     bản đang có (version > 1 là đã được quản trị viên sửa) thì lấy bản dịch (GET /api/translations?poiId=&version=).
   - Bản mới được lưu trong trình duyệt (Store "remoteContent") và được POIService áp lên nội dung mẫu. */
const RemoteContentService = {
  KEY: "remoteContent",
  HEAD: { "ngrok-skip-browser-warning": "1" },
  get() { return Store.get(this.KEY, {}); },
  /* scripts: {vi, en, zh}; chỉ nhận bản có version mới hơn hoặc bằng bản đang có */
  apply(poiId, version, scripts, quiet) {
    if (!poiId || !scripts) return false;
    const all = this.get(), cur = all[poiId];
    if (cur && cur.version > version) return false;
    const text = {}; Object.keys(scripts).forEach(l => { if (scripts[l]) text[l] = String(scripts[l]); });
    if (!Object.keys(text).length) return false;
    all[poiId] = { version, text, at: new Date().toISOString() };
    Store.set(this.KEY, all);
    POIService.invalidate();
    Bus.emit("content:update", { poiId: Number(poiId), version, quiet: !!quiet });
    return true;
  },
  init() {
    Bus.on("notify:message", m => {
      const d = m.data || {};
      if (m.type === "translation.completed" && d.scripts) this.apply(d.poiId, d.version, d.scripts, false);
      /* admin vừa xuất bản (có thể là điểm mới): tải lại danh sách POI */
      if (m.type === "translation.completed") { clearTimeout(this._t); this._t = setTimeout(() => this.sync(), 1000); }
    });
    this.sync();
  },
  /* lưu danh sách POI của backend; có thay đổi (thêm / sửa / xoá) thì báo trang vẽ lại bản đồ và danh sách */
  savePois(pois) {
    if (!Array.isArray(pois)) return;
    const slim = pois.map(p => ({ id: p.id, name: p.name, category: p.category, address: p.address, lat: p.lat, lng: p.lng,
      radius: p.radius, text: p.text, status: p.status, version: p.version }));
    if (JSON.stringify(slim) === JSON.stringify(Store.get("remotePois", null))) return;
    Store.set("remotePois", slim);
    POIService.invalidate();
    Bus.emit("pois:change");
  },
  async sync() {
    const base = DeviceService.apiBase(); if (!base) return;
    const get = async p => { const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
      try { const r = await fetch(base + p, { headers: this.HEAD, signal: ctl.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); } finally { clearTimeout(t); } };
    try {
      const pois = await get("/api/pois"), have = this.get();
      this.savePois(pois);
      for (const p of pois) {
        /* điểm mẫu ở version 1 đã có sẵn bản dịch; điểm đã sửa hoặc điểm admin thêm mới thì lấy bản dịch từ backend */
        const isSeed = POIService._seed.some(s => s.id === p.id);
        if (p.status !== "PUBLISHED" || (isSeed && p.version <= 1)) continue;
        if (have[p.id] && have[p.id].version >= p.version) continue;
        const items = await get(`/api/translations?poiId=${p.id}&version=${p.version}`);
        const scripts = {}; (items || []).forEach(it => { if (it.lang && it.translatedText) scripts[it.lang] = it.translatedText; });
        this.apply(p.id, p.version, scripts, true);
      }
    } catch (e) { /* chưa bật backend / ngrok: dùng nội dung có sẵn */ }
  }
};
