/* ============================================================
   CẤU HÌNH — NƠI DÁN KHOÁ API
   ------------------------------------------------------------
   >>> DÁN KHOÁ OpenRouteService VÀO GIỮA HAI DẤU NGOẶC KÉP Ở DÒNG ORS_API_KEY BÊN DƯỚI <<<
   Cách lấy khoá: xem file HUONG-DAN-API.md
   - Có khoá: tìm địa chỉ + chỉ đường đi bộ + dẫn đường hoạt động đầy đủ.
   - Để trống: tìm địa chỉ dùng tạm OpenStreetMap Nominatim (chỉ tìm khi nhấn Enter),
               chỉ đường sẽ báo "chưa có khoá" và mở Google Maps thay thế.
   LƯU Ý BẢO MẬT: khoá nằm trong file web nên ai mở trang cũng đọc được. Chỉ dùng khoá miễn phí
   riêng cho đồ án, KHÔNG dùng khoá có gắn thẻ thanh toán. Khi có backend, hãy chuyển việc gọi dịch vụ về backend.
   ============================================================ */
const CONFIG = {
  ORS_API_KEY: "",        // <<< DÁN KHOÁ VÀO ĐÂY, ví dụ: "5b3ce3597851110001cf6248xxxxxxxxxxxxxxxx"

  COUNTRY: "VN",          // giới hạn tìm địa chỉ trong nước nào (mã ISO 2 chữ)
  OFF_ROUTE_M: 35,        // đi lệch tuyến quá bao nhiêu mét thì tính lại đường
  ARRIVE_M: 25,           // cách đích bao nhiêu mét thì coi là đã đến nơi
  REROUTE_MIN_GAP_S: 15   // tối thiểu bao nhiêu giây giữa hai lần tính lại đường (tiết kiệm lượt gọi dịch vụ)
};
