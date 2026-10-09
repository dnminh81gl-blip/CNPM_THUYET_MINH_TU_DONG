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

## Su kien du kien (them sau)
| Routing key | Gui | Nhan |
|---|---|---|
| narration.created | narration-service | translation-service |
| translation.completed | translation-service | tts-service |
| audio.ready | tts-service | notification-service |
