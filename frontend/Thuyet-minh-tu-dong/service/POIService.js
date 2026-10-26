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
      img: "Tank_Remnant_in_the_Independence_Palace.jpg", credit: "",
      name: { vi: "Cổng chính và xe tăng", en: "Main Gate and Tanks", zh: "正门与坦克" }, addr: "Cổng chính phía đường Lê Duẩn",
      text: { vi: "Bạn đang đứng ở cổng chính Dinh Độc Lập. Trưa ngày 30 tháng 4 năm 1975, xe tăng 390 húc đổ cánh cổng này, đánh dấu thời khắc kết thúc chiến tranh và thống nhất đất nước. Hai chiếc xe tăng trưng bày trong khuôn viên gợi nhớ xe tăng 843 và 390 đã tiến vào Dinh hôm đó.",
              en: "You are at the main gate of Independence Palace. Around noon on 30 April 1975, tank 390 crashed through this gate, marking the end of the war and the reunification of Vietnam. The two tanks displayed on the grounds recall tanks 843 and 390, which entered the palace that day.",
              zh: "您现在位于独立宫正门。1975年4月30日中午，390号坦克撞开了这道大门，标志着战争结束、国家统一。园内展出的两辆坦克让人回想起当天开进独立宫的843号和390号坦克。" } },
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
      text: { vi: "Trên sân thượng có bãi đáp trực thăng, nơi trưng bày một chiếc trực thăng UH-1. Sáng ngày 8 tháng 4 năm 1975, phi công Nguyễn Thành Trung lái máy bay F-5E ném bom Dinh Độc Lập rồi hạ cánh an toàn ở vùng giải phóng Phước Long.",
              en: "The rooftop has a helipad, where a UH-1 helicopter is on display. On the morning of 8 April 1975, pilot Nguyen Thanh Trung bombed the palace from an F-5E jet and then landed safely in the liberated area of Phuoc Long.",
              zh: "屋顶设有直升机停机坪，这里展出一架UH-1直升机。1975年4月8日上午，飞行员阮成忠驾驶F-5E战机轰炸独立宫，随后安全降落在已解放的福隆地区。" } },
    { id: 6, lat: 10.77666, lng: 106.69496, r: 15, pri: 3, icon: "fa-broadcast-tower", code: "\uf519", grad: ["#475569", "#1e293b"], cat: "Tầng hầm",
      img: "img/places/poi-6.jpg", credit: "",
      name: { vi: "Tầng hầm chỉ huy", en: "Command Bunker", zh: "地下指挥所" }, addr: "Tầng hầm",
      text: { vi: "Tầng hầm là hệ thống hầm chỉ huy kiên cố, được xây để chịu được bom. Bên trong có trung tâm chỉ huy, các thiết bị thông tin liên lạc và phòng bản đồ tác chiến, nhiều bản đồ vẫn còn giữ nguyên dấu bút chì đánh dấu.",
              en: "The basement is a reinforced command bunker built to withstand bombing. It contains a command centre, communications equipment and a war map room, where many maps still carry their original pencil markings.",
              zh: "地下室是一座坚固的指挥地堡，可抵御轰炸。里面有指挥中心、通讯设备和作战地图室，许多地图上仍保留着当年的铅笔标记。" } }
  ],
  /* Ảnh banner trang chủ: Dinh Độc Lập (ảnh giấy phép tự do trên Wikimedia Commons) */
  HERO: [
    { img: "20190923_Independence_Palace-10.jpg", cap: "Mặt tiền Dinh Độc Lập", credit: "Balon Greyjoy · CC0" },
    { img: "Independence_Palace_Ho_Chi_Minh_city_(38647623045).jpg", cap: "Dinh Độc Lập", credit: "Wikimedia Commons" },
    { img: "Dinh_Doc_Lap.jpg", cap: "Dinh Độc Lập", credit: "Wikimedia Commons" },
    { img: "Tank_Remnant_in_the_Independence_Palace.jpg", cap: "Xe tăng trưng bày trong khuôn viên", credit: "Wikimedia Commons" }
  ],
  /* Hiện vật và không gian trưng bày (bộ sưu tập ảnh trên trang chủ). Thêm ảnh của nhóm: img: "img/exhibits/ten-anh.jpg" */
  EXHIBITS: [
    { img: "HCMC_Reunification_Palace-Banquet_Room.jpg", cap: { vi: "Phòng Khánh tiết", en: "Banquet Room", zh: "宴会厅" }, credit: "Wikimedia Commons" },
    { img: "Reunification_Palace_-_Presidents_international_reception_room.jpg", cap: { vi: "Phòng tiếp khách quốc tế của Tổng thống", en: "President's International Reception Room", zh: "总统国际接待室" }, credit: "Wikimedia Commons" },
    { img: "Independence_Palace_Ho_Chi_Minh_city_(38647623045).jpg", cap: { vi: "Dinh Độc Lập", en: "Independence Palace", zh: "独立宫" }, credit: "Wikimedia Commons" },
    { img: "Dinh_Độc_lập.JPG", cap: { vi: "Toàn cảnh Dinh Độc Lập", en: "Independence Palace", zh: "独立宫全景" }, credit: "Wikimedia Commons" },
    { img: "Palacio_de_la_Reunificación,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_17.JPG", cap: { vi: "Dinh Độc Lập", en: "Independence Palace", zh: "独立宫" }, credit: "Diego Delso · Wikimedia Commons" }
  ],
  /* Thuyết minh TỔNG QUAN về Dinh (không gắn với vị trí GPS, không hiện trên bản đồ).
     Nghe từng phần hoặc nghe liền cả 3 phần. Nguồn dữ kiện: dinhdoclap.gov.vn (Lịch sử, Kiến trúc Dinh Độc Lập). id 0 = "Tổng quan" trong thống kê. */
  OVERVIEW: {
    id: 0, pri: 9, icon: "fa-landmark", cat: "Tổng quan",
    name: { vi: "Giới thiệu tổng quan Dinh Độc Lập", en: "Independence Palace overview", zh: "独立宫概况" },
    facts: [
      { v: "1868", t: "Đặt đá xây Dinh Norodom" },
      { v: "1966", t: "Khánh thành Dinh mới" },
      { v: "12 ha", t: "Khuôn viên" },
      { v: "~100", t: "Phòng bên trong" }
    ],
    chapters: [
      { key: "lich-su", icon: "fa-history",
        title: { vi: "Lịch sử: từ Dinh Norodom đến Dinh Độc Lập", en: "History: from Norodom Palace to Independence Palace", zh: "历史：从诺罗敦宫到独立宫" },
        sub: "1868 · 1954 · 1962 · 30/4/1975 · 2009",
        text: {
          vi: "Chào mừng bạn đến với Dinh Độc Lập. Ngày 23 tháng 2 năm 1868, chính quyền thuộc địa Pháp đặt viên đá đầu tiên xây dinh Thống đốc Nam Kỳ trên khu đất này. Công trình hoàn thành năm 1871 và được gọi là Dinh Norodom. Tháng 9 năm 1954, người Pháp bàn giao dinh cho chính quyền Ngô Đình Diệm, và dinh được đổi tên thành Dinh Độc Lập. Ngày 27 tháng 2 năm 1962, hai phi công Nguyễn Văn Cử và Phạm Phú Quốc ném bom làm toà nhà hư hại nặng, nên dinh cũ bị phá bỏ để xây dinh mới ngay trên nền cũ. Ngày 30 tháng 4 năm 1975, xe tăng Quân Giải phóng húc đổ cổng Dinh. Đến 11 giờ 30 phút, lá cờ Mặt trận Dân tộc Giải phóng tung bay trên nóc Dinh, khép lại cuộc chiến và mở ra thời kỳ thống nhất đất nước. Năm 2009, Dinh Độc Lập được xếp hạng Di tích quốc gia đặc biệt.",
          en: "Welcome to Independence Palace. On 23 February 1868, the French colonial government laid the foundation stone of a palace for the Governor of Cochinchina on this site. Completed in 1871, it became known as Norodom Palace. In September 1954 the French handed it over to Ngo Dinh Diem's government, and it was renamed Independence Palace. On 27 February 1962, two pilots, Nguyen Van Cu and Pham Phu Quoc, bombed the palace and badly damaged it, so the old building was demolished and a new palace was built on the same site. On 30 April 1975, Liberation Army tanks crashed through the palace gates. At 11:30 a.m. the flag of the National Liberation Front was raised on the roof, ending the war and opening the way to national reunification. In 2009 the palace was ranked a Special National Monument.",
          zh: "欢迎来到独立宫。1868年2月23日，法国殖民当局在这片土地上为南圻总督兴建官邸并举行奠基仪式，1871年落成，称为诺罗敦宫。1954年9月，法国将其移交给吴庭艳政府，并更名为独立宫。1962年2月27日，两名飞行员阮文举和范富国轰炸了这座建筑，造成严重损毁，旧宫随后被拆除，并在原址上兴建新宫。1975年4月30日，解放军坦克撞开宫门。11时30分，民族解放阵线的旗帜在宫顶升起，战争就此结束，国家走向统一。2009年，独立宫被列为国家特别级遗迹。" } },
      { key: "kien-truc", icon: "fa-drafting-compass",
        title: { vi: "Kiến trúc và quá trình xây dựng", en: "Architecture and construction", zh: "建筑与建造" },
        sub: "KTS Ngô Viết Thụ · 1962 – 1966",
        text: {
          vi: "Dinh Độc Lập ngày nay do kiến trúc sư Ngô Viết Thụ thiết kế. Ông là người Việt Nam đầu tiên đoạt giải Khôi nguyên La Mã. Công trình khởi công ngày 1 tháng 7 năm 1962 và khánh thành ngày 31 tháng 10 năm 1966. Khuôn viên rộng 12 héc ta. Toà nhà chính cao 26 mét, diện tích sử dụng khoảng 20 nghìn mét vuông, gồm tầng trệt, ba tầng chính, hai gác lửng, sân thượng và tầng hầm. Nhìn tổng thể, mặt bằng của Dinh gợi hình chữ Cát trong chữ Hán, nghĩa là may mắn, tốt lành. Các đường nét của mái, ban công và cột cờ còn gợi những chữ như Trung, Chủ và Hưng. Bao quanh tầng hai là hàng rèm hoa đá mô phỏng đốt trúc, lấy cảm hứng từ cửa bàn khoa của cung điện Huế, vừa trang trí vừa điều hoà ánh sáng. Phía trước Dinh là thảm cỏ hình bầu dục đường kính 102 mét.",
          en: "Today's Independence Palace was designed by architect Ngo Viet Thu, the first Vietnamese to win the Prix de Rome. Construction began on 1 July 1962 and the palace was inaugurated on 31 October 1966. The grounds cover 12 hectares. The main building is 26 metres tall, with about 20,000 square metres of floor space spread over a ground floor, three main floors, two mezzanines, a rooftop terrace and a basement. Seen as a whole, the layout evokes the Chinese character for good fortune, while the lines of the roof, balconies and flagpole suggest other characters meaning loyalty, sovereignty and prosperity. Around the second floor runs a screen of stone bamboo segments, inspired by the doors of the imperial palace in Hue, which decorates the facade and softens the sunlight. In front of the palace lies an oval lawn 102 metres across.",
          zh: "今天的独立宫由建筑师吴越树设计，他是第一位获得罗马大奖的越南人。工程于1962年7月1日动工，1966年10月31日落成。园区占地12公顷；主楼高26米，使用面积约2万平方米，包括地面层、三层主楼、两层夹层、屋顶平台和地下室。整体平面布局形似汉字“吉”，寓意吉祥如意；屋檐、阳台和旗杆的线条还暗含“中”“主”“兴”等字。二楼四周环绕着仿竹节造型的石质花帘，灵感来自顺化皇宫的门饰，既美观又能调节光线。宫前是一片直径102米的椭圆形草坪。" } },
      { key: "ben-trong", icon: "fa-door-open",
        title: { vi: "Bên trong Dinh có những gì", en: "What is inside the palace", zh: "宫内有什么" },
        sub: "Phòng nghi lễ · Khu gia đình · Sân thượng · Tầng hầm",
        text: {
          vi: "Bên trong Dinh có gần một trăm phòng, mỗi phòng được trang trí riêng theo công năng. Ở các tầng chính là những không gian nghi lễ như phòng Trình Quốc thư với bức tranh sơn mài Bình Ngô Đại Cáo, phòng họp Nội các, phòng Khánh tiết dùng để đãi tiệc, cùng phòng làm việc của Tổng thống. Tầng trên là khu sinh hoạt của gia đình Tổng thống, có cả phòng khách gia đình và rạp chiếu phim riêng. Trên sân thượng có bãi đáp trực thăng, còn dưới tầng hầm là hệ thống hầm chỉ huy kiên cố với phòng thông tin liên lạc và phòng bản đồ tác chiến. Ngoài khuôn viên trưng bày hai chiếc xe tăng gợi nhớ ngày 30 tháng 4 năm 1975. Hãy chọn một điểm trong danh sách bên dưới để nghe thuyết minh chi tiết.",
          en: "Inside the palace there are nearly one hundred rooms, each decorated for its own purpose. The main floors hold the ceremonial spaces: the Credentials Room with the lacquer painting Binh Ngo Dai Cao, the Cabinet Room, the Banquet Room, and the President's office. The upper floor holds the living quarters of the President's family, including a family lounge and a private cinema. The rooftop has a helipad, and the basement holds a reinforced command bunker with a communications centre and a war map room. Out in the grounds, two tanks recall the events of 30 April 1975. Choose a stop from the list below to hear its detailed story.",
          zh: "宫内有近一百个房间，每个房间都按用途分别装饰。主楼层是礼仪空间，包括陈列漆画《平吴大诰》的国书递交厅、内阁会议室、宴会厅，以及总统办公室。楼上是总统家庭的生活区，设有家庭客厅和私人影院。屋顶设有直升机停机坪，地下室则是坚固的指挥地堡，内有通讯中心和作战地图室。园内展出的两辆坦克让人回想起1975年4月30日。请在下方列表中选择一个地点，收听详细讲解。" } }
    ],
    /* đối tượng để AudioService phát một phần (giống một POI nhưng không có toạ độ) */
    item(k) {
      const c = this.chapters[k], n = {};
      Object.keys(LANGS).forEach(l => { n[l] = c.title[l] || c.title.vi; });
      return { id: 0, pri: 9, cat: "Tổng quan", icon: c.icon, ov: k, name: n, text: c.text };
    }
  },
  /* tiền tố cho ảnh nằm trong dự án (trang Admin đặt "../") */
  BASE: "",
  /* ----- Lưu trữ: Admin ghi vào Store("pois"); nếu chưa có thì dùng dữ liệu mẫu ở trên ----- */
  _c: { k: null, v: null },
  ORIGIN: { lat: 10.7772, lng: 106.6956 },   // trung tâm khuôn viên Dinh Độc Lập
  /* đổi dữ liệu mẫu (vd chuyển sang Dinh Độc Lập) thì tăng số này để trình duyệt bỏ dữ liệu địa điểm cũ đã lưu */
  DATA_VER: "dinh-doc-lap-4",
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
    return ic + `<img class="poi-photo" src="${Helper.esc(src)}" alt="${Helper.esc(p.name.vi)}" loading="lazy" decoding="async"${p.credit ? ` title="${typeof t === "function" ? t("photo") : "Ảnh"}: ${Helper.esc(p.credit)}"` : ""} onerror="this.remove()" />`;
  },
  /* danh sách ghi nguồn ảnh cho footer */
  credits() {
    const out = [];
    this.HERO.forEach(h => out.push({ name: h.cap, credit: h.credit, page: this.photoPage(h.img) }));
    this.EXHIBITS.forEach(h => out.push({ name: h.cap.vi, credit: h.credit, page: this.photoPage(h.img) }));
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
