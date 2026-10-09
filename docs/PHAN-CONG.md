# Phan cong nhom (Backend microservices + CI/CD)

## Thanh vien va nhiem vu
| Thanh vien | Phu trach | Viec cu the |
|---|---|---|
| **Minh** | content-service, narration-service, ha tang | Giu repo, CI/CD, docker-compose, EVENTS.md; lam API Gateway (sau); tai lieu kien truc va tich hop cac service |
| **Tram** | translation-service, tts-service | Nhan `narration.created` -> dich (vi/en/zh) -> phat `translation.completed`; sau do tao audio -> phat `audio.ready` |
| **Trang** | notification-service, ket noi frontend | Nhan `audio.ready` -> day ve client qua WebSocket; noi trang web voi backend (REST + WebSocket) |

> Co the doi vai theo the manh tung nguoi (vi du ai quen frontend thi nhan phan cua Trang). Doi xong cap nhat file nay.

## Lich (hien tai: tuan 5; giua ky: tuan 7)
- **Tuan 5:** chot phan cong, quy uoc va hop dong su kien (EVENTS.md). Moi nguoi clone repo, chay duoc `docker compose up --build`.
- **Tuan 6:** Tram lam translation-service (khung da co san, them logic dich); Trang lam notification-service; Minh noi chuoi su kien, cap nhat docker-compose va CI.
- **Tuan 7:** ghep ca luong, chay thu tu dau den cuoi, chuan bi demo va tai lieu.

## Quy tac lam viec
1. Moi nguoi lam tren **nhanh rieng** (`feature/<ten-service>`), khong push thang vao `main`.
2. Xong thi tao **Pull Request**; chi merge khi **CI xanh** va co nguoi xem qua.
3. Chi sua thu muc service cua minh. Sua cho chung (docker-compose, EVENTS.md, ci.yml) thi bao ca nhom.
4. Package Java: `com.tourguide.<ten_service>` (dau gach duoi). Cong co dinh: xem bang trong EVENTS.md.
5. Giao tiep giua service **chi qua su kien** RabbitMQ. Chi them truong moi vao su kien, khong doi ten/xoa truong cu.
6. Khong commit khoa API / mat khau that. Khoa chi de tren may (`config.js` da duoc bo qua bang `skip-worktree`).

## Them mot service moi (cac buoc)
1. Copy `translation-service` thanh thu muc moi, doi ten package, `artifactId` trong `pom.xml`, `spring.application.name` va `server.port`.
2. Sua `RabbitConfig` (ten queue `<service>.<routing_key>`) va listener cho dung su kien.
3. Them service vao `docker-compose.yml` va danh sach `matrix.service` trong `.github/workflows/ci.yml`.
4. Cap nhat EVENTS.md.
