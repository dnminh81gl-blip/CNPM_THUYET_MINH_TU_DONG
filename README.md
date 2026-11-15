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
Kiem tra tung service qua gateway:
- http://localhost:8080/api/pois (content)
- http://localhost:8080/api/narrations/status (narration)
- http://localhost:8080/api/translations/status (translation)
- http://localhost:8080/api/audio/status (tts)
RabbitMQ UI: http://localhost:15672 (guest / guest).

## API dia diem (content-service, goi qua gateway cong 8080)
| Lenh | Duong dan | Tac dung |
|---|---|---|
| GET | `/api/pois` | Danh sach POI (6 diem thuyet minh mau trong khuon vien Dinh Doc Lap) |
| GET | `/api/pois/{id}` | Chi tiet mot dia diem |
| POST | `/api/pois` | Them dia diem (ban nhap). Body: `{"name","category","address","lat","lng","radius","text"}` |
| PUT | `/api/pois/{id}` | Sua dia diem (tang version, ve ban nhap) |
| POST | `/api/pois/{id}/publish` | Xuat ban: phat `content.published` KEM ten + noi dung |
| DELETE | `/api/pois/{id}` | Xoa dia diem (204; 404 neu khong co) |

## Khu tham quan va thiet bi (khong can tai khoan)
Do an tap trung vao MOT khu tham quan: **Dinh Doc Lap**. Dung **1 ma QR chung** dat o cong Dinh
(`index.html?src=qr`, anh `frontend/Thuyet-minh-tu-dong/img/qr/qr-thuyet-minh.png`, tao lai o Admin > Thiet bi).
Du khach quet la vao web, tu chon diem de nghe hoac de GPS + geofence tu phat; KHONG can tao tai khoan, chi admin dang nhap.
(Van ho tro link mo thang mot diem: `index.html?poi=<id>&src=qr`.)

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
Can JDK 21. Bat RabbitMQ truoc:
`docker run -d --name rabbit -p 5672:5672 -p 15672:15672 rabbitmq:3.13-management`

Moi service mot terminal, vao thu muc roi chay `.\mvnw.cmd spring-boot:run` (Windows) hoac `./mvnw spring-boot:run`:

| Service | Thu muc | Cong |
|---|---|---|
| content-service | `backend/tourguide/content-service/content-service` | 8081 |
| narration-service | `backend/tourguide/narration-service/narration-service` | 8082 |
| translation-service | `backend/tourguide/translation-service/translation-service` | 8083 |
| tts-service | `backend/tourguide/tts-service/tts-service` | 8084 |
| notification-service | `backend/tourguide/notification-service` | 8085 |
| api-gateway (chay sau cung) | `backend/tourguide/api-gateway` | 8080 |

## CI/CD (GitHub Actions)
- **CI** (`.github/workflows/ci.yml`): moi push / pull request vao `main` -> build + test (`mvn verify`, co RabbitMQ that) 6 service song song, roi build Docker image.
- **CD backend**: khi code vao `main`, image duoc day len GitHub Container Registry: `ghcr.io/dnminh81gl-blip/tourguide-<service>:latest` (va tag theo ma commit). Xem o tab **Packages** cua repo.
- **CD frontend** (`.github/workflows/pages.yml`): kiem tra cu phap JS roi dua web len GitHub Pages.
- Quy tac: lam tren nhanh rieng -> Pull Request -> CI xanh + co nguoi review -> merge (xem `docs/PHAN-CONG.md`).

## Gioi han cua ban PoC
- Du lieu cac service luu trong bo nho: khoi dong lai la ve du lieu mau. Thiet ke CSDL (SQL Server, moi service mot schema rieng, co so do ERD) o `docs/database/`.
- API admin chua xac thuc o backend (dang nhap admin moi kiem tra o trinh duyet).
- Giong doc tao o trinh duyet (Web Speech API); tts-service chua sinh file mp3 that.
- Dich online dung MyMemory (mien phi, gioi han so ky tu/ngay); loi mang thi dung tu dien du phong.

## Frontend
Mo thu muc `frontend/Thuyet-minh-tu-dong` bang Live Server (GPS can localhost/HTTPS).
Khoa OpenRouteService dan vao `js/config.js` (`ORS_API_KEY`) tren may, **khong commit khoa**.

## Quy uoc
- Package Java: `com.tourguide.<ten_service>`
- Chi giao tiep giua service qua su kien (xem EVENTS.md).
- Khong commit khoa API / mat khau that.
