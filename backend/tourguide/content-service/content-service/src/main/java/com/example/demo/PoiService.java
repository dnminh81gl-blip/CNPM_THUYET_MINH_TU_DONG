package com.example.demo;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Nghiệp vụ địa điểm: thêm, sửa, xuất bản. Xuất bản = phát sự kiện content.published KÈM nội dung. */
@Service
public class PoiService {

    /** Ngôn ngữ hệ thống thuyết minh (khớp với Frontend). */
    public static final List<String> LANGS = List.of("vi", "en", "zh");

    private final PoiRepository repo;
    private final EventPublisher publisher;

    public PoiService(PoiRepository repo, EventPublisher publisher) {
        this.repo = repo;
        this.publisher = publisher;
    }

    public List<Poi> list() {
        return repo.findAll();
    }

    public Poi get(long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy địa điểm " + id));
    }

    /** Thêm mới: bản nháp, version 1. Chưa gửi gì cho các service khác cho tới khi xuất bản. */
    public Poi create(PoiRequest r) {
        Poi poi = new Poi(repo.newId(), r.name().trim(), orEmpty(r.category()), orEmpty(r.address()),
                r.lat() == null ? 0 : r.lat(), r.lng() == null ? 0 : r.lng(), r.radius() == null ? 50 : r.radius(),
                r.text().trim(), 1, Poi.DRAFT, Instant.now().toString());
        return repo.save(poi);
    }

    /** Sửa: tăng version, chuyển về nháp (phải xuất bản lại thì người dùng mới nghe nội dung mới). */
    public Poi update(long id, PoiRequest r) {
        Poi old = get(id);
        Poi poi = new Poi(id, r.name().trim(),
                r.category() == null ? old.category() : r.category(),
                r.address() == null ? old.address() : r.address(),
                r.lat() == null ? old.lat() : r.lat(),
                r.lng() == null ? old.lng() : r.lng(),
                r.radius() == null ? old.radius() : r.radius(),
                r.text().trim(), old.version() + 1, Poi.DRAFT, Instant.now().toString());
        return repo.save(poi);
    }

    /** Xuất bản: đánh dấu PUBLISHED và phát content.published kèm tên + nội dung để các service sau xử lý. */
    public ContentPublishedEvent publish(long id) {
        Poi poi = get(id);
        repo.save(new Poi(poi.id(), poi.name(), poi.category(), poi.address(), poi.lat(), poi.lng(), poi.radius(),
                poi.text(), poi.version(), Poi.PUBLISHED, Instant.now().toString()));
        ContentPublishedEvent event = new ContentPublishedEvent(
                UUID.randomUUID().toString(), poi.id(), poi.version(), LANGS, Instant.now().toString(),
                poi.name(), poi.text());
        publisher.publish(RabbitConfig.RK_CONTENT_PUBLISHED, event);
        return event;
    }

    private static String orEmpty(String s) {
        return s == null ? "" : s.trim();
    }
}
