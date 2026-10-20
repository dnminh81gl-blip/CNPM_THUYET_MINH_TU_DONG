package com.example.demo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

class PoiServiceTest {

    private final EventPublisher publisher = mock(EventPublisher.class);
    private final PoiService service = new PoiService(new PoiRepository(), publisher);

    private static PoiRequest req(String name, String text) {
        return new PoiRequest(name, "Chợ", "Lê Lợi, Q.1", 10.7725, 106.6980, 60, text);
    }

    @Test
    void startsWithFiveSamplePlaces() {
        List<Poi> all = service.list();
        assertEquals(6, all.size());
        assertEquals("Cổng chính và xe tăng", all.get(0).name());
    }

    @Test
    void createIsDraftAndSendsNothing() {
        Poi p = service.create(req("Chợ Bến Thành", "Chợ Bến Thành được xây dựng năm 1914."));
        assertEquals(6L, p.id());
        assertEquals(Poi.DRAFT, p.status());
        assertEquals(1, p.version());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void publishSendsEventWithRealNameAndText() {
        Poi p = service.create(req("Chợ Bến Thành", "Chợ Bến Thành được xây dựng năm 1914."));
        service.publish(p.id());

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(publisher).publish(eq(RabbitConfig.RK_CONTENT_PUBLISHED), captor.capture());
        ContentPublishedEvent e = (ContentPublishedEvent) captor.getValue();
        assertEquals(p.id(), e.poiId());
        assertEquals("Chợ Bến Thành", e.name());
        assertEquals("Chợ Bến Thành được xây dựng năm 1914.", e.text());
        assertEquals(List.of("vi", "en", "zh"), e.langs());
        assertEquals(Poi.PUBLISHED, service.get(p.id()).status());
    }

    @Test
    void updateBumpsVersionAndReturnsToDraft() {
        Poi edited = service.update(3, req("Phòng Trình Quốc thư", "Nội dung mới."));
        assertEquals(2, edited.version());
        assertEquals(Poi.DRAFT, edited.status());
        assertEquals("Nội dung mới.", service.publish(3).text());
    }

    @Test
    void unknownPlaceIsNotFound() {
        assertThrows(ResponseStatusException.class, () -> service.publish(999));
    }
}
