/* POIService: dữ liệu điểm tham quan. Hiện là dữ liệu mẫu; sau này thay bằng GET /api/v1/pois.
   Toạ độ lat/lng là VĨ ĐỘ / KINH ĐỘ thật (xấp xỉ, hãy kiểm tra lại trên Google Maps và chỉnh ở trang Admin).
   Ảnh (img) nhận 1 trong 3 dạng:
     - tên file trên Wikimedia Commons, ví dụ "Saigon_Opera_House_2014.jpg" (ảnh giấy phép tự do, cần Internet)
     - đường dẫn ảnh trong dự án, ví dụ "img/places/nha-hat.jpg" (bỏ ảnh vào thư mục img/ cạnh index.html)
     - một URL đầy đủ https://...
   Nếu ảnh lỗi / không có mạng, giao diện tự quay về khối màu + biểu tượng như cũ. */
const LANGS = {
  vi: { f: "Tiếng Việt", tts: "vi-VN", cps: 14 },
  en: { f: "English", tts: "en-US", cps: 14 },
  zh: { f: "中文", tts: "zh-CN", cps: 5 }
};

const POIService = {
  _seed: [
    { id: 1, lat: 10.7769, lng: 106.6953, r: 60, pri: 3, icon: "fa-landmark", code: "\uf66f", grad: ["#2563eb", "#7c3aed"], cat: "Di tích lịch sử",
      img: "20190923_Independence_Palace-10.jpg", credit: "Balon Greyjoy · CC0",
      name: { vi: "Dinh Độc Lập", en: "Independence Palace", zh: "独立宫" }, addr: "135 Nam Kỳ Khởi Nghĩa, P. Bến Thành, Q.1, TP.HCM",
      text: { vi: "Dinh Độc Lập hoàn thành năm 1966, là công trình nổi tiếng với kiến trúc hiện đại. Nơi đây gắn liền với sự kiện lịch sử ngày 30 tháng 4 năm 1975.",
              en: "Independence Palace was completed in 1966 and is known for its modern architecture. It is closely tied to the historic events of 30 April 1975.",
              zh: "独立宫建成于1966年，以现代建筑风格闻名，与1975年4月30日的历史事件密切相关。" } },
    { id: 2, lat: 10.7800, lng: 106.6999, r: 40, pri: 2, icon: "fa-envelope", code: "\uf0e0", grad: ["#0ea5e9", "#2563eb"], cat: "Kiến trúc",
      img: "Saigon_Central_Post_Office_(52681461470).jpg", credit: "Kevin Rutherford · CC BY-SA 2.0",
      name: { vi: "Bưu điện", en: "Central Post Office", zh: "中央邮局" }, addr: "02 Công xã Paris, P. Bến Nghé, Q.1, TP.HCM",
      text: { vi: "Bưu điện Trung tâm Sài Gòn được xây dựng vào cuối thế kỷ 19 theo phong cách kiến trúc Pháp. Mái vòm khung sắt và những ô cửa sổ lớn là điểm nhấn của công trình.",
              en: "The Saigon Central Post Office was built in the late 19th century in French style. Its iron-framed vaulted roof and tall windows are its signature features.",
              zh: "西贡中央邮局建于19世纪末，采用法式建筑风格，铁架拱顶和高大的窗户是其特色。" } },
    { id: 3, lat: 10.7798, lng: 106.6990, r: 60, pri: 3, icon: "fa-church", code: "\uf51d", grad: ["#f59e0b", "#ef4444"], cat: "Di tích lịch sử",
      img: "Basílica_de_Nuestra_Señora,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_03.JPG", credit: "Diego Delso · CC BY-SA 3.0",
      name: { vi: "Nhà thờ Đức Bà", en: "Notre-Dame Cathedral", zh: "圣母大教堂" }, addr: "01 Công xã Paris, P. Bến Nghé, Q.1, TP.HCM",
      text: { vi: "Nhà thờ Đức Bà Sài Gòn được xây dựng từ năm 1863 đến 1880, nổi bật với gạch đỏ và hai tháp chuông cao gần 60 mét. Đây là một trong những biểu tượng kiến trúc của thành phố.",
              en: "Saigon Notre-Dame Cathedral was built between 1863 and 1880, with its red bricks and twin bell towers almost 60 metres tall. It is one of the city's architectural icons.",
              zh: "西贡圣母大教堂建于1863至1880年间，以红砖和近60米高的双钟楼闻名，是这座城市的建筑象征之一。" } },
    { id: 4, lat: 10.7766, lng: 106.7031, r: 50, pri: 2, icon: "fa-theater-masks", code: "\uf630", grad: ["#ec4899", "#8b5cf6"], cat: "Văn hóa nghệ thuật",
      img: "Saigon_Opera_House_2014.jpg", credit: "Ekrem Canli · CC BY-SA 3.0",
      name: { vi: "Nhà hát Thành phố", en: "Municipal Theatre", zh: "市立剧院" }, addr: "07 Công trường Lam Sơn, P. Bến Nghé, Q.1, TP.HCM",
      text: { vi: "Nhà hát Thành phố khánh thành năm 1900 theo phong cách Pháp. Đây là nơi diễn ra nhiều chương trình âm nhạc, ballet và kịch nghệ.",
              en: "The Municipal Theatre opened in 1900 in French style. It hosts many music, ballet and theatre performances.",
              zh: "市立剧院于1900年落成，采用法式风格，常举办音乐、芭蕾和戏剧演出。" } },
    { id: 5, lat: 10.7777, lng: 106.7003, r: 50, pri: 1, icon: "fa-university", code: "\uf19c", grad: ["#10b981", "#0ea5e9"], cat: "Bảo tàng",
      img: "Bảo_tàng_Thành_phố_Hồ_Chí_Minh_7.jpg", credit: "Bùi Thụy Đào Nguyên · CC BY-SA 3.0",
      name: { vi: "Bảo tàng Thành phố Hồ Chí Minh", en: "Ho Chi Minh City Museum", zh: "胡志明市博物馆" }, addr: "65 Lý Tự Trọng, P. Bến Nghé, Q.1, TP.HCM",
      text: { vi: "Đây là điểm dừng chân để tìm hiểu lịch sử và văn hóa của thành phố qua các hiện vật và tư liệu trưng bày.",
              en: "This stop lets you explore the history and culture of the city through its exhibits and archives.",
              zh: "在这里可以通过展品和资料了解这座城市的历史与文化。" } }
  ],
  /* Ảnh banner trang chủ (toàn cảnh thành phố) */
  HERO: [
    { img: "Ho_Chi_Minh_City.jpg", cap: "Sông Sài Gòn và trung tâm thành phố", credit: "Benjamin Linh VU · CC BY-SA 2.0" },
    { img: "Nguyen_Hue_Street_2020.jpg", cap: "Phố đi bộ Nguyễn Huệ", credit: "Timback · CC BY-SA 4.0" },
    { img: "Ho_Chi_Minh_City,_City_Hall,_2020-01_CN-03.jpg", cap: "Trụ sở UBND Thành phố", credit: "Steffen Schmitz · CC BY-SA 4.0" }
  ],
  /* tiền tố cho ảnh nằm trong dự án (trang Admin đặt "../") */
  BASE: "",
  /* ----- Lưu trữ: Admin ghi vào Store("pois"); nếu chưa có thì dùng dữ liệu mẫu ở trên ----- */
  _c: { k: null, v: null },
  ORIGIN: { lat: 10.7782, lng: 106.6995 },
  /* dữ liệu cũ (toạ độ x,y của bản đồ giả lập) được đổi sang lat/lng; dữ liệu cũ chưa có ảnh thì lấy ảnh mẫu (nếu đúng địa điểm mẫu) */
  _migrate(p) {
    let q = p;
    if (p.img === undefined) {
      const s = this._seed.find(x => x.id === p.id && p.name && x.name.vi === p.name.vi);
      if (s) q = Object.assign({}, p, { img: s.img, credit: s.credit });
    }
    if (q.lat != null && q.lng != null) return q;
    q = Object.assign({}, q); const m = 111320;
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
  /* ----- Ảnh ----- */
  isCommons(s) { return !!s && !/^(https?:|data:|\.{0,2}\/|img\/)/i.test(s.trim()); },
  /* đổi giá trị img thành URL dùng được; w = độ rộng mong muốn (chỉ áp dụng cho ảnh Wikimedia) */
  photoUrl(img, w = 800) {
    const s = (img || "").trim(); if (!s) return "";
    if (/^(https?:|data:)/i.test(s)) return s;
    if (!this.isCommons(s)) return this.BASE + s.replace(/^\.\//, "");
    return "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(s.replace(/^File:/i, "").replace(/ /g, "_")) + "?width=" + w;
  },
  /* trang mô tả ảnh (để ghi nguồn) */
  photoPage(img) {
    const s = (img || "").trim();
    if (!this.isCommons(s)) return /^https?:/i.test(s) ? s : "";
    return "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(s.replace(/^File:/i, "").replace(/ /g, "_"));
  },
  /* nội dung bên trong khối ảnh: ảnh thật phủ lên trên, lỗi ảnh thì còn lại biểu tượng + màu nền */
  media(p, w = 800) {
    const src = this.photoUrl(p.img, w), ic = `<i class="fas ${p.icon} poi-fallback"></i>`;
    if (!src) return ic;
    return ic + `<img class="poi-photo" src="${Helper.esc(src)}" alt="${Helper.esc(p.name.vi)}" loading="lazy" decoding="async"${p.credit ? ` title="Ảnh: ${Helper.esc(p.credit)}"` : ""} onerror="this.remove()" />`;
  },
  /* danh sách ghi nguồn ảnh cho footer */
  credits() {
    const out = [];
    this.HERO.forEach(h => out.push({ name: h.cap, credit: h.credit, page: this.photoPage(h.img) }));
    this.all().forEach(p => { if (p.img && (p.credit || this.isCommons(p.img))) out.push({ name: p.name.vi, credit: p.credit || "Wikimedia Commons", page: this.photoPage(p.img) }); });
    return out;
  },
  search({ q = "", cat = "", maxR = 0 } = {}) {
    q = Helper.norm(q);
    return this.all().filter(p =>
      (!q || Object.values(p.name).some(n => Helper.norm(n).includes(q)) || Helper.norm(p.addr).includes(q)) &&
      (!cat || p.cat === cat) && (!maxR || p.r <= maxR));
  },
  /* thời lượng đọc ước tính (giây) */
  duration(p, lang, rate = 1) { return p.text[lang].length / LANGS[lang].cps / rate; }
};
