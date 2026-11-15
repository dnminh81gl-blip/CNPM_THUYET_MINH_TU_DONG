# Cơ sở dữ liệu – Thuyết minh tự động đa ngôn ngữ

File chạy: [`ThuyetMinhTuDong-sqlserver.sql`](ThuyetMinhTuDong-sqlserver.sql) (SQL Server 2019+ / Express).
Cách chạy: mở SSMS → File → Open → chọn file → Execute (F5). Chạy lại nhiều lần được (tự xoá rồi tạo lại).

> Hiện các service vẫn lưu dữ liệu **trong bộ nhớ** (bản PoC). File này là thiết kế CSDL hoàn chỉnh để nối vào
> bằng Spring Data JPA ở bước sau; mỗi service chỉ đọc/ghi schema của mình.

## 1. Nguyên tắc: mỗi service sở hữu dữ liệu của mình (database-per-service)

| Schema | Service sở hữu | Bảng | Ghi bởi sự kiện / API |
|---|---|---|---|
| `content` | content-service | `ADMIN`, `LANGUAGE`, `POI`, `DEVICE`, `VISIT`, `LISTEN`, `OUTBOX_EVENT` | REST `/api/pois`, `/api/devices`; phát `content.published` |
| `narration` | narration-service | `NARRATION`, `PROCESSED_EVENT` | nhận `content.published`, phát `narration.created` |
| `translation` | translation-service | `TRANSLATION`, `PROCESSED_EVENT` | nhận `narration.created`, phát `translation.completed` |
| `tts` | tts-service | `AUDIO`, `PROCESSED_EVENT` | nhận `translation.completed`, phát `audio.ready` |
| — | notification-service | (không lưu) | chuyển tiếp sự kiện qua WebSocket |

- 4 schema đặt chung 1 database cho dễ chạy khi làm đồ án; khi triển khai thật mỗi schema tách thành 1 database
  riêng mà không phải sửa bảng nào.
- **Không có khoá ngoại giữa hai service.** `poi_id`, `version`, `lang` ở narration/translation/tts chỉ là giá trị
  lấy từ sự kiện RabbitMQ (xem `EVENTS.md`). Một service có thể đổi CSDL, chết hoặc khởi động lại mà không làm
  hỏng ràng buộc của service khác. Câu kiểm tra cuối file xác nhận điều này (0 khoá ngoại liên schema).
- **`PROCESSED_EVENT`** (narration, translation, tts): lưu `eventId` đã xử lý để chống xử lý trùng khi RabbitMQ
  giao lại một tin (thay cho `processedEventIds` đang nằm trong bộ nhớ).
- **`OUTBOX_EVENT`** (content): transactional outbox – sự kiện `content.published` được ghi cùng giao dịch với
  việc xuất bản POI, rồi một tiến trình gửi lên RabbitMQ và điền `sent_at`. Tránh trường hợp lưu POI xong nhưng
  gửi sự kiện thất bại (hoặc ngược lại).

## 2. Sơ đồ ERD

```mermaid
erDiagram
    %% ---------- schema content (content-service) ----------
    ADMIN ||--o{ POI : "cập nhật"
    LANGUAGE ||--o{ DEVICE : "ngôn ngữ chọn"
    LANGUAGE ||--o{ VISIT : ""
    LANGUAGE ||--o{ LISTEN : ""
    POI ||--o{ VISIT : "QR riêng (tuỳ chọn)"
    POI ||--o{ LISTEN : "được nghe"
    POI ||--o{ OUTBOX_EVENT : "sự kiện xuất bản"
    POI |o--o{ DEVICE : "điểm nghe gần nhất"
    DEVICE ||--o{ VISIT : "mở web"
    DEVICE ||--o{ LISTEN : "nghe"

    ADMIN {
        varchar id PK
        nvarchar name
        varchar email UK
        varchar password_hash
        varchar role
        bit locked
    }
    LANGUAGE {
        varchar code PK
        nvarchar name
        varchar tts_voice
        bit is_source
        bit enabled
    }
    POI {
        bigint id PK
        nvarchar name
        nvarchar category
        decimal lat
        decimal lng
        int radius
        tinyint priority
        nvarchar text
        int version
        varchar status
        int sort_order
        varchar updated_by FK
        datetime2 deleted_at
    }
    DEVICE {
        varchar device_id PK
        nvarchar os
        nvarchar browser
        nvarchar device_type
        varchar lang FK
        varchar first_src
        datetime2 first_seen
        datetime2 last_seen
        bigint last_poi_id FK
    }
    VISIT {
        bigint id PK
        varchar device_id FK
        varchar src
        bigint poi_id FK
        varchar lang FK
        datetime2 at
    }
    LISTEN {
        bigint id PK
        varchar device_id FK
        varchar kind
        bigint poi_id FK
        varchar lang FK
        varchar trigger_src
        datetime2 at
    }
    OUTBOX_EVENT {
        uniqueidentifier event_id PK
        varchar routing_key
        bigint poi_id FK
        nvarchar payload
        datetime2 sent_at
        int attempts
    }

    %% ---------- các service khác: không khoá ngoại sang content ----------
    NARRATION {
        bigint poi_id PK
        int version PK
        nvarchar script_vi
        uniqueidentifier source_event_id
    }
    TRANSLATION {
        bigint poi_id PK
        int version PK
        varchar lang PK
        nvarchar translated_text
        varchar engine
        uniqueidentifier source_event_id
    }
    AUDIO {
        bigint poi_id PK
        int version PK
        varchar lang PK
        varchar voice
        varchar engine
        nvarchar url
        nvarchar text
        uniqueidentifier source_event_id
    }
    PROCESSED_EVENT {
        uniqueidentifier event_id PK
        varchar routing_key
        datetime2 received_at
    }
```

