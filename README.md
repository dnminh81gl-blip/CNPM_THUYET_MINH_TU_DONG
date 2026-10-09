# Thuyet minh tu dong da ngon ngu

Do an mon Cong nghe phan mem. Nhom phu trach: **Backend microservices + CI/CD**.

## Cau truc
```
frontend/Thuyet-minh-tu-dong/        Giao dien web (HTML/CSS/JS, Leaflet, GPS, geofence)
backend/tourguide/
  content-service/                   Quan ly noi dung, phat su kien content.published (cong 8081)
  narration-service/                 Nhan content.published, tao ban thuyet minh, phat narration.created (cong 8082)
  translation-service/               Nhan narration.created, dich, phat translation.completed (cong 8083)
docker-compose.yml                   Chay RabbitMQ + cac service
.github/workflows/ci.yml             CI: build + test + build Docker moi lan push
EVENTS.md                            Hop dong su kien giua cac service
```

## Kien truc (ban dau)
`content-service --content.published--> narration-service --narration.created--> translation-service --translation.completed--> (tts-service, notification-service...)`, tat ca qua RabbitMQ.

Phan cong va quy tac lam viec: xem `docs/PHAN-CONG.md`.

## Chay bang Docker (khuyen dung)
```
docker compose up --build
```
Thu: mo http://localhost:8081/api/test/publish?poiId=3&version=1 va xem log `narration-service`.
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
