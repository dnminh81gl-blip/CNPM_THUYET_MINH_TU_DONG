/* POIService: dữ liệu điểm tham quan. Hiện là dữ liệu mẫu; sau này thay bằng GET /api/v1/pois.
   Toạ độ lat/lng là VĨ ĐỘ / KINH ĐỘ thật (xấp xỉ, hãy kiểm tra lại trên Google Maps và chỉnh ở trang Admin). */
const LANGS = {
  vi: { f: "Tiếng Việt", tts: "vi-VN", cps: 14 },
  en: { f: "English", tts: "en-US", cps: 14 },
  zh: { f: "中文", tts: "zh-CN", cps: 5 }
};

const POIService = {
  _seed: [
    { id: 1, lat: 10.7769, lng: 106.6953, r: 60, pri: 3, icon: "fa-landmark", code: "\uf66f", grad: ["#2563eb", "#7c3aed"], cat: "Di tích lịch sử",
      name: { vi: "Dinh Độc Lập", en: "Independence Palace", zh: "独立宫" }, addr: "135 Nam Kỳ Khởi Nghĩa, P. Bến Thành, Q.1, TP.HCM",
      text: { vi: "Dinh Độc Lập hoàn thành năm 1966, là công trình nổi tiếng với kiến trúc hiện đại. Nơi đây gắn liền với sự kiện lịch sử ngày 30 tháng 4 năm 1975.",
              en: "Independence Palace was completed in 1966 and is known for its modern architecture. It is closely tied to the historic events of 30 April 1975.",
              zh: "独立宫建成于1966年，以现代建筑风格闻名，与1975年4月30日的历史事件密切相关。" } },
    { id: 2, lat: 10.7800, lng: 106.6999, r: 40, pri: 2, icon: "fa-envelope", code: "\uf0e0", grad: ["#0ea5e9", "#2563eb"], cat: "Kiến trúc",
      name: { vi: "Bưu điện", en: "Central Post Office", zh: "中央邮局" }, addr: "02 Công xã Paris, P. Bến Nghé, Q.1, TP.HCM",
      text: { vi: "Bưu điện Trung tâm Sài Gòn được xây dựng vào cuối thế kỷ 19 theo phong cách kiến trúc Pháp. Mái vòm khung sắt và những ô cửa sổ lớn là điểm nhấn của công trình.",
              en: "The Saigon Central Post Office was built in the late 19th century in French style. Its iron-framed vaulted roof and tall windows are its signature features.",
              zh: "西贡中央邮局建于19世纪末，采用法式建筑风格，铁架拱顶和高大的窗户是其特色。" } },
    { id: 3, lat: 10.7798, lng: 106.6990, r: 60, pri: 3, icon: "fa-church", code: "\uf51d", grad: ["#f59e0b", "#ef4444"], cat: "Di tích lịch sử",
      name: { vi: "Nhà thờ Đức Bà", en: "Notre-Dame Cathedral", zh: "圣母大教堂" }, addr: "01 Công xã Paris, P. Bến Nghé, Q.1, TP.HCM",
      text: { vi: "Nhà thờ Đức Bà Sài Gòn được xây dựng từ năm 1863 đến 1880, nổi bật với gạch đỏ và hai tháp chuông cao gần 60 mét. Đây là một trong những biểu tượng kiến trúc của thành phố.",
              en: "Saigon Notre-Dame Cathedral was built between 1863 and 1880, with its red bricks and twin bell towers almost 60 metres tall. It is one of the city's architectural icons.",
              zh: "西贡圣母大教堂建于1863至1880年间，以红砖和近60米高的双钟楼闻名，是这座城市的建筑象征之一。" } },
    { id: 4, lat: 10.7766, lng: 106.7031, r: 50, pri: 2, icon: "fa-theater-masks", code: "\uf630", grad: ["#ec4899", "#8b5cf6"], cat: "Văn hóa nghệ thuật",
      name: { vi: "Nhà hát Thành phố", en: "Municipal Theatre", zh: "市立剧院" }, addr: "07 Công trường Lam Sơn, P. Bến Nghé, Q.1, TP.HCM",
      text: { vi: "Nhà hát Thành phố khánh thành năm 1900 theo phong cách Pháp. Đây là nơi diễn ra nhiều chương trình âm nhạc, ballet và kịch nghệ.",
              en: "The Municipal Theatre opened in 1900 in French style. It hosts many music, ballet and theatre performances.",
              zh: "市立剧院于1900年落成，采用法式风格，常举办音乐、芭蕾和戏剧演出。" } },
    { id: 5, lat: 10.7777, lng: 106.7003, r: 50, pri: 1, icon: "fa-university", code: "\uf19c", grad: ["#10b981", "#0ea5e9"], cat: "Bảo tàng",
      name: { vi: "Bảo tàng Thành phố Hồ Chí Minh", en: "Ho Chi Minh City Museum", zh: "胡志明市博物馆" }, addr: "65 Lý Tự Trọng, P. Bến Nghé, Q.1, TP.HCM",
      text: { vi: "Đây là điểm dừng chân để tìm hiểu lịch sử và văn hóa của thành phố qua các hiện vật và tư liệu trưng bày.",
              en: "This stop lets you explore the history and culture of the city through its exhibits and archives.",
              zh: "在这里可以通过展品和资料了解这座城市的历史与文化。" } }
  ],
  /* ----- Lưu trữ: Admin ghi vào Store("pois"); nếu chưa có thì dùng dữ liệu mẫu ở trên ----- */
  _c: { k: null, v: null },
  ORIGIN: { lat: 10.7782, lng: 106.6995 },
  /* dữ liệu cũ (toạ độ x,y của bản đồ giả lập) được đổi sang lat/lng để không bị mất */
  _migrate(p) {
    if (p.lat != null && p.lng != null) return p;
    const q = Object.assign({}, p), m = 111320;
    q.lat = +(this.ORIGIN.lat + (320 - (p.y == null ? 320 : p.y)) / m).toFixed(6);
    q.lng = +(this.ORIGIN.lng + ((p.x == null ? 500 : p.x) - 500) / (m * Math.cos(this.ORIGIN.lat * Math.PI / 180))).toFixed(6);
    delete q.x; delete q.y; return q;
  },
  raw() { const s = Store.get("pois", null); return s && s.length ? s.map(p => this._migrate(p)) : this._seed.map(p => Object.assign({ status: "published" }, p)); },
  save(list) { Store.set("pois", list); this._c = { k: null, v: null }; },
  resetSeed() { Store.del("pois"); this._c = { k: null, v: null }; },
  /* điền ngôn ngữ còn thiếu bằng tiếng Việt để giao diện người dùng không bị trống */
  _norm(p) {
    const c = JSON.parse(JSON.stringify(p));
    Object.keys(LANGS).forEach(l => { c.name[l] = c.name[l] || c.name.vi; c.text[l] = c.text[l] || c.text.vi; });
    return c;
  },
  /* danh sách đã xuất bản (dùng cho trang người dùng) */
  all() {
    let k = ""; try { k = localStorage.getItem("ttd:pois") || ""; } catch (e) {}
    if (this._c.k !== k || !this._c.v) this._c = { k, v: this.raw().filter(p => p.status !== "draft").map(p => this._norm(p)) };
    return this._c.v;
  },
  get(id) { return this.all().find(p => p.id === Number(id)); },
  categories() { return [...new Set(this.all().map(p => p.cat))]; },
  grad(p) { return `linear-gradient(135deg, ${p.grad[0]}, ${p.grad[1]})`; },
  search({ q = "", cat = "", maxR = 0 } = {}) {
    q = Helper.norm(q);
    return this.all().filter(p =>
      (!q || Object.values(p.name).some(n => Helper.norm(n).includes(q)) || Helper.norm(p.addr).includes(q)) &&
      (!cat || p.cat === cat) && (!maxR || p.r <= maxR));
  },
  /* thời lượng đọc ước tính (giây) */
  duration(p, lang, rate = 1) { return p.text[lang].length / LANGS[lang].cps / rate; }
};
