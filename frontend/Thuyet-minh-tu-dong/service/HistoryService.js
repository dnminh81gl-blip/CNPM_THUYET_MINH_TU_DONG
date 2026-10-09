/* HistoryService: lịch sử nghe, lưu theo tài khoản (hoặc "guest").
   Sau này: POST /history và GET /history/me. */
const HistoryService = {
  _key() { const u = AuthService.current(); return "history:" + (u ? u.id : "guest"); },
  init() { Bus.on("audio:start", ({ poi, lang }) => this.add(poi.id, lang)); },
  add(poiId, lang) {
    const list = Store.get(this._key(), []);
    list.unshift({ poiId, lang, at: Date.now() });
    Store.set(this._key(), list.slice(0, 50));
    Bus.emit("history:change");
  },
  list() { return Store.get(this._key(), []); },
  /* Admin: gom lịch sử của mọi người dùng (và khách) trong trình duyệt này */
  all() {
    const out = [], users = Store.get("users", []);
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k.startsWith("ttd:history:")) continue;
        const uid = k.slice("ttd:history:".length), u = users.find(x => x.id === uid);
        (JSON.parse(localStorage.getItem(k)) || []).forEach(h => out.push(Object.assign({ uid, user: u ? u.name : "Khách" }, h)));
      }
    } catch (e) {}
    return out.sort((a, b) => b.at - a.at);
  },
  clear() { Store.del(this._key()); Bus.emit("history:change"); }
};
