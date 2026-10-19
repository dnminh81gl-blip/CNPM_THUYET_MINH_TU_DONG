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
        viToEn.put("chùa một cột", "One Pillar Pagoda");
        viToEn.put("văn miếu", "Temple of Literature");
        viToEn.put("dinh độc lập", "Independence Palace");
        viToEn.put("nhà thờ đức bà", "Notre-Dame Cathedral");
        viToEn.put("phố cổ hội an", "Hoi An Ancient Town");
        viToEn.put("hồ hoàn kiếm", "Hoan Kiem Lake");
        // 5 diem tham quan Quan 1 (TP.HCM) dang dung trong content-service
        viToEn.put("bưu điện trung tâm sài gòn", "Saigon Central Post Office");
        viToEn.put("nhà hát thành phố", "Saigon Opera House");
        viToEn.put("bảo tàng thành phố hồ chí minh", "Ho Chi Minh City Museum");
        viToEn.put("bảo tàng tp.hcm", "Ho Chi Minh City Museum");
        viToEn.put("thành phố hồ chí minh", "Ho Chi Minh City");
        viToEn.put("sài gòn", "Saigon");
        viToEn.put("chúc bạn có chuyến tham quan thú vị", "have a pleasant visit");
        viToEn.put("chào mừng bạn đến với", "welcome to");
        viToEn.put("thuyết minh tự động", "automated audio narration");
        viToEn.put("di tích lịch sử", "historical relic");
        viToEn.put("kiến trúc", "architecture");
        viToEn.put("văn hóa", "culture");
        phrasebook.put("vi->en", viToEn);

        // Mẫu câu tiếng Việt -> Tiếng Trung
        Map<String, String> viToZh = new HashMap<>();
        viToZh.put("chào mừng", "欢迎");
        viToZh.put("chùa một cột", "一柱寺");
        viToZh.put("văn miếu", "文庙");
        viToZh.put("dinh độc lập", "统一宫");
        viToZh.put("nhà thờ đức bà", "红教堂");
        viToZh.put("phố cổ hội an", "会安古镇");
        viToZh.put("hồ hoàn kiếm", "还剑湖");
        viToZh.put("bưu điện trung tâm sài gòn", "西贡中心邮局");
        viToZh.put("nhà hát thành phố", "西贡歌剧院");
        viToZh.put("bảo tàng thành phố hồ chí minh", "胡志明市博物馆");
        viToZh.put("bảo tàng tp.hcm", "胡志明市博物馆");
        viToZh.put("thành phố hồ chí minh", "胡志明市");
        viToZh.put("sài gòn", "西贡");
        viToZh.put("chúc bạn có chuyến tham quan thú vị", "祝您参观愉快");
        viToZh.put("chào mừng bạn đến với", "欢迎来到");
        viToZh.put("thuyết minh tự động", "自动语音解说");
        viToZh.put("di tích lịch sử", "历史遗迹");
        viToZh.put("kiến trúc", "建筑");
        viToZh.put("văn hóa", "文化");
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
