/* ============================================================================
   CSDL "Thuyết minh tự động đa ngôn ngữ" – SQL Server
   9 bảng theo lược đồ quan hệ: ADMIN, POI, LANGUAGE, NARRATION, TRANSLATION,
   AUDIO, DEVICE, VISIT, LISTEN + dữ liệu mẫu 6 điểm thuyết minh Dinh Độc Lập.
   Cách chạy: SSMS > File > Open > File... chọn file này > Execute (F5).
   Chạy lại nhiều lần được (xoá bảng cũ rồi tạo lại).
   Ghi chú: hiện các service vẫn lưu dữ liệu trong bộ nhớ; CSDL này là bản hiện
   thực thiết kế, bước sau (T14) nối các service vào CSDL.
   ============================================================================ */
IF DB_ID(N'ThuyetMinhTuDong') IS NULL CREATE DATABASE ThuyetMinhTuDong;
GO
USE ThuyetMinhTuDong;
GO

-- Xoá bảng cũ (thứ tự ngược với khoá ngoại)
DROP TABLE IF EXISTS LISTEN, VISIT, DEVICE, AUDIO, [TRANSLATION], NARRATION, POI, [LANGUAGE], [ADMIN];
GO

/* 1. ADMIN – quản trị viên */
CREATE TABLE [ADMIN] (
    id            VARCHAR(40)    NOT NULL PRIMARY KEY,
    name          NVARCHAR(100)  NOT NULL,
    email         VARCHAR(120)   NOT NULL UNIQUE,
    password_hash VARCHAR(128)   NOT NULL,
    role          VARCHAR(20)    NOT NULL DEFAULT 'admin'
);

/* 2. LANGUAGE – ngôn ngữ thuyết minh */
CREATE TABLE [LANGUAGE] (
    code      VARCHAR(5)    NOT NULL PRIMARY KEY,
    name      NVARCHAR(40)  NOT NULL,
    tts_voice VARCHAR(10)   NOT NULL
);

/* 3. POI – điểm thuyết minh */
CREATE TABLE POI (
    id         BIGINT         NOT NULL PRIMARY KEY,
    name       NVARCHAR(120)  NOT NULL,
    category   NVARCHAR(60)   NULL,
    address    NVARCHAR(200)  NULL,
    lat        FLOAT          NOT NULL,
    lng        FLOAT          NOT NULL,
    radius     INT            NOT NULL CHECK (radius BETWEEN 10 AND 300),
    priority   INT            NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 5),
    image      NVARCHAR(400)  NULL,
    text       NVARCHAR(4000) NOT NULL,
    version    INT            NOT NULL DEFAULT 1,
    status     VARCHAR(10)    NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
    updated_at DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    updated_by VARCHAR(40)    NULL REFERENCES [ADMIN](id)
);

/* 4. NARRATION – bài thuyết minh theo từng phiên bản */
CREATE TABLE NARRATION (
    poi_id     BIGINT         NOT NULL REFERENCES POI(id) ON DELETE CASCADE,
    version    INT            NOT NULL,
    script_vi  NVARCHAR(4000) NOT NULL,
    created_at DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    PRIMARY KEY (poi_id, version)
);

/* 5. TRANSLATION – bản dịch của bài thuyết minh */
CREATE TABLE [TRANSLATION] (
    poi_id          BIGINT         NOT NULL,
    version         INT            NOT NULL,
    lang            VARCHAR(5)     NOT NULL REFERENCES [LANGUAGE](code),
    translated_text NVARCHAR(4000) NOT NULL,
    engine          VARCHAR(30)    NOT NULL,
    translated_at   DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    PRIMARY KEY (poi_id, version, lang),
    FOREIGN KEY (poi_id, version) REFERENCES NARRATION(poi_id, version) ON DELETE CASCADE
);

