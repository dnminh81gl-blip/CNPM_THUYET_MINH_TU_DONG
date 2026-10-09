/* GeocodeService: đổi chữ địa chỉ -> toạ độ.
   - Có khoá OpenRouteService (js/config.js): dùng ORS geocoding (Pelias), giới hạn trong nước CONFIG.COUNTRY.
   - Chưa có khoá: dùng tạm OpenStreetMap Nominatim (miễn phí, KHÔNG gọi liên tục: chỉ khi người dùng nhấn Enter).
   Sau này nên chuyển về một service backend để giấu khoá và có cache chung. */
function apiError(code, msg) { const e = new Error(msg); e.code = code; return e; }

const GeocodeService = {
  _cache: {},
  hasKey() { return !!(CONFIG.ORS_API_KEY && CONFIG.ORS_API_KEY.trim()); },
  provider() { return this.hasKey() ? "ors" : "osm"; },
  async search(text) {
    const q = (text || "").trim();
    if (q.length < 2) return { results: [], provider: this.provider() };
    const key = this.provider() + "|" + Helper.norm(q);
    if (this._cache[key]) return this._cache[key];
    const results = this.hasKey() ? await this._ors(q) : await this._osm(q);
    return (this._cache[key] = { results, provider: this.provider() });
  },
  async _ors(q) {
    const k = encodeURIComponent(CONFIG.ORS_API_KEY.trim()), o = POIService.ORIGIN;
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${k}&text=${encodeURIComponent(q)}&boundary.country=${CONFIG.COUNTRY}&size=5&focus.point.lon=${o.lng}&focus.point.lat=${o.lat}`;
    const j = await (await this._fetch(url)).json();
    return (j.features || []).filter(f => f.geometry && f.geometry.coordinates).map(f => ({
      name: f.properties.name || f.properties.label, label: f.properties.label || f.properties.name,
      lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0]
    }));
  },
  async _osm(q) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=vi&countrycodes=${CONFIG.COUNTRY.toLowerCase()}&q=${encodeURIComponent(q)}`;
    const j = await (await this._fetch(url)).json();
    return (Array.isArray(j) ? j : []).map(r => ({ name: r.name || String(r.display_name).split(",")[0], label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }));
  },
  async _fetch(url, opt) {
    let r;
    try { r = await fetch(url, opt); } catch (e) { throw apiError("net", "Không kết nối được dịch vụ tìm kiếm (có thể mạng đang chặn)."); }
    if (!r.ok) throw this.httpError(r.status);
    return r;
  },
  httpError(status) {
    if (status === 401 || status === 403) return apiError("auth", "Khoá API không hợp lệ hoặc chưa được kích hoạt. Kiểm tra lại dòng ORS_API_KEY trong js/config.js.");
    if (status === 429) return apiError("quota", "Đã vượt giới hạn số lần gọi của dịch vụ. Hãy đợi một lúc rồi thử lại.");
    if (status >= 500) return apiError("server", "Dịch vụ bản đồ đang gặp sự cố. Hãy thử lại sau.");
    return apiError("bad", "Yêu cầu không hợp lệ (mã " + status + ").");
  }
};
