package com.tourguide.translation_service.service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Cat van ban dai thanh cac doan nho de goi API dich.
 * MyMemory chi nhan toi da 500 BYTE moi lan (tieng Viet co dau ton 2-3 byte/ky tu),
 * nen moi doan giu duoi {@link #DEFAULT_MAX_BYTES} byte, uu tien cat o cuoi cau roi toi khoang trang.
 */
public final class TextChunker {

    public static final int DEFAULT_MAX_BYTES = 450;

    private TextChunker() {
    }

    public static List<String> split(String text) {
        return split(text, DEFAULT_MAX_BYTES);
    }

    public static List<String> split(String text, int maxBytes) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return chunks;
        }
        StringBuilder current = new StringBuilder();
        for (String sentence : text.trim().split("(?<=[.!?。！？])\\s+")) {
            for (String piece : fit(sentence, maxBytes)) {
                String candidate = current.length() == 0 ? piece : current + " " + piece;
                if (bytes(candidate) <= maxBytes) {
                    current.setLength(0);
                    current.append(candidate);
                } else {
                    chunks.add(current.toString());
                    current.setLength(0);
                    current.append(piece);
                }
            }
        }
        if (current.length() > 0) {
            chunks.add(current.toString());
        }
        return chunks;
    }

    /** Mot cau qua dai thi cat theo tu; mot "tu" qua dai (hiem) thi cat theo ky tu. */
    private static List<String> fit(String sentence, int maxBytes) {
        List<String> parts = new ArrayList<>();
        if (bytes(sentence) <= maxBytes) {
            parts.add(sentence);
            return parts;
        }
        StringBuilder current = new StringBuilder();
        for (String word : sentence.split("\\s+")) {
            if (bytes(word) > maxBytes) {
                if (current.length() > 0) {
                    parts.add(current.toString());
                    current.setLength(0);
                }
                parts.addAll(hardSplit(word, maxBytes));
                continue;
            }
            String candidate = current.length() == 0 ? word : current + " " + word;
            if (bytes(candidate) <= maxBytes) {
                current.setLength(0);
                current.append(candidate);
            } else {
                parts.add(current.toString());
                current.setLength(0);
                current.append(word);
            }
        }
        if (current.length() > 0) {
            parts.add(current.toString());
        }
        return parts;
    }

    private static List<String> hardSplit(String word, int maxBytes) {
        List<String> parts = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        word.codePoints().forEach(cp -> {
            String ch = new String(Character.toChars(cp));
            if (bytes(current + ch) > maxBytes) {
                parts.add(current.toString());
                current.setLength(0);
            }
            current.append(ch);
        });
        if (current.length() > 0) {
            parts.add(current.toString());
        }
        return parts;
    }

    static int bytes(String s) {
        return s.getBytes(StandardCharsets.UTF_8).length;
    }
}