/* 6. AUDIO – giọng đọc cho từng bản dịch (1 – 1) */
CREATE TABLE AUDIO (
    poi_id  BIGINT        NOT NULL,
    version INT           NOT NULL,
    lang    VARCHAR(5)    NOT NULL,
    voice   VARCHAR(10)   NOT NULL,
    url     NVARCHAR(400) NULL,
    engine  VARCHAR(30)   NOT NULL,
    PRIMARY KEY (poi_id, version, lang),
    FOREIGN KEY (poi_id, version, lang) REFERENCES [TRANSLATION](poi_id, version, lang) ON DELETE CASCADE
);

/* 7. DEVICE – thiết bị ẩn danh (không lưu tên, email, IP) */
CREATE TABLE DEVICE (
    device_id  VARCHAR(64)  NOT NULL PRIMARY KEY,
    os         NVARCHAR(30) NULL,
    browser    NVARCHAR(30) NULL,
    type       NVARCHAR(30) NULL,
    lang       VARCHAR(5)   NULL REFERENCES [LANGUAGE](code),
    first_src  VARCHAR(10)  NOT NULL DEFAULT 'web',
    first_seen DATETIME2    NOT NULL DEFAULT SYSDATETIME(),
    last_seen  DATETIME2    NOT NULL DEFAULT SYSDATETIME()
);

/* 8. VISIT – lượt mở web / quét QR (poi_id NULL = mã QR chung) */
CREATE TABLE VISIT (
    id        BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL REFERENCES DEVICE(device_id),
    src       VARCHAR(10) NOT NULL CHECK (src IN ('qr','web')),
    poi_id    BIGINT      NULL REFERENCES POI(id),
    at        DATETIME2   NOT NULL DEFAULT SYSDATETIME()
);

/* 9. LISTEN – lượt nghe (poi_id NULL = phần Giới thiệu tổng quan) */
CREATE TABLE LISTEN (
    id        BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL REFERENCES DEVICE(device_id),
    poi_id    BIGINT      NULL REFERENCES POI(id),
    lang      VARCHAR(5)  NOT NULL REFERENCES [LANGUAGE](code),
    at        DATETIME2   NOT NULL DEFAULT SYSDATETIME()
);
GO

/* ============================== DỮ LIỆU MẪU ============================== */
INSERT INTO [ADMIN] (id, name, email, password_hash, role) VALUES
 ('admin', N'Quản trị viên', 'admin@tmtd.vn', 'sha256:(chi luu ma bam, khong luu mat khau)', 'admin');

INSERT INTO [LANGUAGE] (code, name, tts_voice) VALUES
 ('vi', N'Tiếng Việt', 'vi-VN'), ('en', N'English', 'en-US'), ('zh', N'中文', 'zh-CN');

