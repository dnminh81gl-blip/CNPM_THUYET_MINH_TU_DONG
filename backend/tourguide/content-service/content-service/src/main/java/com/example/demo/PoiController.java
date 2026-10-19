package com.example.demo;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

/**
 * API quản lý địa điểm. Frontend gọi qua api-gateway: http://localhost:8080/api/pois
 *   GET    /api/pois                 danh sách
 *   GET    /api/pois/{id}            chi tiết
 *   POST   /api/pois                 thêm (bản nháp)
 *   PUT    /api/pois/{id}            sửa (về bản nháp, tăng version)
 *   POST   /api/pois/{id}/publish    xuất bản -> phát content.published kèm nội dung
 */
@RestController
@RequestMapping("/api/pois")
@Validated
public class PoiController {

    private final PoiService service;

    public PoiController(PoiService service) {
        this.service = service;
    }

    @GetMapping
    public List<Poi> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public Poi get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Poi create(@Valid @RequestBody PoiRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public Poi update(@PathVariable long id, @Valid @RequestBody PoiRequest request) {
        return service.update(id, request);
    }

    @PostMapping("/{id}/publish")
    public ContentPublishedEvent publish(@PathVariable long id) {
        return service.publish(id);
    }
}
