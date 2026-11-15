/* ============================================================================
   CSDL "Thuyết minh tự động đa ngôn ngữ" – SQL Server 2019+ (chạy được trên SQL Server Express)
   ----------------------------------------------------------------------------
   THIẾT KẾ THEO MICROSERVICE: MỖI SERVICE SỞ HỮU DỮ LIỆU CỦA MÌNH (database-per-service)
     [content]      content-service      ADMIN, LANGUAGE, POI, DEVICE, VISIT, LISTEN, OUTBOX_EVENT
     [narration]    narration-service    NARRATION, PROCESSED_EVENT
     [translation]  translation-service  TRANSLATION, PROCESSED_EVENT
     [tts]          tts-service          AUDIO, PROCESSED_EVENT
   (notification-service chỉ chuyển tiếp sự kiện qua WebSocket, không lưu dữ liệu.)
   - Ở bản này 4 schema nằm chung 1 database cho dễ chạy; khi triển khai thật mỗi schema
     tách thành 1 database riêng mà không phải sửa bảng nào.
   - KHÔNG có khoá ngoại giữa hai service khác nhau: poi_id / version / lang ở service sau
     chỉ là giá trị lấy từ sự kiện RabbitMQ (xem EVENTS.md). Ràng buộc dữ liệu giữa các
     service do luồng sự kiện đảm bảo, không do CSDL.
   - PROCESSED_EVENT: chống xử lý trùng một sự kiện (RabbitMQ có thể giao lại tin).
   - OUTBOX_EVENT: sự kiện chờ gửi lên RabbitMQ, ghi cùng giao dịch với dữ liệu (transactional outbox).
   Cách chạy: SSMS > File > Open > File... chọn file này > Execute (F5). Chạy lại nhiều lần được.
   Ghi chú: các service hiện vẫn lưu trong bộ nhớ (bản PoC); file này là thiết kế CSDL hoàn chỉnh
   để nối vào bằng Spring Data JPA ở bước sau. Sơ đồ ERD: docs/database/README.md
   ============================================================================ */
IF DB_ID(N'ThuyetMinhTuDong') IS NULL CREATE DATABASE ThuyetMinhTuDong COLLATE Vietnamese_CI_AS;
GO
USE ThuyetMinhTuDong;
GO

/* ---------- Xoá đối tượng cũ (thứ tự ngược với phụ thuộc) ---------- */
DROP VIEW  IF EXISTS [content].[V_POI_STATS], [content].[V_DAILY_ACTIVITY], [content].[V_ACTIVE_DEVICE];
DROP TABLE IF EXISTS [tts].[PROCESSED_EVENT], [tts].[AUDIO];
DROP TABLE IF EXISTS [translation].[PROCESSED_EVENT], [translation].[TRANSLATION];
DROP TABLE IF EXISTS [narration].[PROCESSED_EVENT], [narration].[NARRATION];
DROP TABLE IF EXISTS [content].[OUTBOX_EVENT], [content].[LISTEN], [content].[VISIT], [content].[DEVICE],
                     [content].[POI], [content].[LANGUAGE], [content].[ADMIN];
/* bảng của bản thiết kế cũ (1 schema chung) */
DROP TABLE IF EXISTS dbo.LISTEN, dbo.VISIT, dbo.DEVICE, dbo.AUDIO, dbo.[TRANSLATION], dbo.NARRATION, dbo.POI, dbo.[LANGUAGE], dbo.[ADMIN];
GO
IF SCHEMA_ID(N'content')     IS NULL EXEC(N'CREATE SCHEMA [content]');
IF SCHEMA_ID(N'narration')   IS NULL EXEC(N'CREATE SCHEMA [narration]');
IF SCHEMA_ID(N'translation') IS NULL EXEC(N'CREATE SCHEMA [translation]');
IF SCHEMA_ID(N'tts')         IS NULL EXEC(N'CREATE SCHEMA [tts]');
GO

/* =========================== [content] – content-service =========================== */

/* Quản trị viên (du khách KHÔNG có tài khoản) */
CREATE TABLE [content].[ADMIN] (
    id            VARCHAR(40)   NOT NULL CONSTRAINT PK_ADMIN PRIMARY KEY,
    name          NVARCHAR(100) NOT NULL,
    email         VARCHAR(120)  NOT NULL CONSTRAINT UQ_ADMIN_email UNIQUE,
    password_hash VARCHAR(128)  NOT NULL,              -- chỉ lưu mã băm (bcrypt/SHA-256), không lưu mật khẩu
    role          VARCHAR(20)   NOT NULL CONSTRAINT DF_ADMIN_role DEFAULT 'admin',
    locked        BIT           NOT NULL CONSTRAINT DF_ADMIN_locked DEFAULT 0,
    created_at    DATETIME2(0)  NOT NULL CONSTRAINT DF_ADMIN_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_ADMIN_role  CHECK (role IN ('admin', 'editor')),
    CONSTRAINT CK_ADMIN_email CHECK (email LIKE '%_@_%._%')
);

/* Ngôn ngữ thuyết minh hệ thống hỗ trợ */
CREATE TABLE [content].[LANGUAGE] (
    code      VARCHAR(5)   NOT NULL CONSTRAINT PK_LANGUAGE PRIMARY KEY,   -- vi / en / zh
    name      NVARCHAR(40) NOT NULL,
    tts_voice VARCHAR(10)  NOT NULL,                                     -- mã giọng đọc BCP-47
    is_source BIT          NOT NULL CONSTRAINT DF_LANGUAGE_src DEFAULT 0, -- ngôn ngữ gốc admin nhập
    enabled   BIT          NOT NULL CONSTRAINT DF_LANGUAGE_on DEFAULT 1
);
/* chỉ một ngôn ngữ gốc */
CREATE UNIQUE INDEX UX_LANGUAGE_source ON [content].[LANGUAGE](is_source) WHERE is_source = 1;