INSERT INTO POI (id, name, category, address, lat, lng, radius, priority, image, text, version, status, updated_by) VALUES
 (1, N'Cổng chính và xe tăng', N'Khuôn viên', N'Cổng chính phía đường Lê Duẩn', 10.7779, 106.6964, 30, 3, N'Tank_Remnant_in_the_Independence_Palace.jpg', N'Bạn đang đứng ở cổng chính Dinh Độc Lập. Trưa ngày 30 tháng 4 năm 1975, xe tăng 390 húc đổ cánh cổng này, đánh dấu thời khắc kết thúc chiến tranh và thống nhất đất nước. Hai chiếc xe tăng trưng bày trong khuôn viên gợi nhớ xe tăng 843 và 390 đã tiến vào Dinh hôm đó.', 1, 'PUBLISHED', 'admin'),
 (2, N'Mặt tiền và kiến trúc', N'Khuôn viên', N'Bãi cỏ trước mặt tiền Dinh', 10.77745, 106.69585, 30, 3, N'20190923_Independence_Palace-10.jpg', N'Dinh Độc Lập do kiến trúc sư Ngô Viết Thụ thiết kế, khởi công năm 1962 và khánh thành ngày 31 tháng 10 năm 1966, trên nền Dinh Norodom cũ thời Pháp. Mặt tiền nổi bật với những hàng rèm hoa đá mô phỏng đốt trúc, vừa che nắng vừa mang nét kiến trúc truyền thống Á Đông.', 1, 'PUBLISHED', 'admin'),
 (3, N'Phòng Trình Quốc thư', N'Bên trong Dinh', N'Bên trong Dinh', 10.77712, 106.69548, 15, 2, N'img/places/poi-3.jpg', N'Đây là phòng Trình Quốc thư, nơi các đại sứ nước ngoài trình thư uỷ nhiệm. Điểm nhấn của căn phòng là bức tranh sơn mài lớn Bình Ngô Đại Cáo gồm 40 tấm ghép lại, của hoạ sĩ Nguyễn Văn Minh.', 1, 'PUBLISHED', 'admin'),
 (4, N'Phòng họp Nội các', N'Bên trong Dinh', N'Bên trong Dinh', 10.77695, 106.69528, 15, 2, N'img/places/poi-4.jpg', N'Phòng họp Nội các là nơi Tổng thống họp với các bộ trưởng. Căn phòng vẫn giữ bàn họp dài và hàng ghế như thời kỳ trước năm 1975, giúp du khách hình dung cách bộ máy chính quyền làm việc tại đây.', 1, 'PUBLISHED', 'admin'),
 (5, N'Sân thượng và trực thăng', N'Sân thượng', N'Sân thượng', 10.7768, 106.69512, 15, 2, N'img/places/poi-5.jpg', N'Trên sân thượng có bãi đáp trực thăng, nơi trưng bày một chiếc trực thăng UH-1. Sáng ngày 8 tháng 4 năm 1975, phi công Nguyễn Thành Trung lái máy bay F-5E ném bom Dinh Độc Lập rồi hạ cánh an toàn ở vùng giải phóng Phước Long.', 1, 'PUBLISHED', 'admin'),
 (6, N'Tầng hầm chỉ huy', N'Tầng hầm', N'Tầng hầm', 10.77666, 106.69496, 15, 3, N'img/places/poi-6.jpg', N'Tầng hầm là hệ thống hầm chỉ huy kiên cố, được xây để chịu được bom. Bên trong có trung tâm chỉ huy, các thiết bị thông tin liên lạc và phòng bản đồ tác chiến, nhiều bản đồ vẫn còn giữ nguyên dấu bút chì đánh dấu.', 1, 'PUBLISHED', 'admin');

