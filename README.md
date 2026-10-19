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
Thu: mo http://localhost:8080/api/test/publish?poiId=3&version=1 (qua gateway) va xem log ca 5 service.
Kiem tra gateway: http://localhost:8080/actuator/gateway/routes
RabbitMQ UI: http://localhost:15672 (guest / guest).

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
