package com.tourguide.translation_service.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

class TextChunkerTest {

    @Test
    void shortTextIsOneChunk() {
        assertEquals(List.of("Xin chào. Tạm biệt."), TextChunker.split("Xin chào. Tạm biệt."));
    }

    @Test
    void blankTextGivesNoChunks() {
        assertTrue(TextChunker.split("   ").isEmpty());
        assertTrue(TextChunker.split(null).isEmpty());
    }

    @Test
    void splitsAtSentenceBoundaries() {
        List<String> chunks = TextChunker.split("Câu một. Câu hai! Câu ba?", 25);
        assertEquals(List.of("Câu một. Câu hai!", "Câu ba?"), chunks);
    }

    @Test
    void veryLongSentenceIsSplitByWordsAndEveryChunkFits() {
        String text = "Bưu điện Trung tâm Sài Gòn ".repeat(40).trim();
        List<String> chunks = TextChunker.split(text, 100);
        assertTrue(chunks.size() > 1);
        chunks.forEach(c -> assertTrue(TextChunker.bytes(c) <= 100));
        assertEquals(text, String.join(" ", chunks));
    }

    @Test
    void hugeWordIsHardSplit() {
        String word = "ạ".repeat(100);                 // 300 byte, khong co khoang trang
        List<String> chunks = TextChunker.split(word, 50);
        chunks.forEach(c -> assertTrue(TextChunker.bytes(c) <= 50));
        assertEquals(word, String.join("", chunks));
    }
}