`NARRATION`, `TRANSLATION`, `AUDIO` nối với nhau và với `POI` **qua sự kiện**, không qua khoá ngoại:

```
content.POI --content.published--> narration.NARRATION --narration.created--> translation.TRANSLATION
            --translation.completed--> tts.AUDIO --audio.ready--> notification-service --> web
```
Mỗi bảng phía sau giữ `source_event_id` = `eventId` của sự kiện đã tạo ra nó, nên truy vết được cả chuỗi.

## 3. Các quyết định thiết kế

| Vấn đề | Cách xử lý |
|---|---|
| Phiên bản nội dung | `POI.version` tăng mỗi lần sửa; `NARRATION`/`TRANSLATION`/`AUDIO` có khoá `(poi_id, version, ...)` nên giữ lịch sử từng phiên bản. |
| Xoá POI | **Xoá mềm** bằng `deleted_at`: `DELETE /api/pois/{id}` đặt thời điểm xoá, POI biến mất khỏi web nhưng thống kê lượt nghe cũ vẫn còn (không vướng khoá ngoại). |
| Du khách ẩn danh | Không có bảng tài khoản du khách. `DEVICE.device_id` là mã ngẫu nhiên trình duyệt tự tạo; không lưu tên, email, IP. |
| Lượt nghe tổng quan | `LISTEN.kind = 'overview'` và `poi_id` NULL; ràng buộc `CK_LISTEN_kind` bắt buộc hai cột khớp nhau. |
| Đa ngôn ngữ | Bảng `LANGUAGE` (chỉ một ngôn ngữ gốc nhờ unique index có điều kiện). Cột chữ dùng `NVARCHAR`, database dùng collation `Vietnamese_CI_AS`. |
| Toạ độ | `DECIMAL(9,6)` (độ chính xác ~0,1 m), kiểm tra miền giá trị vĩ độ / kinh độ. |
| Giờ | Lưu UTC (`SYSUTCDATETIME()`); view thống kê đổi sang giờ Việt Nam (+7). |
| TTS | Bản PoC: `engine = 'client-speech'` (trình duyệt đọc). Khi dùng TTS thật (`google-tts`, `azure-tts`) ràng buộc `CK_AUDIO_file` bắt buộc có `url` file mp3. |

## 4. Index và view thống kê

| Đối tượng | Phục vụ |
|---|---|
| `IX_POI_published` (có điều kiện) | `GET /api/pois` cho web du khách: điểm đã xuất bản, chưa xoá, theo thứ tự tham quan |
| `IX_DEVICE_last_seen` | đếm thiết bị "đang tham gia" (tín hiệu trong 2 phút) |
| `IX_VISIT_at`, `IX_VISIT_device` | thống kê lượt mở / quét QR theo ngày, theo thiết bị |
| `IX_LISTEN_poi_at`, `IX_LISTEN_at` | lượt nghe theo điểm, theo ngày |
| `IX_OUTBOX_pending` (có điều kiện) | tìm sự kiện chưa gửi |
| `V_POI_STATS` | lượt nghe, số thiết bị, lượt nghe theo vi/en/zh của từng điểm (trang Admin) |
| `V_DAILY_ACTIVITY` | lượt mở, thiết bị, lượt quét QR theo ngày (giờ VN) |
| `V_ACTIVE_DEVICE` | thiết bị đang tham gia và điểm đang nghe |

## 5. Dữ liệu mẫu và kiểm tra

- 6 điểm thuyết minh Dinh Độc Lập (đã xuất bản, v1), kèm bài thuyết minh, 3 bản dịch, 3 giọng đọc cho mỗi điểm –
  nội dung khớp đúng với những gì narration-service soạn (câu chào + nội dung + câu kết).
- 4 thiết bị, 5 lượt mở, 9 lượt nghe mẫu để view thống kê có số liệu.
- Cuối file có các câu kiểm tra: số bảng theo schema (13), **0 khoá ngoại liên schema**, mỗi điểm đủ 1 bài
  thuyết minh / 3 bản dịch / 3 giọng đọc, và kết quả các view.
