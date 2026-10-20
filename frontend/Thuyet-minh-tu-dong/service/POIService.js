/* POIService: các điểm thuyết minh (POI) BÊN TRONG khu tham quan Dinh Độc Lập. Hiện là dữ liệu mẫu; sau này thay bằng GET /api/pois.
   Toạ độ lat/lng là VĨ ĐỘ / KINH ĐỘ thật (xấp xỉ, hãy kiểm tra lại trên Google Maps và chỉnh ở trang Admin).
   Ảnh (img) nhận 1 trong 3 dạng:
     - tên file trên Wikimedia Commons, ví dụ "Saigon_Opera_House_2014.jpg" (ảnh giấy phép tự do, cần Internet)
     - đường dẫn ảnh trong dự án, ví dụ "img/places/nha-hat.jpg" (bỏ ảnh vào thư mục img/ cạnh index.html)
     - một URL đầy đủ https://...
   Nếu ảnh lỗi / không có mạng, giao diện tự quay về khối màu + biểu tượng như cũ.
   ẢNH TỪNG ĐIỂM: chụp ảnh rồi lưu vào thư mục img/places/ với tên poi-3.jpg, poi-4.jpg... (đúng id của điểm).
   Chưa có file thì điểm đó hiện màu + biểu tượng; có file là tự hiện ảnh, không phải sửa code. */
const LANGS = {
  vi: { f: "Tiếng Việt", tts: "vi-VN", cps: 14 },
  en: { f: "English", tts: "en-US", cps: 14 },
  zh: { f: "中文", tts: "zh-CN", cps: 5 }
};