-- Bài thuyết minh phiên bản 1 (narration-service soạn: câu chào + nội dung + câu kết)
INSERT INTO NARRATION (poi_id, version, script_vi) VALUES
 (1, 1, N'Chào mừng bạn đến với Cổng chính và xe tăng. Bạn đang đứng ở cổng chính Dinh Độc Lập. Trưa ngày 30 tháng 4 năm 1975, xe tăng 390 húc đổ cánh cổng này, đánh dấu thời khắc kết thúc chiến tranh và thống nhất đất nước. Hai chiếc xe tăng trưng bày trong khuôn viên gợi nhớ xe tăng 843 và 390 đã tiến vào Dinh hôm đó. Chúc bạn có chuyến tham quan thú vị.'),
 (2, 1, N'Chào mừng bạn đến với Mặt tiền và kiến trúc. Dinh Độc Lập do kiến trúc sư Ngô Viết Thụ thiết kế, khởi công năm 1962 và khánh thành ngày 31 tháng 10 năm 1966, trên nền Dinh Norodom cũ thời Pháp. Mặt tiền nổi bật với những hàng rèm hoa đá mô phỏng đốt trúc, vừa che nắng vừa mang nét kiến trúc truyền thống Á Đông. Chúc bạn có chuyến tham quan thú vị.'),
 (3, 1, N'Chào mừng bạn đến với Phòng Trình Quốc thư. Đây là phòng Trình Quốc thư, nơi các đại sứ nước ngoài trình thư uỷ nhiệm. Điểm nhấn của căn phòng là bức tranh sơn mài lớn Bình Ngô Đại Cáo gồm 40 tấm ghép lại, của hoạ sĩ Nguyễn Văn Minh. Chúc bạn có chuyến tham quan thú vị.'),
 (4, 1, N'Chào mừng bạn đến với Phòng họp Nội các. Phòng họp Nội các là nơi Tổng thống họp với các bộ trưởng. Căn phòng vẫn giữ bàn họp dài và hàng ghế như thời kỳ trước năm 1975, giúp du khách hình dung cách bộ máy chính quyền làm việc tại đây. Chúc bạn có chuyến tham quan thú vị.'),
 (5, 1, N'Chào mừng bạn đến với Sân thượng và trực thăng. Trên sân thượng có bãi đáp trực thăng, nơi trưng bày một chiếc trực thăng UH-1. Sáng ngày 8 tháng 4 năm 1975, phi công Nguyễn Thành Trung lái máy bay F-5E ném bom Dinh Độc Lập rồi hạ cánh an toàn ở vùng giải phóng Phước Long. Chúc bạn có chuyến tham quan thú vị.'),
 (6, 1, N'Chào mừng bạn đến với Tầng hầm chỉ huy. Tầng hầm là hệ thống hầm chỉ huy kiên cố, được xây để chịu được bom. Bên trong có trung tâm chỉ huy, các thiết bị thông tin liên lạc và phòng bản đồ tác chiến, nhiều bản đồ vẫn còn giữ nguyên dấu bút chì đánh dấu. Chúc bạn có chuyến tham quan thú vị.');

