# Hướng dẫn dùng GPS thật

## 1. Điều kiện để GPS hoạt động
| Điều kiện | Chi tiết |
|---|---|
| **HTTPS hoặc localhost** | Trình duyệt chặn định vị ở địa chỉ `http://` thông thường. `http://localhost` và `http://127.0.0.1` thì được. |
| **Cho phép vị trí** | Bấm "Cho phép" khi trình duyệt hỏi. Nếu lỡ chặn: bấm biểu tượng ổ khoá cạnh địa chỉ → Vị trí → Cho phép. |
| **Bật định vị trên thiết bị** | Điện thoại: bật Location/GPS (chế độ độ chính xác cao). Máy tính: thường chỉ có định vị theo Wi-Fi/IP, sai số hàng trăm mét. |
| **Internet** | Cần để tải bản đồ (Leaflet + OpenStreetMap). |
| **Toạ độ thật của địa điểm** | Chỉnh ở Admin → Địa điểm (bấm trên bản đồ hoặc nhập vĩ độ/kinh độ). Toạ độ mẫu chỉ xấp xỉ, hãy kiểm tra trên Google Maps. |

## 2. Cách bật
Trang **Địa điểm** → nút **GPS thật** ở góc trên trái bản đồ. Muốn demo trong phòng: bấm **Giả lập** (kéo chấm xanh, bấm lên bản đồ, hoặc "Đi dạo thử").

Thanh trạng thái dưới bản đồ cho biết: đang xin quyền / GPS hoạt động (kèm sai số ±m) / tín hiệu yếu / bị từ chối / cần HTTPS.

## 3. Thử trên điện thoại (cần HTTPS)
Mở `http://192.168.x.x:5500` bằng Live Server trên điện thoại **sẽ không dùng được GPS** (không phải HTTPS). Chọn một trong các cách:
1. **GitHub Pages** (miễn phí, có HTTPS): đẩy thư mục dự án lên GitHub → Settings → Pages → chọn nhánh `main`. Dùng link `https://<tên>.github.io/<repo>/` (và tạo QR từ link này).
2. **Đường hầm tạm** để thử nhanh: ví dụ `npx localtunnel --port 5500` hoặc `cloudflared tunnel --url http://localhost:5500` → được link HTTPS.
3. **Chrome trên Android + USB:** vào `chrome://inspect`, bật Port forwarding `5500 → localhost:5500`, rồi mở `http://localhost:5500` trên điện thoại (localhost được coi là an toàn).

## 4. Cách hệ thống xử lý sai số GPS
- Sai số báo về > **80 m** → chỉ hiện vị trí, **không** dùng để kích hoạt thuyết minh (tránh phát nhầm khi tín hiệu yếu).
- Vào vùng khi khoảng cách ≤ bán kính; ra vùng khi vượt 1,1 lần bán kính (tránh nhấp nháy).
- Vẫn áp dụng debounce 0,8 s, cooldown và ưu tiên như chế độ giả lập.
- Bán kính nên **40–80 m**: GPS ngoài trời thường lệch 5–20 m, trong nhà/giữa nhà cao tầng có thể lệch hơn 50 m.

## 5. Giới hạn của ứng dụng web
- Trình duyệt **không theo dõi GPS khi tắt màn hình** hoặc chuyển sang ứng dụng khác. Trang xin "giữ màn hình sáng" (Wake Lock) khi bật GPS, nhưng không phải trình duyệt nào cũng hỗ trợ.
- Cần chạy nền thật sự thì phải làm ứng dụng mobile (React Native).
- Bản đồ nền dùng máy chủ công cộng của OpenStreetMap, chỉ phù hợp demo/đồ án quy mô nhỏ.
