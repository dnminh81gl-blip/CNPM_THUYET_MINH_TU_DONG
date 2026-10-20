# Thuyet minh tu dong da ngon ngu

Do an mon Cong nghe phan mem. Nhom phu trach: **Backend microservices + CI/CD**.

## Cau truc
```
frontend/Thuyet-minh-tu-dong/        Giao dien web (HTML/CSS/JS, Leaflet, GPS, geofence)
backend/tourguide/
  api-gateway/                       Cong vao duy nhat cho Frontend, dinh tuyen + CORS (cong 8080)
  content-service/                   Quan ly noi dung, phat su kien content.published (cong 8081)
  narration-service/                 Nhan content.published, tao ban thuyet minh, phat narration.created (cong 8082)
  translation-service/               Nhan narration.created, dich vi/en/zh, phat translation.completed (cong 8083)
  tts-service/                       Nhan translation.completed, tao giong doc, phat audio.ready (cong 8084)
  notification-service/              Nhan translation.completed + audio.ready, day ve web qua WebSocket (cong 8085)
docker-compose.yml                   Chay RabbitMQ + cac service
.github/workflows/ci.yml             CI: build + test + build Docker moi lan push
EVENTS.md                            Hop dong su kien giua cac service
```

## Kien truc
```
Frontend --HTTP/WebSocket--> api-gateway (8080) --> content / translation / notification ...

content --content.published--> narration --narration.created--> translation --translation.completed--+--> tts --audio.ready--+
                                                                                                   +-----------------------+--> notification --WebSocket--> Frontend
```
Cac service chi giao tiep qua su kien RabbitMQ (exchange `tourguide.events`), xem `EVENTS.md`.

Phan cong va quy tac lam viec: xem `docs/PHAN-CONG.md`.

## Chay bang Docker (khuyen dung)
```
docker compose up --build
```
Thu: mo http://localhost:8080/api/test/publish?poiId=3 (qua gateway) va xem log ca 5 service.
Kiem tra gateway: http://localhost:8080/actuator/gateway/routes
RabbitMQ UI: http://localhost:15672 (guest / guest).

## API dia diem (content-service, goi qua gateway cong 8080)
| Lenh | Duong dan | Tac dung |
|---|---|---|
| GET | `/api/pois` | Danh sach POI (6 diem thuyet minh mau trong khuon vien Dinh Doc Lap) |
| GET | `/api/pois/{id}` | Chi tiet mot dia diem |
| POST | `/api/pois` | Them dia diem (ban nhap). Body: `{"name","category","address","lat","lng","radius","text"}` |
| PUT | `/api/pois/{id}` | Sua dia diem (tang version, ve ban nhap) |
| POST | `/api/pois/{id}/publish` | Xuat ban: phat `content.published` KEM ten + noi dung |

## Khu tham quan va thiet bi (khong can tai khoan)
Do an tap trung vao MOT khu tham quan: **Dinh Doc Lap**. Moi POI (diem thuyet minh) ben trong co ma QR rieng:
`index.html?poi=<id>&src=qr`. Du khach quet la nghe, KHONG can tao tai khoan; chi admin dang nhap.

| Lenh | Duong dan | Tac dung |
|---|---|---|
| POST | `/api/devices/visits` | Web bao 1 lan mo trang: `deviceId` (ma ngau nhien), he dieu hanh, trinh duyet, loai may, ngon ngu, nguon `qr`/`web`, `poiId` cua ma QR |
| POST | `/api/devices/listens` | Web bao 1 lan nghe thuyet minh: `deviceId`, `poiId`, `lang` |
| GET | `/api/devices` | Danh sach thiet bi (trang Admin > Thiet bi) |
| GET | `/api/devices/stats` | Tong thiet bi, hom nay, dang dung (15 phut), quet QR, luot nghe; theo he dieu hanh / trinh duyet / ngon ngu / POI |

Khong luu ten, email hay IP. Web chay o localhost hoac IP mang LAN (Live Server) se tu goi backend cong 8080;
tren GitHub Pages (https) can khai bao `API_BASE` (backend co https) trong `js/config.js`.

Thu nhanh tren trinh duyet: `http://localhost:8080/api/test/publish?poiId=3` (xuat ban noi dung that cua dia diem 3).

Vi du them + xuat ban (PowerShell):
```
curl.exe -X POST http://localhost:8080/api/pois -H "Content-Type: application/json" -d "{\"name\":\"Cho Ben Thanh\",\"text\":\"Cho Ben Thanh duoc xay dung nam 1914.\"}"
curl.exe -X POST http://localhost:8080/api/pois/6/publish
```

## Chay tung service (khong Docker)
1. Bat RabbitMQ: `docker run -d --name rabbit -p 5672:5672 -p 15672:15672 rabbitmq:3.13-management`
2. Terminal 1: vao `backend/tourguide/narration-service/narration-service`, chay `.\mvnw.cmd spring-boot:run`
3. Terminal 2: vao `backend/tourguide/content-service/content-service`, chay `.\mvnw.cmd spring-boot:run`

## Frontend
Mo thu muc `frontend/Thuyet-minh-tu-dong` bang Live Server (GPS can localhost/HTTPS).
Khoa OpenRouteService dan vao `js/config.js` (`ORS_API_KEY`) tren may, **khong commit khoa**.

## Quy uoc
- Package Java: `com.tourguide.<ten_service>`
- Chi giao tiep giua service qua su kien (xem EVENTS.md).
- Khong commit khoa API / mat khau that.