INSERT INTO [TRANSLATION] (poi_id, version, lang, translated_text, engine) VALUES
 (1, 1, 'vi', N'Bạn đang đứng ở cổng chính Dinh Độc Lập. Trưa ngày 30 tháng 4 năm 1975, xe tăng 390 húc đổ cánh cổng này, đánh dấu thời khắc kết thúc chiến tranh và thống nhất đất nước. Hai chiếc xe tăng trưng bày trong khuôn viên gợi nhớ xe tăng 843 và 390 đã tiến vào Dinh hôm đó.', 'identity'),
 (1, 1, 'en', N'You are at the main gate of Independence Palace. Around noon on 30 April 1975, tank 390 crashed through this gate, marking the end of the war and the reunification of Vietnam. The two tanks displayed on the grounds recall tanks 843 and 390, which entered the palace that day.', 'mymemory_online'),
 (1, 1, 'zh', N'您现在位于独立宫正门。1975年4月30日中午，390号坦克撞开了这道大门，标志着战争结束、国家统一。园内展出的两辆坦克让人回想起当天开进独立宫的843号和390号坦克。', 'mymemory_online'),
 (2, 1, 'vi', N'Dinh Độc Lập do kiến trúc sư Ngô Viết Thụ thiết kế, khởi công năm 1962 và khánh thành ngày 31 tháng 10 năm 1966, trên nền Dinh Norodom cũ thời Pháp. Mặt tiền nổi bật với những hàng rèm hoa đá mô phỏng đốt trúc, vừa che nắng vừa mang nét kiến trúc truyền thống Á Đông.', 'identity'),
 (2, 1, 'en', N'Independence Palace was designed by architect Ngo Viet Thu. Construction began in 1962 and it was inaugurated on 31 October 1966, on the site of the former French-era Norodom Palace. Its facade is known for rows of stone screens shaped like bamboo segments, which give shade and echo traditional East Asian architecture.', 'mymemory_online'),
 (2, 1, 'zh', N'独立宫由建筑师吴越树设计，1962年动工，1966年10月31日落成，原址为法属时期的诺罗敦宫。正面以仿竹节造型的石质花帘著称，既能遮阳，又体现了东方传统建筑风格。', 'mymemory_online'),
 (3, 1, 'vi', N'Đây là phòng Trình Quốc thư, nơi các đại sứ nước ngoài trình thư uỷ nhiệm. Điểm nhấn của căn phòng là bức tranh sơn mài lớn Bình Ngô Đại Cáo gồm 40 tấm ghép lại, của hoạ sĩ Nguyễn Văn Minh.', 'identity'),
 (3, 1, 'en', N'This is the Credentials Room, where foreign ambassadors presented their letters of credence. Its highlight is the large lacquer painting Binh Ngo Dai Cao, the Great Proclamation of Victory over the Ming, made of 40 panels by artist Nguyen Van Minh.', 'mymemory_online'),
 (3, 1, 'zh', N'这里是国书递交厅，外国大使在此递交国书。厅内最引人注目的是画家阮文明创作的大型漆画《平吴大诰》，由40块画板拼接而成。', 'mymemory_online'),
 (4, 1, 'vi', N'Phòng họp Nội các là nơi Tổng thống họp với các bộ trưởng. Căn phòng vẫn giữ bàn họp dài và hàng ghế như thời kỳ trước năm 1975, giúp du khách hình dung cách bộ máy chính quyền làm việc tại đây.', 'identity'),
 (4, 1, 'en', N'The Cabinet Room is where the president met with his ministers. The long meeting table and rows of chairs remain as they were before 1975, helping visitors picture how the government worked here.', 'mymemory_online'),
 (4, 1, 'zh', N'内阁会议室是总统与各部部长开会的地方。长会议桌和成排的座椅仍保持1975年以前的原貌，帮助游客了解当时政府在此办公的情景。', 'mymemory_online'),
 (5, 1, 'vi', N'Trên sân thượng có bãi đáp trực thăng, nơi trưng bày một chiếc trực thăng UH-1. Sáng ngày 8 tháng 4 năm 1975, phi công Nguyễn Thành Trung lái máy bay F-5E ném bom Dinh Độc Lập rồi hạ cánh an toàn ở vùng giải phóng Phước Long.', 'identity'),
 (5, 1, 'en', N'The rooftop has a helipad, where a UH-1 helicopter is on display. On the morning of 8 April 1975, pilot Nguyen Thanh Trung bombed the palace from an F-5E jet and then landed safely in the liberated area of Phuoc Long.', 'mymemory_online'),
 (5, 1, 'zh', N'屋顶设有直升机停机坪，这里展出一架UH-1直升机。1975年4月8日上午，飞行员阮成忠驾驶F-5E战机轰炸独立宫，随后安全降落在已解放的福隆地区。', 'mymemory_online'),
 (6, 1, 'vi', N'Tầng hầm là hệ thống hầm chỉ huy kiên cố, được xây để chịu được bom. Bên trong có trung tâm chỉ huy, các thiết bị thông tin liên lạc và phòng bản đồ tác chiến, nhiều bản đồ vẫn còn giữ nguyên dấu bút chì đánh dấu.', 'identity'),
 (6, 1, 'en', N'The basement is a reinforced command bunker built to withstand bombing. It contains a command centre, communications equipment and a war map room, where many maps still carry their original pencil markings.', 'mymemory_online'),
 (6, 1, 'zh', N'地下室是一座坚固的指挥地堡，可抵御轰炸。里面有指挥中心、通讯设备和作战地图室，许多地图上仍保留着当年的铅笔标记。', 'mymemory_online');