/* Điểm thuyết minh trong khu tham quan Dinh Độc Lập */
CREATE TABLE [content].[POI] (
    id         BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_POI PRIMARY KEY,
    name       NVARCHAR(120)  NOT NULL,
    category   NVARCHAR(60)   NULL,
    address    NVARCHAR(200)  NULL,
    lat        DECIMAL(9,6)   NOT NULL,
    lng        DECIMAL(9,6)   NOT NULL,
    radius     INT            NOT NULL CONSTRAINT DF_POI_radius DEFAULT 50,   -- bán kính geofence (mét)
    priority   TINYINT        NOT NULL CONSTRAINT DF_POI_priority DEFAULT 2,  -- 1 thấp .. 5 cao
    image      NVARCHAR(400)  NULL,
    [text]     NVARCHAR(4000) NOT NULL,                                       -- nội dung gốc tiếng Việt
    version    INT            NOT NULL CONSTRAINT DF_POI_version DEFAULT 1,
    status     VARCHAR(10)    NOT NULL CONSTRAINT DF_POI_status DEFAULT 'DRAFT',
    sort_order INT            NOT NULL CONSTRAINT DF_POI_sort DEFAULT 0,      -- thứ tự tham quan
    created_at DATETIME2(0)   NOT NULL CONSTRAINT DF_POI_created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(0)   NOT NULL CONSTRAINT DF_POI_updated DEFAULT SYSUTCDATETIME(),
    updated_by VARCHAR(40)    NULL CONSTRAINT FK_POI_ADMIN REFERENCES [content].[ADMIN](id),
    deleted_at DATETIME2(0)   NULL,   -- XOÁ MỀM: DELETE /api/pois/{id} đặt cột này, giữ lại thống kê lượt nghe
    CONSTRAINT CK_POI_lat      CHECK (lat BETWEEN -90 AND 90),
    CONSTRAINT CK_POI_lng      CHECK (lng BETWEEN -180 AND 180),
    CONSTRAINT CK_POI_radius   CHECK (radius BETWEEN 10 AND 300),
    CONSTRAINT CK_POI_priority CHECK (priority BETWEEN 1 AND 5),
    CONSTRAINT CK_POI_version  CHECK (version >= 1),
    CONSTRAINT CK_POI_status   CHECK (status IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT CK_POI_name     CHECK (LEN(LTRIM(RTRIM(name))) > 0),
    CONSTRAINT CK_POI_text     CHECK (LEN(LTRIM(RTRIM([text]))) > 0)
);
/* trang du khách: các điểm đã xuất bản, chưa xoá, theo thứ tự tham quan */
CREATE INDEX IX_POI_published ON [content].[POI](sort_order, id) INCLUDE (name, lat, lng, radius, priority)
    WHERE status = 'PUBLISHED' AND deleted_at IS NULL;

/* Thiết bị ẩn danh: deviceId do trình duyệt tự tạo; KHÔNG lưu tên, email, IP */
CREATE TABLE [content].[DEVICE] (
    device_id   VARCHAR(64)   NOT NULL CONSTRAINT PK_DEVICE PRIMARY KEY,
    os          NVARCHAR(30)  NOT NULL CONSTRAINT DF_DEVICE_os DEFAULT N'Khác',
    browser     NVARCHAR(30)  NOT NULL CONSTRAINT DF_DEVICE_browser DEFAULT N'Khác',
    device_type NVARCHAR(30)  NOT NULL CONSTRAINT DF_DEVICE_type DEFAULT N'Khác',
    lang        VARCHAR(5)    NULL CONSTRAINT FK_DEVICE_LANGUAGE REFERENCES [content].[LANGUAGE](code),
    first_src   VARCHAR(10)   NOT NULL CONSTRAINT DF_DEVICE_src DEFAULT 'web',
    first_seen  DATETIME2(0)  NOT NULL CONSTRAINT DF_DEVICE_first DEFAULT SYSUTCDATETIME(),
    last_seen   DATETIME2(0)  NOT NULL CONSTRAINT DF_DEVICE_last DEFAULT SYSUTCDATETIME(),  -- cập nhật bởi ping 30 giây
    last_poi_id BIGINT        NULL CONSTRAINT FK_DEVICE_POI REFERENCES [content].[POI](id), -- điểm nghe gần nhất
    CONSTRAINT CK_DEVICE_src  CHECK (first_src IN ('qr', 'web')),
    CONSTRAINT CK_DEVICE_time CHECK (last_seen >= first_seen)
);
/* "đang tham gia" = last_seen trong 2 phút gần nhất */
CREATE INDEX IX_DEVICE_last_seen ON [content].[DEVICE](last_seen DESC) INCLUDE (last_poi_id);

/* Lượt mở web / quét QR */
CREATE TABLE [content].[VISIT] (
    id        BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_VISIT PRIMARY KEY,
    device_id VARCHAR(64)  NOT NULL CONSTRAINT FK_VISIT_DEVICE REFERENCES [content].[DEVICE](device_id) ON DELETE CASCADE,
    src       VARCHAR(10)  NOT NULL,
    poi_id    BIGINT       NULL CONSTRAINT FK_VISIT_POI REFERENCES [content].[POI](id),     -- NULL = mã QR chung ở cổng
    lang      VARCHAR(5)   NULL CONSTRAINT FK_VISIT_LANGUAGE REFERENCES [content].[LANGUAGE](code),
    at        DATETIME2(0) NOT NULL CONSTRAINT DF_VISIT_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_VISIT_src CHECK (src IN ('qr', 'web'))
);
CREATE INDEX IX_VISIT_at     ON [content].[VISIT](at) INCLUDE (device_id, src);
CREATE INDEX IX_VISIT_device ON [content].[VISIT](device_id, at);

/* Lượt nghe thuyết minh: kind = 'poi' (nghe một điểm) hoặc 'overview' (phần giới thiệu tổng quan) */
CREATE TABLE [content].[LISTEN] (
    id        BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LISTEN PRIMARY KEY,
    device_id VARCHAR(64)  NOT NULL CONSTRAINT FK_LISTEN_DEVICE REFERENCES [content].[DEVICE](device_id) ON DELETE CASCADE,
    kind      VARCHAR(10)  NOT NULL CONSTRAINT DF_LISTEN_kind DEFAULT 'poi',
    poi_id    BIGINT       NULL CONSTRAINT FK_LISTEN_POI REFERENCES [content].[POI](id),
    lang      VARCHAR(5)   NOT NULL CONSTRAINT FK_LISTEN_LANGUAGE REFERENCES [content].[LANGUAGE](code),
    trigger_src VARCHAR(10) NOT NULL CONSTRAINT DF_LISTEN_trigger DEFAULT 'manual',  -- geofence tự phát hay du khách bấm
    at        DATETIME2(0) NOT NULL CONSTRAINT DF_LISTEN_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_LISTEN_kind    CHECK ((kind = 'poi' AND poi_id IS NOT NULL) OR (kind = 'overview' AND poi_id IS NULL)),
    CONSTRAINT CK_LISTEN_trigger CHECK (trigger_src IN ('geofence', 'manual', 'queue'))
);
CREATE INDEX IX_LISTEN_poi_at ON [content].[LISTEN](poi_id, at) INCLUDE (lang);
CREATE INDEX IX_LISTEN_at     ON [content].[LISTEN](at) INCLUDE (device_id, poi_id);

/* Transactional outbox: content.published ghi cùng giao dịch với POI, rồi mới gửi lên RabbitMQ */
CREATE TABLE [content].[OUTBOX_EVENT] (
    event_id    UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_OUTBOX PRIMARY KEY,
    routing_key VARCHAR(60)      NOT NULL,                  -- vd content.published
    poi_id      BIGINT           NULL CONSTRAINT FK_OUTBOX_POI REFERENCES [content].[POI](id),
    payload     NVARCHAR(MAX)    NOT NULL,                  -- JSON đúng hợp đồng EVENTS.md
    created_at  DATETIME2(3)     NOT NULL CONSTRAINT DF_OUTBOX_created DEFAULT SYSUTCDATETIME(),
    sent_at     DATETIME2(3)     NULL,                      -- NULL = chưa gửi
    attempts    INT              NOT NULL CONSTRAINT DF_OUTBOX_attempts DEFAULT 0,
    CONSTRAINT CK_OUTBOX_json CHECK (ISJSON(payload) = 1),
    CONSTRAINT CK_OUTBOX_rk   CHECK (routing_key LIKE '%_._%')
);
CREATE INDEX IX_OUTBOX_pending ON [content].[OUTBOX_EVENT](created_at) WHERE sent_at IS NULL;
GO

/* ========================= [narration] – narration-service ========================= */

/* Bài thuyết minh gốc tiếng Việt cho mỗi phiên bản nội dung (câu chào + nội dung + câu kết) */
CREATE TABLE [narration].[NARRATION] (
    poi_id          BIGINT           NOT NULL,   -- từ sự kiện content.published (không khoá ngoại sang [content])
    version         INT              NOT NULL,
    script_vi       NVARCHAR(4000)   NOT NULL,
    source_event_id UNIQUEIDENTIFIER NOT NULL,   -- eventId của content.published
    created_at      DATETIME2(0)     NOT NULL CONSTRAINT DF_NARRATION_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_NARRATION PRIMARY KEY (poi_id, version),
    CONSTRAINT CK_NARRATION_version CHECK (version >= 1),
    CONSTRAINT CK_NARRATION_script  CHECK (LEN(LTRIM(RTRIM(script_vi))) > 0)
);

CREATE TABLE [narration].[PROCESSED_EVENT] (
    event_id    UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_NARRATION_PROCESSED PRIMARY KEY,
    routing_key VARCHAR(60)      NOT NULL,
    received_at DATETIME2(3)     NOT NULL CONSTRAINT DF_NARRATION_PROCESSED DEFAULT SYSUTCDATETIME()
);
GO

/* ======================= [translation] – translation-service ======================= */

CREATE TABLE [translation].[TRANSLATION] (
    poi_id          BIGINT           NOT NULL,   -- từ sự kiện narration.created
    version         INT              NOT NULL,
    lang            VARCHAR(5)       NOT NULL,   -- mã ngôn ngữ đích (không khoá ngoại sang [content].LANGUAGE)
    source_lang     VARCHAR(5)       NOT NULL CONSTRAINT DF_TRANSLATION_src DEFAULT 'vi',
    translated_text NVARCHAR(4000)   NOT NULL,
    engine          VARCHAR(30)      NOT NULL,
    source_event_id UNIQUEIDENTIFIER NOT NULL,   -- eventId của narration.created
    translated_at   DATETIME2(0)     NOT NULL CONSTRAINT DF_TRANSLATION_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TRANSLATION PRIMARY KEY (poi_id, version, lang),
    CONSTRAINT CK_TRANSLATION_lang    CHECK (LEN(lang) BETWEEN 2 AND 5 AND lang = LOWER(lang)),
    CONSTRAINT CK_TRANSLATION_engine  CHECK (engine IN ('identity', 'mymemory_online', 'offline_dictionary', 'mixed')),
    CONSTRAINT CK_TRANSLATION_version CHECK (version >= 1)
);
/* GET /api/translations?poiId=&version= dùng khoá chính; index này để truy vết theo sự kiện */
CREATE INDEX IX_TRANSLATION_event ON [translation].[TRANSLATION](source_event_id);

CREATE TABLE [translation].[PROCESSED_EVENT] (
    event_id    UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TRANSLATION_PROCESSED PRIMARY KEY,
    routing_key VARCHAR(60)      NOT NULL,
    received_at DATETIME2(3)     NOT NULL CONSTRAINT DF_TRANSLATION_PROCESSED DEFAULT SYSUTCDATETIME()
);
GO

/* ================================ [tts] – tts-service =============================== */

/* Giọng đọc cho từng ngôn ngữ. Bản PoC: engine client-speech (trình duyệt tự đọc), url là đường dẫn dự kiến */
CREATE TABLE [tts].[AUDIO] (
    poi_id          BIGINT           NOT NULL,   -- từ sự kiện translation.completed
    version         INT              NOT NULL,
    lang            VARCHAR(5)       NOT NULL,
    voice           VARCHAR(10)      NOT NULL,   -- vd vi-VN
    engine          VARCHAR(30)      NOT NULL CONSTRAINT DF_AUDIO_engine DEFAULT 'client-speech',
    url             NVARCHAR(400)    NULL,
    [text]          NVARCHAR(4000)   NULL,       -- văn bản cần đọc (NULL nếu chưa có bản dịch)
    duration_sec    INT              NULL,       -- dùng khi sinh file mp3 thật
    source_event_id UNIQUEIDENTIFIER NOT NULL,   -- eventId của translation.completed
    created_at      DATETIME2(0)     NOT NULL CONSTRAINT DF_AUDIO_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_AUDIO PRIMARY KEY (poi_id, version, lang),
    CONSTRAINT CK_AUDIO_engine   CHECK (engine IN ('client-speech', 'google-tts', 'azure-tts')),
    CONSTRAINT CK_AUDIO_file     CHECK (engine = 'client-speech' OR url IS NOT NULL),  -- TTS thật phải có file
    CONSTRAINT CK_AUDIO_duration CHECK (duration_sec IS NULL OR duration_sec > 0)
);

CREATE TABLE [tts].[PROCESSED_EVENT] (
    event_id    UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TTS_PROCESSED PRIMARY KEY,
    routing_key VARCHAR(60)      NOT NULL,
    received_at DATETIME2(3)     NOT NULL CONSTRAINT DF_TTS_PROCESSED DEFAULT SYSUTCDATETIME()
);
GO

/* ============================ VIEW thống kê (trang Admin) ============================ */

/* Mỗi điểm: số lượt nghe, số thiết bị đã nghe, lượt nghe theo ngôn ngữ */
CREATE VIEW [content].[V_POI_STATS] AS
SELECT p.id, p.name, p.status, p.version,
       COUNT(l.id)                                     AS listens,
       COUNT(DISTINCT l.device_id)                     AS devices,
       SUM(CASE WHEN l.lang = 'vi' THEN 1 ELSE 0 END)  AS listens_vi,
       SUM(CASE WHEN l.lang = 'en' THEN 1 ELSE 0 END)  AS listens_en,
       SUM(CASE WHEN l.lang = 'zh' THEN 1 ELSE 0 END)  AS listens_zh,
       MAX(l.at)                                       AS last_listen_at
FROM [content].[POI] p
LEFT JOIN [content].[LISTEN] l ON l.poi_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.status, p.version;
GO

/* Theo ngày (giờ Việt Nam): số thiết bị, lượt mở, lượt quét QR */
CREATE VIEW [content].[V_DAILY_ACTIVITY] AS
SELECT CAST(DATEADD(HOUR, 7, v.at) AS DATE)       AS day_vn,
       COUNT(*)                                    AS visits,
       COUNT(DISTINCT v.device_id)                 AS devices,
       SUM(CASE WHEN v.src = 'qr' THEN 1 ELSE 0 END) AS qr_scans
FROM [content].[VISIT] v
GROUP BY CAST(DATEADD(HOUR, 7, v.at) AS DATE);
GO

/* Thiết bị đang tham gia (có tín hiệu trong 2 phút, khớp DeviceService.ACTIVE_WINDOW) */
CREATE VIEW [content].[V_ACTIVE_DEVICE] AS
SELECT d.device_id, d.os, d.browser, d.device_type, d.lang, d.last_seen, d.last_poi_id, p.name AS last_poi_name
FROM [content].[DEVICE] d
LEFT JOIN [content].[POI] p ON p.id = d.last_poi_id
WHERE d.last_seen >= DATEADD(MINUTE, -2, SYSUTCDATETIME());
GO
/* ================================== DỮ LIỆU MẪU ================================== */
INSERT INTO [content].[ADMIN] (id, name, email, password_hash, role) VALUES
 ('admin', N'Quản trị viên', 'admin@tmtd.vn', 'sha256:thay-bang-ma-bam-that', 'admin');

INSERT INTO [content].[LANGUAGE] (code, name, tts_voice, is_source) VALUES
 ('vi', N'Tiếng Việt', 'vi-VN', 1), ('en', N'English', 'en-US', 0), ('zh', N'中文', 'zh-CN', 0);

SET IDENTITY_INSERT [content].[POI] ON;
INSERT INTO [content].[POI] (id, name, category, address, lat, lng, radius, priority, image, [text], version, status, sort_order, updated_by) VALUES
 (1, N'Cổng chính và xe tăng', N'Khuôn viên', N'Cổng chính phía đường Lê Duẩn', 10.7779, 106.6964, 30, 3, N'Tank_Remnant_in_the_Independence_Palace.jpg', N'Bạn đang đứng ở cổng chính Dinh Độc Lập. Trưa ngày 30 tháng 4 năm 1975, xe tăng 390 húc đổ cánh cổng này, đánh dấu thời khắc kết thúc chiến tranh và thống nhất đất nước. Hai chiếc xe tăng trưng bày trong khuôn viên gợi nhớ xe tăng 843 và 390 đã tiến vào Dinh hôm đó.', 1, 'PUBLISHED', 1, 'admin'),
 (2, N'Mặt tiền và kiến trúc', N'Khuôn viên', N'Bãi cỏ trước mặt tiền Dinh', 10.77745, 106.69585, 30, 3, N'20190923_Independence_Palace-10.jpg', N'Dinh Độc Lập do kiến trúc sư Ngô Viết Thụ thiết kế, khởi công năm 1962 và khánh thành ngày 31 tháng 10 năm 1966, trên nền Dinh Norodom cũ thời Pháp. Mặt tiền nổi bật với những hàng rèm hoa đá mô phỏng đốt trúc, vừa che nắng vừa mang nét kiến trúc truyền thống Á Đông.', 1, 'PUBLISHED', 2, 'admin'),
 (3, N'Phòng Trình Quốc thư', N'Bên trong Dinh', N'Bên trong Dinh', 10.77712, 106.69548, 15, 2, N'img/places/poi-3.jpg', N'Đây là phòng Trình Quốc thư, nơi các đại sứ nước ngoài trình thư uỷ nhiệm. Điểm nhấn của căn phòng là bức tranh sơn mài lớn Bình Ngô Đại Cáo gồm 40 tấm ghép lại, của hoạ sĩ Nguyễn Văn Minh.', 1, 'PUBLISHED', 3, 'admin'),
 (4, N'Phòng họp Nội các', N'Bên trong Dinh', N'Bên trong Dinh', 10.77695, 106.69528, 15, 2, N'img/places/poi-4.jpg', N'Phòng họp Nội các là nơi Tổng thống họp với các bộ trưởng. Căn phòng vẫn giữ bàn họp dài và hàng ghế như thời kỳ trước năm 1975, giúp du khách hình dung cách bộ máy chính quyền làm việc tại đây.', 1, 'PUBLISHED', 4, 'admin'),
 (5, N'Sân thượng và trực thăng', N'Sân thượng', N'Sân thượng', 10.7768, 106.69512, 15, 2, N'img/places/poi-5.jpg', N'Trên sân thượng có bãi đáp trực thăng, nơi trưng bày một chiếc trực thăng UH-1. Sáng ngày 8 tháng 4 năm 1975, phi công Nguyễn Thành Trung lái máy bay F-5E ném bom Dinh Độc Lập rồi hạ cánh an toàn ở vùng giải phóng Phước Long.', 1, 'PUBLISHED', 5, 'admin'),
 (6, N'Tầng hầm chỉ huy', N'Tầng hầm', N'Tầng hầm', 10.77666, 106.69496, 15, 3, N'img/places/poi-6.jpg', N'Tầng hầm là hệ thống hầm chỉ huy kiên cố, được xây để chịu được bom. Bên trong có trung tâm chỉ huy, các thiết bị thông tin liên lạc và phòng bản đồ tác chiến, nhiều bản đồ vẫn còn giữ nguyên dấu bút chì đánh dấu.', 1, 'PUBLISHED', 6, 'admin');
SET IDENTITY_INSERT [content].[POI] OFF;
GO

/* sự kiện content.published của lần xuất bản đầu (đã gửi) */
INSERT INTO [content].[OUTBOX_EVENT] (event_id, routing_key, poi_id, payload, sent_at, attempts) VALUES
 ('10000000-0000-4000-8000-000000000001', 'content.published', 1, N'{"eventId": "10000000-0000-4000-8000-000000000001", "poiId": 1, "version": 1, "langs": ["vi", "en", "zh"], "publishedAt": "2026-11-01T02:00:00Z", "name": "Cổng chính và xe tăng", "text": "Bạn đang đứng ở cổng chính Dinh Độc Lập. Trưa ngày 30 tháng 4 năm 1975, xe tăng 390 húc đổ cánh cổng này, đánh dấu thời khắc kết thúc chiến tranh và thống nhất đất nước. Hai chiếc xe tăng trưng bày trong khuôn viên gợi nhớ xe tăng 843 và 390 đã tiến vào Dinh hôm đó."}', '2026-11-01T02:00:01', 1),
 ('10000000-0000-4000-8000-000000000002', 'content.published', 2, N'{"eventId": "10000000-0000-4000-8000-000000000002", "poiId": 2, "version": 1, "langs": ["vi", "en", "zh"], "publishedAt": "2026-11-01T02:00:00Z", "name": "Mặt tiền và kiến trúc", "text": "Dinh Độc Lập do kiến trúc sư Ngô Viết Thụ thiết kế, khởi công năm 1962 và khánh thành ngày 31 tháng 10 năm 1966, trên nền Dinh Norodom cũ thời Pháp. Mặt tiền nổi bật với những hàng rèm hoa đá mô phỏng đốt trúc, vừa che nắng vừa mang nét kiến trúc truyền thống Á Đông."}', '2026-11-01T02:00:01', 1),
 ('10000000-0000-4000-8000-000000000003', 'content.published', 3, N'{"eventId": "10000000-0000-4000-8000-000000000003", "poiId": 3, "version": 1, "langs": ["vi", "en", "zh"], "publishedAt": "2026-11-01T02:00:00Z", "name": "Phòng Trình Quốc thư", "text": "Đây là phòng Trình Quốc thư, nơi các đại sứ nước ngoài trình thư uỷ nhiệm. Điểm nhấn của căn phòng là bức tranh sơn mài lớn Bình Ngô Đại Cáo gồm 40 tấm ghép lại, của hoạ sĩ Nguyễn Văn Minh."}', '2026-11-01T02:00:01', 1),
 ('10000000-0000-4000-8000-000000000004', 'content.published', 4, N'{"eventId": "10000000-0000-4000-8000-000000000004", "poiId": 4, "version": 1, "langs": ["vi", "en", "zh"], "publishedAt": "2026-11-01T02:00:00Z", "name": "Phòng họp Nội các", "text": "Phòng họp Nội các là nơi Tổng thống họp với các bộ trưởng. Căn phòng vẫn giữ bàn họp dài và hàng ghế như thời kỳ trước năm 1975, giúp du khách hình dung cách bộ máy chính quyền làm việc tại đây."}', '2026-11-01T02:00:01', 1),
 ('10000000-0000-4000-8000-000000000005', 'content.published', 5, N'{"eventId": "10000000-0000-4000-8000-000000000005", "poiId": 5, "version": 1, "langs": ["vi", "en", "zh"], "publishedAt": "2026-11-01T02:00:00Z", "name": "Sân thượng và trực thăng", "text": "Trên sân thượng có bãi đáp trực thăng, nơi trưng bày một chiếc trực thăng UH-1. Sáng ngày 8 tháng 4 năm 1975, phi công Nguyễn Thành Trung lái máy bay F-5E ném bom Dinh Độc Lập rồi hạ cánh an toàn ở vùng giải phóng Phước Long."}', '2026-11-01T02:00:01', 1),
 ('10000000-0000-4000-8000-000000000006', 'content.published', 6, N'{"eventId": "10000000-0000-4000-8000-000000000006", "poiId": 6, "version": 1, "langs": ["vi", "en", "zh"], "publishedAt": "2026-11-01T02:00:00Z", "name": "Tầng hầm chỉ huy", "text": "Tầng hầm là hệ thống hầm chỉ huy kiên cố, được xây để chịu được bom. Bên trong có trung tâm chỉ huy, các thiết bị thông tin liên lạc và phòng bản đồ tác chiến, nhiều bản đồ vẫn còn giữ nguyên dấu bút chì đánh dấu."}', '2026-11-01T02:00:01', 1);
GO

/* narration-service: bài thuyết minh v1 (đúng như NarrationComposer soạn) */
INSERT INTO [narration].[NARRATION] (poi_id, version, script_vi, source_event_id) VALUES
 (1, 1, N'Chào mừng bạn đến với Cổng chính và xe tăng. Bạn đang đứng ở cổng chính Dinh Độc Lập. Trưa ngày 30 tháng 4 năm 1975, xe tăng 390 húc đổ cánh cổng này, đánh dấu thời khắc kết thúc chiến tranh và thống nhất đất nước. Hai chiếc xe tăng trưng bày trong khuôn viên gợi nhớ xe tăng 843 và 390 đã tiến vào Dinh hôm đó. Chúc bạn có chuyến tham quan thú vị.', '10000000-0000-4000-8000-000000000001'),
 (2, 1, N'Chào mừng bạn đến với Mặt tiền và kiến trúc. Dinh Độc Lập do kiến trúc sư Ngô Viết Thụ thiết kế, khởi công năm 1962 và khánh thành ngày 31 tháng 10 năm 1966, trên nền Dinh Norodom cũ thời Pháp. Mặt tiền nổi bật với những hàng rèm hoa đá mô phỏng đốt trúc, vừa che nắng vừa mang nét kiến trúc truyền thống Á Đông. Chúc bạn có chuyến tham quan thú vị.', '10000000-0000-4000-8000-000000000002'),
 (3, 1, N'Chào mừng bạn đến với Phòng Trình Quốc thư. Đây là phòng Trình Quốc thư, nơi các đại sứ nước ngoài trình thư uỷ nhiệm. Điểm nhấn của căn phòng là bức tranh sơn mài lớn Bình Ngô Đại Cáo gồm 40 tấm ghép lại, của hoạ sĩ Nguyễn Văn Minh. Chúc bạn có chuyến tham quan thú vị.', '10000000-0000-4000-8000-000000000003'),
 (4, 1, N'Chào mừng bạn đến với Phòng họp Nội các. Phòng họp Nội các là nơi Tổng thống họp với các bộ trưởng. Căn phòng vẫn giữ bàn họp dài và hàng ghế như thời kỳ trước năm 1975, giúp du khách hình dung cách bộ máy chính quyền làm việc tại đây. Chúc bạn có chuyến tham quan thú vị.', '10000000-0000-4000-8000-000000000004'),
 (5, 1, N'Chào mừng bạn đến với Sân thượng và trực thăng. Trên sân thượng có bãi đáp trực thăng, nơi trưng bày một chiếc trực thăng UH-1. Sáng ngày 8 tháng 4 năm 1975, phi công Nguyễn Thành Trung lái máy bay F-5E ném bom Dinh Độc Lập rồi hạ cánh an toàn ở vùng giải phóng Phước Long. Chúc bạn có chuyến tham quan thú vị.', '10000000-0000-4000-8000-000000000005'),
 (6, 1, N'Chào mừng bạn đến với Tầng hầm chỉ huy. Tầng hầm là hệ thống hầm chỉ huy kiên cố, được xây để chịu được bom. Bên trong có trung tâm chỉ huy, các thiết bị thông tin liên lạc và phòng bản đồ tác chiến, nhiều bản đồ vẫn còn giữ nguyên dấu bút chì đánh dấu. Chúc bạn có chuyến tham quan thú vị.', '10000000-0000-4000-8000-000000000006');
INSERT INTO [narration].[PROCESSED_EVENT] (event_id, routing_key) VALUES
 ('10000000-0000-4000-8000-000000000001', 'content.published'),
 ('10000000-0000-4000-8000-000000000002', 'content.published'),
 ('10000000-0000-4000-8000-000000000003', 'content.published'),
 ('10000000-0000-4000-8000-000000000004', 'content.published'),
 ('10000000-0000-4000-8000-000000000005', 'content.published'),
 ('10000000-0000-4000-8000-000000000006', 'content.published');
GO

/* translation-service: bản dịch của bài thuyết minh (vi giữ nguyên = identity) */
INSERT INTO [translation].[TRANSLATION] (poi_id, version, lang, translated_text, engine, source_event_id) VALUES
 (1, 1, 'vi', N'Chào mừng bạn đến với Cổng chính và xe tăng. Bạn đang đứng ở cổng chính Dinh Độc Lập. Trưa ngày 30 tháng 4 năm 1975, xe tăng 390 húc đổ cánh cổng này, đánh dấu thời khắc kết thúc chiến tranh và thống nhất đất nước. Hai chiếc xe tăng trưng bày trong khuôn viên gợi nhớ xe tăng 843 và 390 đã tiến vào Dinh hôm đó. Chúc bạn có chuyến tham quan thú vị.', 'identity', '20000000-0000-4000-8000-000000000001'),
 (1, 1, 'en', N'Welcome to Main Gate and Tanks. You are at the main gate of Independence Palace. Around noon on 30 April 1975, tank 390 crashed through this gate, marking the end of the war and the reunification of Vietnam. The two tanks displayed on the grounds recall tanks 843 and 390, which entered the palace that day. Have a pleasant visit.', 'mymemory_online', '20000000-0000-4000-8000-000000000001'),
 (1, 1, 'zh', N'欢迎来到正门与坦克。您现在位于独立宫正门。1975年4月30日中午，390号坦克撞开了这道大门，标志着战争结束、国家统一。园内展出的两辆坦克让人回想起当天开进独立宫的843号和390号坦克。祝您参观愉快。', 'mymemory_online', '20000000-0000-4000-8000-000000000001'),
 (2, 1, 'vi', N'Chào mừng bạn đến với Mặt tiền và kiến trúc. Dinh Độc Lập do kiến trúc sư Ngô Viết Thụ thiết kế, khởi công năm 1962 và khánh thành ngày 31 tháng 10 năm 1966, trên nền Dinh Norodom cũ thời Pháp. Mặt tiền nổi bật với những hàng rèm hoa đá mô phỏng đốt trúc, vừa che nắng vừa mang nét kiến trúc truyền thống Á Đông. Chúc bạn có chuyến tham quan thú vị.', 'identity', '20000000-0000-4000-8000-000000000002'),
 (2, 1, 'en', N'Welcome to Facade and Architecture. Independence Palace was designed by architect Ngo Viet Thu. Construction began in 1962 and it was inaugurated on 31 October 1966, on the site of the former French-era Norodom Palace. Its facade is known for rows of stone screens shaped like bamboo segments, which give shade and echo traditional East Asian architecture. Have a pleasant visit.', 'mymemory_online', '20000000-0000-4000-8000-000000000002'),
 (2, 1, 'zh', N'欢迎来到正立面与建筑。独立宫由建筑师吴越树设计，1962年动工，1966年10月31日落成，原址为法属时期的诺罗敦宫。正面以仿竹节造型的石质花帘著称，既能遮阳，又体现了东方传统建筑风格。祝您参观愉快。', 'mymemory_online', '20000000-0000-4000-8000-000000000002'),
 (3, 1, 'vi', N'Chào mừng bạn đến với Phòng Trình Quốc thư. Đây là phòng Trình Quốc thư, nơi các đại sứ nước ngoài trình thư uỷ nhiệm. Điểm nhấn của căn phòng là bức tranh sơn mài lớn Bình Ngô Đại Cáo gồm 40 tấm ghép lại, của hoạ sĩ Nguyễn Văn Minh. Chúc bạn có chuyến tham quan thú vị.', 'identity', '20000000-0000-4000-8000-000000000003'),
 (3, 1, 'en', N'Welcome to Credentials Room. This is the Credentials Room, where foreign ambassadors presented their letters of credence. Its highlight is the large lacquer painting Binh Ngo Dai Cao, the Great Proclamation of Victory over the Ming, made of 40 panels by artist Nguyen Van Minh. Have a pleasant visit.', 'mymemory_online', '20000000-0000-4000-8000-000000000003'),
 (3, 1, 'zh', N'欢迎来到国书递交厅。这里是国书递交厅，外国大使在此递交国书。厅内最引人注目的是画家阮文明创作的大型漆画《平吴大诰》，由40块画板拼接而成。祝您参观愉快。', 'mymemory_online', '20000000-0000-4000-8000-000000000003'),
 (4, 1, 'vi', N'Chào mừng bạn đến với Phòng họp Nội các. Phòng họp Nội các là nơi Tổng thống họp với các bộ trưởng. Căn phòng vẫn giữ bàn họp dài và hàng ghế như thời kỳ trước năm 1975, giúp du khách hình dung cách bộ máy chính quyền làm việc tại đây. Chúc bạn có chuyến tham quan thú vị.', 'identity', '20000000-0000-4000-8000-000000000004'),
 (4, 1, 'en', N'Welcome to Cabinet Room. The Cabinet Room is where the president met with his ministers. The long meeting table and rows of chairs remain as they were before 1975, helping visitors picture how the government worked here. Have a pleasant visit.', 'mymemory_online', '20000000-0000-4000-8000-000000000004'),
 (4, 1, 'zh', N'欢迎来到内阁会议室。内阁会议室是总统与各部部长开会的地方。长会议桌和成排的座椅仍保持1975年以前的原貌，帮助游客了解当时政府在此办公的情景。祝您参观愉快。', 'mymemory_online', '20000000-0000-4000-8000-000000000004'),
 (5, 1, 'vi', N'Chào mừng bạn đến với Sân thượng và trực thăng. Trên sân thượng có bãi đáp trực thăng, nơi trưng bày một chiếc trực thăng UH-1. Sáng ngày 8 tháng 4 năm 1975, phi công Nguyễn Thành Trung lái máy bay F-5E ném bom Dinh Độc Lập rồi hạ cánh an toàn ở vùng giải phóng Phước Long. Chúc bạn có chuyến tham quan thú vị.', 'identity', '20000000-0000-4000-8000-000000000005'),
 (5, 1, 'en', N'Welcome to Rooftop and Helicopter. The rooftop has a helipad, where a UH-1 helicopter is on display. On the morning of 8 April 1975, pilot Nguyen Thanh Trung bombed the palace from an F-5E jet and then landed safely in the liberated area of Phuoc Long. Have a pleasant visit.', 'mymemory_online', '20000000-0000-4000-8000-000000000005'),
 (5, 1, 'zh', N'欢迎来到屋顶与直升机。屋顶设有直升机停机坪，这里展出一架UH-1直升机。1975年4月8日上午，飞行员阮成忠驾驶F-5E战机轰炸独立宫，随后安全降落在已解放的福隆地区。祝您参观愉快。', 'mymemory_online', '20000000-0000-4000-8000-000000000005'),
 (6, 1, 'vi', N'Chào mừng bạn đến với Tầng hầm chỉ huy. Tầng hầm là hệ thống hầm chỉ huy kiên cố, được xây để chịu được bom. Bên trong có trung tâm chỉ huy, các thiết bị thông tin liên lạc và phòng bản đồ tác chiến, nhiều bản đồ vẫn còn giữ nguyên dấu bút chì đánh dấu. Chúc bạn có chuyến tham quan thú vị.', 'identity', '20000000-0000-4000-8000-000000000006'),
 (6, 1, 'en', N'Welcome to Command Bunker. The basement is a reinforced command bunker built to withstand bombing. It contains a command centre, communications equipment and a war map room, where many maps still carry their original pencil markings. Have a pleasant visit.', 'mymemory_online', '20000000-0000-4000-8000-000000000006'),
 (6, 1, 'zh', N'欢迎来到地下指挥所。地下室是一座坚固的指挥地堡，可抵御轰炸。里面有指挥中心、通讯设备和作战地图室，许多地图上仍保留着当年的铅笔标记。祝您参观愉快。', 'mymemory_online', '20000000-0000-4000-8000-000000000006');
INSERT INTO [translation].[PROCESSED_EVENT] (event_id, routing_key) VALUES
 ('20000000-0000-4000-8000-000000000001', 'narration.created'),
 ('20000000-0000-4000-8000-000000000002', 'narration.created'),
 ('20000000-0000-4000-8000-000000000003', 'narration.created'),
 ('20000000-0000-4000-8000-000000000004', 'narration.created'),
 ('20000000-0000-4000-8000-000000000005', 'narration.created'),
 ('20000000-0000-4000-8000-000000000006', 'narration.created');
GO

/* tts-service: giọng đọc (trình duyệt tự đọc bằng Web Speech API) */
INSERT INTO [tts].[AUDIO] (poi_id, version, lang, voice, engine, url, [text], source_event_id) VALUES
 (1, 1, 'vi', 'vi-VN', 'client-speech', N'/audio/poi-1/v1/vi.mp3', N'Chào mừng bạn đến với Cổng chính và xe tăng. Bạn đang đứng ở cổng chính Dinh Độc Lập. Trưa ngày 30 tháng 4 năm 1975, xe tăng 390 húc đổ cánh cổng này, đánh dấu thời khắc kết thúc chiến tranh và thống nhất đất nước. Hai chiếc xe tăng trưng bày trong khuôn viên gợi nhớ xe tăng 843 và 390 đã tiến vào Dinh hôm đó. Chúc bạn có chuyến tham quan thú vị.', '30000000-0000-4000-8000-000000000001'),
 (1, 1, 'en', 'en-US', 'client-speech', N'/audio/poi-1/v1/en.mp3', N'Welcome to Main Gate and Tanks. You are at the main gate of Independence Palace. Around noon on 30 April 1975, tank 390 crashed through this gate, marking the end of the war and the reunification of Vietnam. The two tanks displayed on the grounds recall tanks 843 and 390, which entered the palace that day. Have a pleasant visit.', '30000000-0000-4000-8000-000000000001'),
 (1, 1, 'zh', 'zh-CN', 'client-speech', N'/audio/poi-1/v1/zh.mp3', N'欢迎来到正门与坦克。您现在位于独立宫正门。1975年4月30日中午，390号坦克撞开了这道大门，标志着战争结束、国家统一。园内展出的两辆坦克让人回想起当天开进独立宫的843号和390号坦克。祝您参观愉快。', '30000000-0000-4000-8000-000000000001'),
 (2, 1, 'vi', 'vi-VN', 'client-speech', N'/audio/poi-2/v1/vi.mp3', N'Chào mừng bạn đến với Mặt tiền và kiến trúc. Dinh Độc Lập do kiến trúc sư Ngô Viết Thụ thiết kế, khởi công năm 1962 và khánh thành ngày 31 tháng 10 năm 1966, trên nền Dinh Norodom cũ thời Pháp. Mặt tiền nổi bật với những hàng rèm hoa đá mô phỏng đốt trúc, vừa che nắng vừa mang nét kiến trúc truyền thống Á Đông. Chúc bạn có chuyến tham quan thú vị.', '30000000-0000-4000-8000-000000000002'),
 (2, 1, 'en', 'en-US', 'client-speech', N'/audio/poi-2/v1/en.mp3', N'Welcome to Facade and Architecture. Independence Palace was designed by architect Ngo Viet Thu. Construction began in 1962 and it was inaugurated on 31 October 1966, on the site of the former French-era Norodom Palace. Its facade is known for rows of stone screens shaped like bamboo segments, which give shade and echo traditional East Asian architecture. Have a pleasant visit.', '30000000-0000-4000-8000-000000000002'),
 (2, 1, 'zh', 'zh-CN', 'client-speech', N'/audio/poi-2/v1/zh.mp3', N'欢迎来到正立面与建筑。独立宫由建筑师吴越树设计，1962年动工，1966年10月31日落成，原址为法属时期的诺罗敦宫。正面以仿竹节造型的石质花帘著称，既能遮阳，又体现了东方传统建筑风格。祝您参观愉快。', '30000000-0000-4000-8000-000000000002'),
 (3, 1, 'vi', 'vi-VN', 'client-speech', N'/audio/poi-3/v1/vi.mp3', N'Chào mừng bạn đến với Phòng Trình Quốc thư. Đây là phòng Trình Quốc thư, nơi các đại sứ nước ngoài trình thư uỷ nhiệm. Điểm nhấn của căn phòng là bức tranh sơn mài lớn Bình Ngô Đại Cáo gồm 40 tấm ghép lại, của hoạ sĩ Nguyễn Văn Minh. Chúc bạn có chuyến tham quan thú vị.', '30000000-0000-4000-8000-000000000003'),
 (3, 1, 'en', 'en-US', 'client-speech', N'/audio/poi-3/v1/en.mp3', N'Welcome to Credentials Room. This is the Credentials Room, where foreign ambassadors presented their letters of credence. Its highlight is the large lacquer painting Binh Ngo Dai Cao, the Great Proclamation of Victory over the Ming, made of 40 panels by artist Nguyen Van Minh. Have a pleasant visit.', '30000000-0000-4000-8000-000000000003'),
 (3, 1, 'zh', 'zh-CN', 'client-speech', N'/audio/poi-3/v1/zh.mp3', N'欢迎来到国书递交厅。这里是国书递交厅，外国大使在此递交国书。厅内最引人注目的是画家阮文明创作的大型漆画《平吴大诰》，由40块画板拼接而成。祝您参观愉快。', '30000000-0000-4000-8000-000000000003'),
 (4, 1, 'vi', 'vi-VN', 'client-speech', N'/audio/poi-4/v1/vi.mp3', N'Chào mừng bạn đến với Phòng họp Nội các. Phòng họp Nội các là nơi Tổng thống họp với các bộ trưởng. Căn phòng vẫn giữ bàn họp dài và hàng ghế như thời kỳ trước năm 1975, giúp du khách hình dung cách bộ máy chính quyền làm việc tại đây. Chúc bạn có chuyến tham quan thú vị.', '30000000-0000-4000-8000-000000000004'),
 (4, 1, 'en', 'en-US', 'client-speech', N'/audio/poi-4/v1/en.mp3', N'Welcome to Cabinet Room. The Cabinet Room is where the president met with his ministers. The long meeting table and rows of chairs remain as they were before 1975, helping visitors picture how the government worked here. Have a pleasant visit.', '30000000-0000-4000-8000-000000000004'),
 (4, 1, 'zh', 'zh-CN', 'client-speech', N'/audio/poi-4/v1/zh.mp3', N'欢迎来到内阁会议室。内阁会议室是总统与各部部长开会的地方。长会议桌和成排的座椅仍保持1975年以前的原貌，帮助游客了解当时政府在此办公的情景。祝您参观愉快。', '30000000-0000-4000-8000-000000000004'),
 (5, 1, 'vi', 'vi-VN', 'client-speech', N'/audio/poi-5/v1/vi.mp3', N'Chào mừng bạn đến với Sân thượng và trực thăng. Trên sân thượng có bãi đáp trực thăng, nơi trưng bày một chiếc trực thăng UH-1. Sáng ngày 8 tháng 4 năm 1975, phi công Nguyễn Thành Trung lái máy bay F-5E ném bom Dinh Độc Lập rồi hạ cánh an toàn ở vùng giải phóng Phước Long. Chúc bạn có chuyến tham quan thú vị.', '30000000-0000-4000-8000-000000000005'),
 (5, 1, 'en', 'en-US', 'client-speech', N'/audio/poi-5/v1/en.mp3', N'Welcome to Rooftop and Helicopter. The rooftop has a helipad, where a UH-1 helicopter is on display. On the morning of 8 April 1975, pilot Nguyen Thanh Trung bombed the palace from an F-5E jet and then landed safely in the liberated area of Phuoc Long. Have a pleasant visit.', '30000000-0000-4000-8000-000000000005'),
 (5, 1, 'zh', 'zh-CN', 'client-speech', N'/audio/poi-5/v1/zh.mp3', N'欢迎来到屋顶与直升机。屋顶设有直升机停机坪，这里展出一架UH-1直升机。1975年4月8日上午，飞行员阮成忠驾驶F-5E战机轰炸独立宫，随后安全降落在已解放的福隆地区。祝您参观愉快。', '30000000-0000-4000-8000-000000000005'),
 (6, 1, 'vi', 'vi-VN', 'client-speech', N'/audio/poi-6/v1/vi.mp3', N'Chào mừng bạn đến với Tầng hầm chỉ huy. Tầng hầm là hệ thống hầm chỉ huy kiên cố, được xây để chịu được bom. Bên trong có trung tâm chỉ huy, các thiết bị thông tin liên lạc và phòng bản đồ tác chiến, nhiều bản đồ vẫn còn giữ nguyên dấu bút chì đánh dấu. Chúc bạn có chuyến tham quan thú vị.', '30000000-0000-4000-8000-000000000006'),
 (6, 1, 'en', 'en-US', 'client-speech', N'/audio/poi-6/v1/en.mp3', N'Welcome to Command Bunker. The basement is a reinforced command bunker built to withstand bombing. It contains a command centre, communications equipment and a war map room, where many maps still carry their original pencil markings. Have a pleasant visit.', '30000000-0000-4000-8000-000000000006'),
 (6, 1, 'zh', 'zh-CN', 'client-speech', N'/audio/poi-6/v1/zh.mp3', N'欢迎来到地下指挥所。地下室是一座坚固的指挥地堡，可抵御轰炸。里面有指挥中心、通讯设备和作战地图室，许多地图上仍保留着当年的铅笔标记。祝您参观愉快。', '30000000-0000-4000-8000-000000000006');
INSERT INTO [tts].[PROCESSED_EVENT] (event_id, routing_key) VALUES
 ('30000000-0000-4000-8000-000000000001', 'translation.completed'),
 ('30000000-0000-4000-8000-000000000002', 'translation.completed'),
 ('30000000-0000-4000-8000-000000000003', 'translation.completed'),
 ('30000000-0000-4000-8000-000000000004', 'translation.completed'),
 ('30000000-0000-4000-8000-000000000005', 'translation.completed'),
 ('30000000-0000-4000-8000-000000000006', 'translation.completed');
GO

/* thiết bị, lượt mở, lượt nghe mẫu (thời gian UTC) */
INSERT INTO [content].[DEVICE] (device_id, os, browser, device_type, lang, first_src, first_seen, last_seen, last_poi_id) VALUES
 ('3f2a9c1e-7b4d-4e8a-9c21-5d6f0a1b2c3d', N'iOS',     N'Safari', N'Điện thoại',     'en', 'qr',  '2026-11-10T02:00:00', '2026-11-10T02:25:00', 3),
 ('8b1d4e2f-0c3a-4f7b-a6d5-2e9c1b7a4f60', N'Android', N'Chrome', N'Điện thoại',     'vi', 'qr',  '2026-11-10T03:10:00', '2026-11-11T04:05:00', 2),
 ('c47e0b9a-2d51-4f3e-8a6c-9e1d7b2f5a08', N'Android', N'Zalo',   N'Điện thoại',     'zh', 'qr',  '2026-11-11T01:30:00', '2026-11-11T01:52:00', 6),
 ('e9a13f6d-5c82-4b07-9d4e-1f6a8c3b7e21', N'Windows', N'Edge',   N'Máy tính',       'vi', 'web', '2026-11-11T08:00:00', '2026-11-11T08:03:00', NULL);

INSERT INTO [content].[VISIT] (device_id, src, poi_id, lang, at) VALUES
 ('3f2a9c1e-7b4d-4e8a-9c21-5d6f0a1b2c3d', 'qr',  NULL, 'en', '2026-11-10T02:00:00'),
 ('8b1d4e2f-0c3a-4f7b-a6d5-2e9c1b7a4f60', 'qr',  NULL, 'vi', '2026-11-10T03:10:00'),
 ('8b1d4e2f-0c3a-4f7b-a6d5-2e9c1b7a4f60', 'web', NULL, 'vi', '2026-11-11T04:00:00'),
 ('c47e0b9a-2d51-4f3e-8a6c-9e1d7b2f5a08', 'qr',  NULL, 'zh', '2026-11-11T01:30:00'),
 ('e9a13f6d-5c82-4b07-9d4e-1f6a8c3b7e21', 'web', NULL, 'vi', '2026-11-11T08:00:00');

INSERT INTO [content].[LISTEN] (device_id, kind, poi_id, lang, trigger_src, at) VALUES
 ('3f2a9c1e-7b4d-4e8a-9c21-5d6f0a1b2c3d', 'overview', NULL, 'en', 'manual',   '2026-11-10T02:01:00'),
 ('3f2a9c1e-7b4d-4e8a-9c21-5d6f0a1b2c3d', 'poi',      1,    'en', 'geofence', '2026-11-10T02:05:00'),
 ('3f2a9c1e-7b4d-4e8a-9c21-5d6f0a1b2c3d', 'poi',      2,    'en', 'geofence', '2026-11-10T02:09:00'),
 ('3f2a9c1e-7b4d-4e8a-9c21-5d6f0a1b2c3d', 'poi',      3,    'en', 'manual',   '2026-11-10T02:20:00'),
 ('8b1d4e2f-0c3a-4f7b-a6d5-2e9c1b7a4f60', 'poi',      1,    'vi', 'geofence', '2026-11-10T03:12:00'),
 ('8b1d4e2f-0c3a-4f7b-a6d5-2e9c1b7a4f60', 'poi',      2,    'vi', 'queue',    '2026-11-11T04:05:00'),
 ('c47e0b9a-2d51-4f3e-8a6c-9e1d7b2f5a08', 'overview', NULL, 'zh', 'manual',   '2026-11-11T01:31:00'),
 ('c47e0b9a-2d51-4f3e-8a6c-9e1d7b2f5a08', 'poi',      5,    'zh', 'manual',   '2026-11-11T01:45:00'),
 ('c47e0b9a-2d51-4f3e-8a6c-9e1d7b2f5a08', 'poi',      6,    'zh', 'manual',   '2026-11-11T01:52:00');
GO

/* ================================ KIỂM TRA NHANH ================================ */
-- Số bảng theo từng schema (content 7, narration 2, translation 2, tts 2 = 13 bảng)
SELECT s.name AS [schema], COUNT(*) AS so_bang
FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name IN ('content', 'narration', 'translation', 'tts')
GROUP BY s.name ORDER BY s.name;

-- Không có khoá ngoại nào nối giữa hai schema (kết quả mong đợi: 0 dòng)
SELECT fk.name AS khoa_ngoai, OBJECT_SCHEMA_NAME(fk.parent_object_id) AS tu_schema,
       OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS toi_schema
FROM sys.foreign_keys fk
WHERE OBJECT_SCHEMA_NAME(fk.parent_object_id) <> OBJECT_SCHEMA_NAME(fk.referenced_object_id);

-- Mỗi điểm đã xuất bản có đủ bài thuyết minh, 3 bản dịch, 3 giọng đọc (mong đợi: 6 dòng, đủ 1/3/3)
SELECT p.id, p.name,
       (SELECT COUNT(*) FROM [narration].[NARRATION] n   WHERE n.poi_id = p.id AND n.version = p.version) AS narration,
       (SELECT COUNT(*) FROM [translation].[TRANSLATION] t WHERE t.poi_id = p.id AND t.version = p.version) AS translations,
       (SELECT COUNT(*) FROM [tts].[AUDIO] a             WHERE a.poi_id = p.id AND a.version = p.version) AS audios
FROM [content].[POI] p WHERE p.status = 'PUBLISHED' AND p.deleted_at IS NULL ORDER BY p.sort_order;

-- Thống kê cho trang Admin
SELECT * FROM [content].[V_POI_STATS] ORDER BY listens DESC;
SELECT * FROM [content].[V_DAILY_ACTIVITY] ORDER BY day_vn;

-- Lượt nghe theo ngôn ngữ (kể cả phần tổng quan)
SELECT lang, COUNT(*) AS luot_nghe FROM [content].[LISTEN] GROUP BY lang ORDER BY luot_nghe DESC;
