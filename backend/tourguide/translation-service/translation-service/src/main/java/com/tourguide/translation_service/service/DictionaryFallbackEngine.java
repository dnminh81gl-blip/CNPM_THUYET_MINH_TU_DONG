package com.tourguide.translation_service.service;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

/**
 * Bộ dịch dự phòng ngoại tuyến (Offline Dictionary & Tourism Phrasebook).
 * Đảm bảo hệ thống luôn có bản dịch hoạt động tốt kể cả khi mất mạng hoặc không có API key.
 */
@Service
public class DictionaryFallbackEngine implements TranslationEngine {

    private final Map<String, Map<String, String>> phrasebook = new HashMap<>();

    public DictionaryFallbackEngine() {
        initPhrasebook();
    }

    private void initPhrasebook() {
        // Mẫu câu tiếng Việt -> Tiếng Anh
        Map<String, String> viToEn = new HashMap<>();
        viToEn.put("chào mừng", "welcome");
        viToEn.put("chào mừng bạn đến với", "welcome to");
        viToEn.put("chúc bạn có chuyến tham quan thú vị", "have a pleasant visit");
        viToEn.put("thuyết minh tự động", "automated audio narration");
        viToEn.put("di tích lịch sử", "historical relic");
        viToEn.put("kiến trúc", "architecture");
        viToEn.put("văn hóa", "culture");
        viToEn.put("thành phố hồ chí minh", "Ho Chi Minh City");
        viToEn.put("sài gòn", "Saigon");

        // Từ vựng Dinh Độc Lập và các điểm tham quan
        viToEn.put("dinh độc lập", "Independence Palace");
        viToEn.put("phòng trình quốc thư", "Credentials Room");
        viToEn.put("phòng họp nội các", "Cabinet Room");
        viToEn.put("sân thượng", "rooftop");
        viToEn.put("trực thăng", "helicopter");
        viToEn.put("bãi đáp trực thăng", "helipad");
        viToEn.put("tầng hầm", "basement");
        viToEn.put("tầng hầm chỉ huy", "Command Bunker");
        viToEn.put("hầm chỉ huy", "command bunker");
        viToEn.put("xe tăng", "tank");
        viToEn.put("cổng chính", "main gate");
        viToEn.put("mặt tiền", "facade");
        viToEn.put("khuôn viên", "grounds");
        phrasebook.put("vi->en", viToEn);

        // Mẫu câu tiếng Việt -> Tiếng Trung
        Map<String, String> viToZh = new HashMap<>();
        viToZh.put("chào mừng", "欢迎");
        viToZh.put("chào mừng bạn đến với", "欢迎来到");
        viToZh.put("chúc bạn có chuyến tham quan thú vị", "祝您参观愉快");
        viToZh.put("thuyết minh tự động", "自动语音解说");
        viToZh.put("di tích lịch sử", "历史遗迹");
        viToZh.put("kiến trúc", "建筑");
        viToZh.put("văn hóa", "文化");
        viToZh.put("thành phố hồ chí minh", "胡志明市");
        viToZh.put("sài gòn", "西贡");

        // Từ vựng Dinh Độc Lập và các điểm tham quan
        viToZh.put("dinh độc lập", "统一宫");
        viToZh.put("phòng trình quốc thư", "国书递交厅");
        viToZh.put("phòng họp nội các", "内阁会议室");
        viToZh.put("sân thượng", "屋顶");
        viToZh.put("trực thăng", "直升机");
        viToZh.put("bãi đáp trực thăng", "直升机停机坪");
        viToZh.put("tầng hầm", "地下室");
        viToZh.put("tầng hầm chỉ huy", "地下指挥所");
        viToZh.put("hầm chỉ huy", "指挥地堡");
        viToZh.put("xe tăng", "坦克");
        viToZh.put("cổng chính", "正门");
        viToZh.put("mặt tiền", "正立面");
        viToZh.put("khuôn viên", "园区");
        phrasebook.put("vi->zh", viToZh);
    }

    @Override
    public String translate(String text, String sourceLang, String targetLang) {
        if (text == null || text.isBlank()) {
            return "";
        }
        if (sourceLang.equalsIgnoreCase(targetLang)) {
            return text;
        }

        String pair = sourceLang.toLowerCase() + "->" + targetLang.toLowerCase();
        Map<String, String> dict = phrasebook.get(pair);

        String result = text;
        if (dict != null) {
            // Cum tu dai thay truoc (vd "chào mừng bạn đến với" truoc "chào mừng"); quote de dau "." khong thanh regex
            List<Map.Entry<String, String>> entries = dict.entrySet().stream()
                    .sorted(Comparator.comparingInt((Map.Entry<String, String> e) -> e.getKey().length()).reversed())
                    .toList();
            for (Map.Entry<String, String> entry : entries) {
                Pattern p = Pattern.compile(Pattern.quote(entry.getKey()),
                        Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
                result = p.matcher(result).replaceAll(Matcher.quoteReplacement(entry.getValue()));
            }
        }

        // Nếu là tiếng Anh, gắn nhãn mô tả nếu chưa thay đổi nhiều
        if ("en".equalsIgnoreCase(targetLang)) {
            if (result.equals(text)) {
                return "[EN] " + text;
            }
            return result;
        }

        // Nếu là tiếng Trung
        if ("zh".equalsIgnoreCase(targetLang)) {
            if (result.equals(text)) {
                return "[ZH] " + text;
            }
            return result;
        }

        return "[" + targetLang.toUpperCase() + "] " + text;
    }

    @Override
    public String getEngineName() {
        return "offline_dictionary";
    }
}