INSERT INTO AUDIO (poi_id, version, lang, voice, url, engine) VALUES
 (1, 1, 'vi', 'vi-VN', NULL, 'client-speech'),
 (1, 1, 'en', 'en-US', NULL, 'client-speech'),
 (1, 1, 'zh', 'zh-CN', NULL, 'client-speech'),
 (2, 1, 'vi', 'vi-VN', NULL, 'client-speech'),
 (2, 1, 'en', 'en-US', NULL, 'client-speech'),
 (2, 1, 'zh', 'zh-CN', NULL, 'client-speech'),
 (3, 1, 'vi', 'vi-VN', NULL, 'client-speech'),
 (3, 1, 'en', 'en-US', NULL, 'client-speech'),
 (3, 1, 'zh', 'zh-CN', NULL, 'client-speech'),
 (4, 1, 'vi', 'vi-VN', NULL, 'client-speech'),
 (4, 1, 'en', 'en-US', NULL, 'client-speech'),
 (4, 1, 'zh', 'zh-CN', NULL, 'client-speech'),
 (5, 1, 'vi', 'vi-VN', NULL, 'client-speech'),
 (5, 1, 'en', 'en-US', NULL, 'client-speech'),
 (5, 1, 'zh', 'zh-CN', NULL, 'client-speech'),
 (6, 1, 'vi', 'vi-VN', NULL, 'client-speech'),
 (6, 1, 'en', 'en-US', NULL, 'client-speech'),
 (6, 1, 'zh', 'zh-CN', NULL, 'client-speech');

INSERT INTO DEVICE (device_id, os, browser, type, lang, first_src) VALUES
 ('3f2a9c1e-7b4d-4e8a-9c21-5d6f0a1b2c3d', N'iOS', N'Safari', N'Điện thoại', 'en', 'qr'),
 ('8b1d4e2f-0c3a-4f7b-a6d5-2e9c1b7a4f60', N'Android', N'Chrome', N'Điện thoại', 'vi', 'qr');

INSERT INTO VISIT (device_id, src, poi_id) VALUES
 ('3f2a9c1e-7b4d-4e8a-9c21-5d6f0a1b2c3d', 'qr', NULL),
 ('8b1d4e2f-0c3a-4f7b-a6d5-2e9c1b7a4f60', 'qr', NULL),
 ('8b1d4e2f-0c3a-4f7b-a6d5-2e9c1b7a4f60', 'web', NULL);

INSERT INTO LISTEN (device_id, poi_id, lang) VALUES
 ('3f2a9c1e-7b4d-4e8a-9c21-5d6f0a1b2c3d', NULL, 'en'),
 ('3f2a9c1e-7b4d-4e8a-9c21-5d6f0a1b2c3d', 1, 'en'),
 ('3f2a9c1e-7b4d-4e8a-9c21-5d6f0a1b2c3d', 3, 'en'),
 ('8b1d4e2f-0c3a-4f7b-a6d5-2e9c1b7a4f60', 1, 'vi'),
 ('8b1d4e2f-0c3a-4f7b-a6d5-2e9c1b7a4f60', 2, 'vi');
GO

/* ============================ KIỂM TRA NHANH ============================ */
-- Số bảng trong CSDL (kết quả: 9)
SELECT COUNT(*) AS so_bang FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
-- Số dòng của từng bảng
SELECT 'ADMIN' AS bang, COUNT(*) AS so_dong FROM [ADMIN] UNION ALL
SELECT 'LANGUAGE', COUNT(*) FROM [LANGUAGE] UNION ALL
SELECT 'POI', COUNT(*) FROM POI UNION ALL
SELECT 'NARRATION', COUNT(*) FROM NARRATION UNION ALL
SELECT 'TRANSLATION', COUNT(*) FROM [TRANSLATION] UNION ALL
SELECT 'AUDIO', COUNT(*) FROM AUDIO UNION ALL
SELECT 'DEVICE', COUNT(*) FROM DEVICE UNION ALL
SELECT 'VISIT', COUNT(*) FROM VISIT UNION ALL
SELECT 'LISTEN', COUNT(*) FROM LISTEN;
-- Lượt nghe theo từng điểm
SELECT ISNULL(p.name, N'Giới thiệu tổng quan') AS diem, COUNT(*) AS luot_nghe
FROM LISTEN l LEFT JOIN POI p ON p.id = l.poi_id GROUP BY p.name;
