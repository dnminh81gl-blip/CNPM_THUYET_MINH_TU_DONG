package com.tourguide.narration_service;

import org.springframework.stereotype.Component;

/**
 * Soạn BÀI THUYẾT MINH từ nội dung địa điểm: câu chào mở đầu + nội dung giới thiệu + câu kết.
 * Bài này (tiếng Việt) được gửi cho translation-service dịch sang các ngôn ngữ khác.
 * Muốn đổi giọng văn thuyết minh (thêm lời dẫn, cắt ngắn...) chỉ cần sửa lớp này.
 */
@Component
public class NarrationComposer {

    static final String CLOSING = "Chúc bạn có chuyến tham quan thú vị.";

    /** @return bài thuyết minh, hoặc null nếu không có cả tên lẫn nội dung (sự kiện từ phiên bản cũ). */
    public String compose(String name, String text) {
        String n = clean(name), t = clean(text);
        if (n.isEmpty() && t.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        if (!n.isEmpty()) {
            sb.append("Chào mừng bạn đến với ").append(n).append('.');
        }
        if (!t.isEmpty()) {
            if (sb.length() > 0) sb.append(' ');
            sb.append(endWithPeriod(t));
        }
        sb.append(' ').append(CLOSING);
        return sb.toString();
    }

    /** Bỏ khoảng trắng thừa, gộp nhiều dòng thành một đoạn để đọc liền mạch. */
    private static String clean(String s) {
        return s == null ? "" : s.replaceAll("\\s+", " ").trim();
    }

    private static String endWithPeriod(String s) {
        char last = s.charAt(s.length() - 1);
        return (last == '.' || last == '!' || last == '?' || last == '…') ? s : s + ".";
    }
}
