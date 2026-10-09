# Khoá API cho tìm địa chỉ + chỉ đường + dẫn đường

## 1. Chỗ cần dán khoá (chỉ MỘT chỗ)
Mở file **`js/config.js`**, tìm dòng:

```js
ORS_API_KEY: "",        // <<< DÁN KHOÁ VÀO ĐÂY
```

Dán khoá vào **giữa hai dấu ngoặc kép**, ví dụ `ORS_API_KEY: "5b3ce3...xxxx",`. Lưu file, tải lại trang (Ctrl + F5). Không cần sửa chỗ nào khác.

## 2. Cách lấy khoá OpenRouteService (miễn phí)
1. Vào **openrouteservice.org**, bấm đăng ký (Sign up) bằng email, xác nhận email.
2. Đăng nhập vào trang quản lý (Dashboard), chọn **Request a token** (hoặc "Tạo token").
3. Chọn gói **Free**, đặt tên bất kỳ (ví dụ `do-an-thuyet-minh`), tạo token.
4. Sao chép chuỗi khoá dài hiện ra rồi dán vào `js/config.js`.
(Giao diện trang của họ có thể thay đổi; nếu khác thì tìm mục "API keys / Tokens". Hạn mức miễn phí và điều khoản xem trên trang của họ.)

## 3. Khi chưa có khoá thì sao
| Chức năng | Chưa có khoá |
|---|---|
| Tìm địa điểm thuyết minh trong hệ thống | Vẫn chạy bình thường (tìm cả khi gõ không dấu) |
| Tìm địa chỉ thực tế | Dùng tạm OpenStreetMap Nominatim, chỉ tìm khi nhấn **Enter** |
| Chỉ đường / Bắt đầu dẫn đường | Báo "chưa có khoá"; nút **Google Maps** vẫn mở chỉ đường ở Google Maps |

## 4. Lưu ý bảo mật
- Khoá nằm trong file web nên **ai mở trang cũng đọc được**. Chỉ dùng khoá miễn phí riêng cho đồ án, **không** dùng khoá gắn thẻ thanh toán.
- Nếu đưa mã lên GitHub công khai, người khác sẽ thấy khoá. Có thể tạo khoá mới khi nộp bài, hoặc xoá khoá khỏi file trước khi đẩy lên và chỉ dán lại ở máy dùng để demo.
- Cách làm đúng: để **service backend của nhóm** giữ khoá và gọi dịch vụ giúp trình duyệt (khi có backend).

## 5. Các lỗi thường gặp (hiện ngay trên thẻ điểm đến)
| Thông báo | Nguyên nhân |
|---|---|
| Khoá API không hợp lệ hoặc chưa được kích hoạt | Dán sai/thiếu khoá, hoặc khoá mới tạo chưa kích hoạt; kiểm tra lại dòng ORS_API_KEY |
| Đã vượt giới hạn số lần gọi | Gọi quá nhiều trong thời gian ngắn hoặc hết hạn mức ngày; đợi rồi thử lại |
| Không kết nối được dịch vụ | Mạng chặn `api.openrouteservice.org` (như trường hợp OpenStreetMap lúc trước); đổi mạng |
| Không tìm được đường đi bộ | Vị trí xuất phát hoặc đích quá xa đường đi (ví dụ GPS ở thành phố khác) |
| Chưa có vị trí xuất phát | Giả lập: bấm lên bản đồ để đặt vị trí. GPS thật: chờ GPS xác định |

## 6. Cách dùng
1. Gõ tên địa điểm hoặc địa chỉ vào ô tìm kiếm phía trên bản đồ → chọn kết quả.
2. Bấm **Chỉ đường** → xem tuyến đi bộ, thời gian, danh sách bước.
3. Bấm **Bắt đầu** → dẫn đường: bản đồ bám theo vị trí, báo bước kế tiếp, tự tính lại khi đi lệch, báo khi đến nơi, đọc to chỉ dẫn (tắt/bật bằng nút loa).
4. Chế độ **Giả lập**: có nút **Chạy thử** để chấm xanh tự đi dọc tuyến (rất tiện khi demo trong phòng).
5. Đi qua điểm thuyết minh nào trên đường thì thuyết minh đó tự phát (đang phát thuyết minh thì giọng chỉ đường chỉ hiện chữ, không đọc chồng).
