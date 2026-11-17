# Hop dong su kien (Event contract)

Cac service chi giao tiep voi nhau qua RabbitMQ bang cac su kien JSON duoi day.
Quy uoc chung:
- Exchange (topic, durable): `tourguide.events`
- Routing key: `<doi_tuong>.<hanh_dong>` (vi du `content.published`)
- Ten queue: `<service_nhan>.<routing_key>` (vi du `narration-service.content.published`)
- Moi su kien co `eventId` (UUID) de chong xu ly trung.
- Chi THEM truong moi, khong doi ten/xoa truong cu.
- Ben nhan phai chiu duoc truong MOI vang mat (null): service cu chua gui thi van chay theo cach cu. Jackson 3 (Spring Boot 4) mac dinh bo qua truong la nen ben nhan cu khong loi khi ben gui them truong.

## content.published
Gui boi: content-service. Nhan boi: narration-service.

| Truong | Kieu | Y nghia |
|---|---|---|
| eventId | string (UUID) | Ma duy nhat cua su kien |
| poiId | number | Dia diem (POI) |
| version | number | Phien ban noi dung |
| langs | string[] | Ngon ngu da co noi dung, vd ["vi","en","zh"] |
| publishedAt | string (ISO-8601) | Thoi diem xuat ban |
| name | string | (MOI) Ten dia diem, tieng Viet |
| text | string | (MOI) Noi dung gioi thieu goc, tieng Viet, do admin nhap |

Vi du:
```json
{"eventId":"c6a5d87b-6458-41b3-97ee-c47187849615","poiId":3,"version":2,"langs":["vi","en","zh"],"publishedAt":"2026-11-15T09:54:21.686Z","name":"Phòng Trình Quốc thư","text":"Đây là phòng Trình Quốc thư, nơi các đại sứ nước ngoài trình thư uỷ nhiệm..."}
```

## narration.created
Gui boi: narration-service. Nhan boi: translation-service.

| Truong | Kieu | Y nghia |
|---|---|---|
| eventId | string (UUID) | Ma duy nhat cua su kien nay |
| sourceEventId | string (UUID) | eventId cua su kien content.published da gay ra no |
| poiId | number | Dia diem (POI) |
| version | number | Phien ban noi dung |
| langs | string[] | Ngon ngu can xu ly |
| createdAt | string (ISO-8601) | Thoi diem tao |
| script | object | (MOI) Bai thuyet minh theo ngon ngu. narration-service chi tao ban goc: `{"vi":"Chào mừng bạn đến với ..."}` |

## translation.completed
Gui boi: translation-service. Nhan boi: tts-service, notification-service.

| Truong | Kieu | Y nghia |
|---|---|---|
| eventId | string (UUID) | Ma duy nhat cua su kien nay |
| sourceEventId | string (UUID) | eventId cua narration.created da gay ra no |
| poiId | number | Dia diem (POI) |
| version | number | Phien ban noi dung |
| langs | string[] | Ngon ngu da dich xong |
| completedAt | string (ISO-8601) | Thoi diem hoan thanh |
| scripts | object | (MOI) Bai thuyet minh da dich, moi ngon ngu mot ban: `{"vi":"...","en":"...","zh":"..."}` |

## audio.ready
Gui boi: tts-service. Nhan boi: notification-service.

| Truong | Kieu | Y nghia |
|---|---|---|
| eventId | string (UUID) | Ma duy nhat cua su kien nay |
| sourceEventId | string (UUID) | eventId cua translation.completed da gay ra no |
| poiId | number | Dia diem (POI) |
| version | number | Phien ban noi dung |
| audios | object[] | Moi ngon ngu mot phan tu: `lang`, `voice` (vd "vi-VN"), `url`, `engine`, `text` (MOI: van ban de doc, lay tu `scripts`; null neu ban dich chua co) |
| readyAt | string (ISO-8601) | Thoi diem tao xong |

Ban PoC: `engine` = `client-speech` (Frontend tu doc bang Web Speech API theo `voice`), `url` la duong dan du kien, chua sinh file mp3 that.

Vi du:
```json
{"eventId":"...","sourceEventId":"...","poiId":3,"version":1,"audios":[{"lang":"vi","voice":"vi-VN","url":"/audio/poi-3/v1/vi.mp3","engine":"client-speech"}],"readyAt":"2026-10-19T07:00:00Z"}
```
## Thong bao WebSocket (notification-service -> Frontend)
notification-service nhan `translation.completed` va `audio.ready` roi day ve Client.

- Endpoint qua API Gateway (Frontend dung cach nay): `ws://<host>:8080/ws-notification/websocket`
  (tren https / ngrok dung `wss://<ten-mien>/ws-notification/websocket`)
- Endpoint SockJS qua gateway: `http://<host>:8080/ws-notification`
- Endpoint truc tiep (chi khi chay local, khong qua gateway): `http://<host>:8085/ws-notification`
- Kenh dang ky: `/topic/notifications`
- Noi dung: `{"type":"<routing_key>","data":<JSON goc cua su kien>}`

### Cac buoc ket noi STOMP
Moi khung STOMP ket thuc bang ky tu NULL (`\u0000`).

1. **CONNECT** – mo WebSocket roi gui:
   ```text
   CONNECT
   accept-version:1.2,1.1
   heart-beat:0,0
   host:/

   ```
   Server tra ve khung `CONNECTED`.
2. **SUBSCRIBE** – dang ky kenh thong bao:
   ```text
   SUBSCRIBE
   id:sub-0
   destination:/topic/notifications
   ack:auto

   ```
3. **MESSAGE** – moi su kien den la mot khung `MESSAGE`, phan noi dung la JSON. Vi du `audio.ready`:
   ```json
   {"type":"audio.ready","data":{"eventId":"...","sourceEventId":"...","poiId":3,"version":2,
     "audios":[{"lang":"vi","voice":"vi-VN","url":"/audio/poi-3/v2/vi.mp3","engine":"client-speech","text":"Chao mung ban den voi ..."}],
     "readyAt":"2026-11-17T03:00:00Z"}}
   ```
4. Mat ket noi (khoa man hinh, mang chap chon): Frontend tu ket noi lai sau 2, 4, 8... toi da 30 giay
   (xem `frontend/Thuyet-minh-tu-dong/service/NotificationService.js`).

### Thu nhanh
1. Chay `docker compose up --build`, mo web (Live Server) va trang Admin > POI.
2. Bam nut may bay giay (xuat ban) o mot POI.
3. Trang Admin hien thong bao "Da dich xong" roi "Da co giong doc"; web du khach dang mo tu cap nhat noi dung moi.


## Cong (port) cua cac service
| Service | Cong |
|---|---|
| api-gateway (cong vao duy nhat cho Frontend) | 8080 |
| content-service | 8081 |
| narration-service | 8082 |
| translation-service | 8083 |
| tts-service | 8084 |
| notification-service | 8085 |
| RabbitMQ | 5672 (UI 15672) |