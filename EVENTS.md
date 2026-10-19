# Hop dong su kien (Event contract)

Cac service chi giao tiep voi nhau qua RabbitMQ bang cac su kien JSON duoi day.
Quy uoc chung:
- Exchange (topic, durable): `tourguide.events`
- Routing key: `<doi_tuong>.<hanh_dong>` (vi du `content.published`)
- Ten queue: `<service_nhan>.<routing_key>` (vi du `narration-service.content.published`)
- Moi su kien co `eventId` (UUID) de chong xu ly trung.
- Chi THEM truong moi, khong doi ten/xoa truong cu.

## content.published
Gui boi: content-service. Nhan boi: narration-service.

| Truong | Kieu | Y nghia |
|---|---|---|
| eventId | string (UUID) | Ma duy nhat cua su kien |
| poiId | number | Dia diem (POI) |
| version | number | Phien ban noi dung |
| langs | string[] | Ngon ngu da co noi dung, vd ["vi","en","zh"] |
| publishedAt | string (ISO-8601) | Thoi diem xuat ban |

Vi du:
```json
{"eventId":"c6a5d87b-6458-41b3-97ee-c47187849615","poiId":3,"version":1,"langs":["vi","en","zh"],"publishedAt":"2026-10-08T09:54:21.686Z"}
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

## audio.ready
Gui boi: tts-service. Nhan boi: notification-service.

| Truong | Kieu | Y nghia |
|---|---|---|
| eventId | string (UUID) | Ma duy nhat cua su kien nay |
| sourceEventId | string (UUID) | eventId cua translation.completed da gay ra no |
| poiId | number | Dia diem (POI) |
| version | number | Phien ban noi dung |
| audios | object[] | Moi ngon ngu mot phan tu: `lang`, `voice` (vd "vi-VN"), `url`, `engine` |
| readyAt | string (ISO-8601) | Thoi diem tao xong |

Ban PoC: `engine` = `client-speech` (Frontend tu doc bang Web Speech API theo `voice`), `url` la duong dan du kien, chua sinh file mp3 that.

Vi du:
```json
{"eventId":"...","sourceEventId":"...","poiId":3,"version":1,"audios":[{"lang":"vi","voice":"vi-VN","url":"/audio/poi-3/v1/vi.mp3","engine":"client-speech"}],"readyAt":"2026-10-19T07:00:00Z"}
```

## Thong bao WebSocket (notification-service -> Frontend)
notification-service nhan `translation.completed` va `audio.ready` roi day ve Client.

- Endpoint STOMP (co SockJS): `http://<host>:8085/ws-notification`
- Kenh dang ky: `/topic/notifications`
- Noi dung: `{"type":"<routing_key>","data":<JSON goc cua su kien>}`

Vi du:
```json
{"type":"translation.completed","data":{"eventId":"...","sourceEventId":"...","poiId":3,"version":1,"langs":["vi","en","zh"],"completedAt":"2026-10-19T06:00:00Z"}}
```


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