const POIService = {
  _seed: [
    { id: 1, lat: 10.7779, lng: 106.6964, r: 30, pri: 3, icon: "fa-flag", code: "\uf024", grad: ["#dc2626", "#f59e0b"], cat: "Khuôn viên",
      img: "20190923_Independence_Palace-10.jpg", credit: "Balon Greyjoy · CC0",
      name: { vi: "Cổng chính và xe tăng", en: "Main Gate and Tanks", zh: "正门与坦克" }, addr: "Cổng chính phía đường Lê Duẩn",
      text: { vi: "Bạn đang đứng ở cổng chính Dinh Độc Lập. Trưa ngày 30 tháng 4 năm 1975, xe tăng 390 húc đổ cánh cổng này, đánh dấu thời khắc kết thúc chiến tranh và thống nhất đất nước. Hai chiếc xe tăng trưng bày trong khuôn viên tái hiện xe tăng 843 và 390 đã tiến vào Dinh hôm đó.",
              en: "You are at the main gate of Independence Palace. Around noon on 30 April 1975, tank 390 crashed through this gate, marking the end of the war and the reunification of Vietnam. The two tanks displayed on the grounds recall tanks 843 and 390, which entered the palace that day.",
              zh: "您现在位于独立宫正门。1975年4月30日中午，390号坦克撞开了这道大门，标志着战争结束、国家统一。园内展出的两辆坦克再现了当天开进独立宫的843号和390号坦克。" } },
    { id: 2, lat: 10.77745, lng: 106.69585, r: 30, pri: 3, icon: "fa-landmark", code: "\uf66f", grad: ["#2563eb", "#7c3aed"], cat: "Khuôn viên",
      img: "20190923_Independence_Palace-10.jpg", credit: "Balon Greyjoy · CC0",
      name: { vi: "Mặt tiền và kiến trúc", en: "Facade and Architecture", zh: "正立面与建筑" }, addr: "Bãi cỏ trước mặt tiền Dinh",
      text: { vi: "Dinh Độc Lập do kiến trúc sư Ngô Viết Thụ thiết kế, khởi công năm 1962 và khánh thành ngày 31 tháng 10 năm 1966, trên nền Dinh Norodom cũ thời Pháp. Mặt tiền nổi bật với những hàng rèm hoa đá mô phỏng đốt trúc, vừa che nắng vừa mang nét kiến trúc truyền thống Á Đông.",
              en: "Independence Palace was designed by architect Ngo Viet Thu. Construction began in 1962 and it was inaugurated on 31 October 1966, on the site of the former French-era Norodom Palace. Its facade is known for rows of stone screens shaped like bamboo segments, which give shade and echo traditional East Asian architecture.",
              zh: "独立宫由建筑师吴越树设计，1962年动工，1966年10月31日落成，原址为法属时期的诺罗敦宫。正面以仿竹节造型的石质花帘著称，既能遮阳，又体现了东方传统建筑风格。" } },
    { id: 3, lat: 10.77712, lng: 106.69548, r: 15, pri: 2, icon: "fa-scroll", code: "\uf70e", grad: ["#b45309", "#f59e0b"], cat: "Bên trong Dinh",
      img: "img/places/poi-3.jpg", credit: "",
      name: { vi: "Phòng Trình Quốc thư", en: "Credentials Room", zh: "国书递交厅" }, addr: "Bên trong Dinh",
      text: { vi: "Đây là phòng Trình Quốc thư, nơi các đại sứ nước ngoài trình thư uỷ nhiệm. Điểm nhấn của căn phòng là bức tranh sơn mài lớn Bình Ngô Đại Cáo gồm 40 tấm ghép lại, của hoạ sĩ Nguyễn Văn Minh.",
              en: "This is the Credentials Room, where foreign ambassadors presented their letters of credence. Its highlight is the large lacquer painting Binh Ngo Dai Cao, the Great Proclamation of Victory over the Ming, made of 40 panels by artist Nguyen Van Minh.",
              zh: "这里是国书递交厅，外国大使在此递交国书。厅内最引人注目的是画家阮文明创作的大型漆画《平吴大诰》，由40块画板拼接而成。" } },
    { id: 4, lat: 10.77695, lng: 106.69528, r: 15, pri: 2, icon: "fa-users", code: "\uf0c0", grad: ["#0ea5e9", "#2563eb"], cat: "Bên trong Dinh",
      img: "img/places/poi-4.jpg", credit: "",
      name: { vi: "Phòng họp Nội các", en: "Cabinet Room", zh: "内阁会议室" }, addr: "Bên trong Dinh",
      text: { vi: "Phòng họp Nội các là nơi Tổng thống họp với các bộ trưởng. Căn phòng vẫn giữ bàn họp dài và hàng ghế như thời kỳ trước năm 1975, giúp du khách hình dung cách bộ máy chính quyền làm việc tại đây.",
              en: "The Cabinet Room is where the president met with his ministers. The long meeting table and rows of chairs remain as they were before 1975, helping visitors picture how the government worked here.",
              zh: "内阁会议室是总统与各部部长开会的地方。长会议桌和成排的座椅仍保持1975年以前的原貌，帮助游客了解当时政府在此办公的情景。" } },
    { id: 5, lat: 10.7768, lng: 106.69512, r: 15, pri: 2, icon: "fa-helicopter", code: "\uf533", grad: ["#10b981", "#0ea5e9"], cat: "Sân thượng",
      img: "img/places/poi-5.jpg", credit: "",
      name: { vi: "Sân thượng và trực thăng", en: "Rooftop and Helicopter", zh: "屋顶与直升机" }, addr: "Sân thượng",
      text: { vi: "Trên sân thượng có bãi đáp trực thăng. Chiếc trực thăng UH-1 trưng bày ở đây là loại từng phục vụ Tổng thống. Ngày 8 tháng 4 năm 1975, phi công Nguyễn Thành Trung lái máy bay F-5E ném bom Dinh; các vị trí trúng bom được đánh dấu bằng vòng tròn đỏ trên sân thượng.",
              en: "The rooftop has a helipad. The UH-1 helicopter displayed here is the type once used by the president. On 8 April 1975, pilot Nguyen Thanh Trung bombed the palace from an F-5E jet; the impact points are marked with red circles on the roof.",
              zh: "屋顶设有直升机停机坪，这里展出的UH-1直升机是当年总统使用过的机型。1975年4月8日，飞行员阮成忠驾驶F-5E战机轰炸独立宫，屋顶上用红圈标出了炸弹落点。" } },
    { id: 6, lat: 10.77666, lng: 106.69496, r: 15, pri: 3, icon: "fa-broadcast-tower", code: "\uf519", grad: ["#475569", "#1e293b"], cat: "Tầng hầm",
      img: "img/places/poi-6.jpg", credit: "",
      name: { vi: "Tầng hầm chỉ huy", en: "Command Bunker", zh: "地下指挥所" }, addr: "Tầng hầm",
      text: { vi: "Tầng hầm là hệ thống hầm chỉ huy kiên cố, được xây để chịu được bom. Bên trong có phòng thông tin liên lạc, phòng bản đồ tác chiến và phòng nghỉ của Tổng thống, cùng nhiều máy điện đàm vẫn còn được lưu giữ.",
              en: "The basement is a reinforced command bunker built to withstand bombing. It contains a communications centre, a war map room and the president's rest room, with many original radio sets still preserved.",
              zh: "地下室是一座坚固的指挥地堡，可抵御轰炸。里面有通讯中心、作战地图室和总统休息室，许多原有的无线电设备至今仍被保存。" } }
  ],
  /* Ảnh banner trang chủ (toàn cảnh thành phố) */
  HERO: [
    { img: "20190923_Independence_Palace-10.jpg", cap: "Dinh Độc Lập", credit: "Balon Greyjoy · CC0" },
    { img: "Ho_Chi_Minh_City.jpg", cap: "Sông Sài Gòn và trung tâm thành phố", credit: "Benjamin Linh VU · CC BY-SA 2.0" },
    { img: "Nguyen_Hue_Street_2020.jpg", cap: "Phố đi bộ Nguyễn Huệ", credit: "Timback · CC BY-SA 4.0" },
    { img: "Ho_Chi_Minh_City,_City_Hall,_2020-01_CN-03.jpg", cap: "Trụ sở UBND Thành phố", credit: "Steffen Schmitz · CC BY-SA 4.0" }
  ],
  /* tiền tố cho ảnh nằm trong dự án (trang Admin đặt "../") */
  BASE: "",
  /* ----- Lưu trữ: Admin ghi vào Store("pois"); nếu chưa có thì dùng dữ liệu mẫu ở trên ----- */
  _c: { k: null, v: null },
  ORIGIN: { lat: 10.7772, lng: 106.6956 },   // trung tâm khuôn viên Dinh Độc Lập
  /* đổi dữ liệu mẫu (vd chuyển sang Dinh Độc Lập) thì tăng số này để trình duyệt bỏ dữ liệu địa điểm cũ đã lưu */
  DATA_VER: "dinh-doc-lap-2",
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
  _checkVer() { if (Store.get("poisVer", "") !== this.DATA_VER) { Store.del("pois"); Store.del("tours"); Store.del("tour"); Store.set("poisVer", this.DATA_VER); } },
  raw() { this._checkVer(); const s = Store.get("pois", null); return s && s.length ? s.map(p => this._migrate(p)) : this._seed.map(p => Object.assign({ status: "published" }, p)); },
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
