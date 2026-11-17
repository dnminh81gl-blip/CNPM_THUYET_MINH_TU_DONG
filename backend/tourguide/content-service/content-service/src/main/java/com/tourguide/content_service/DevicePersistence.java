package com.tourguide.content_service;

import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Lưu thiết bị và lượt nghe xuống đĩa để KHÔNG mất khi content-service khởi động lại.
 * - Khởi động: đọc lại file (nếu có).
 * - Đang chạy: cứ SAVE_EVERY_SECONDS giây, nếu có thay đổi thì ghi file (ghi ra file tạm rồi đổi tên, không bao giờ để file dở).
 * - Tắt service: ghi lần cuối.
 * Thư mục lấy từ tourguide.data-dir (mặc định ./data); trong Docker là /app/data, gắn với volume content-data.
 */
@Component
public class DevicePersistence implements InitializingBean, DisposableBean {

    static final String FILE_NAME = "devices.bin";
    static final long SAVE_EVERY_SECONDS = 5;
    private static final Logger log = LoggerFactory.getLogger(DevicePersistence.class);

    /** Chỉ cho phép đọc lại đúng các kiểu dữ liệu của mình (chống nạp đối tượng lạ từ file). */
    private static final ObjectInputFilter ALLOWED = ObjectInputFilter.Config.createFilter(
            "com.tourguide.content_service.DeviceSnapshot;com.tourguide.content_service.Device;"
            + "com.tourguide.content_service.ListenRecord;java.util.*;java.lang.*;!*");

    private final DeviceService service;
    private final Path file;
    private long savedChanges = 0;   // 0 = chưa có thay đổi nào cần ghi
    private ScheduledExecutorService timer;

    public DevicePersistence(DeviceService service, @Value("${tourguide.data-dir:data}") String dataDir) {
        this.service = service;
        this.file = Path.of(dataDir).resolve(FILE_NAME);
    }

    @Override
    public void afterPropertiesSet() {
        load();
        timer = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "device-persistence");
            t.setDaemon(true);
            return t;
        });
        timer.scheduleWithFixedDelay(this::saveIfChanged, SAVE_EVERY_SECONDS, SAVE_EVERY_SECONDS, TimeUnit.SECONDS);
    }

    @Override
    public void destroy() {
        if (timer != null) {
            timer.shutdown();
        }
        saveIfChanged();
    }

    /** Đọc số liệu đã lưu; file hỏng hoặc chưa có thì bắt đầu từ trống, không làm service dừng. */
    boolean load() {
        if (!Files.exists(file)) {
            return false;
        }
        try (InputStream in = Files.newInputStream(file); ObjectInputStream ois = new ObjectInputStream(in)) {
            ois.setObjectInputFilter(ALLOWED);
            service.restore((DeviceSnapshot) ois.readObject());
            savedChanges = service.changeCount();
            log.info("Đã nạp lại số liệu thiết bị từ {}", file.toAbsolutePath());
            return true;
        } catch (IOException | ClassNotFoundException | ClassCastException e) {
            log.warn("Không đọc được {} ({}), bắt đầu với số liệu trống", file.toAbsolutePath(), e.getMessage());
            return false;
        }
    }

    /** Ghi file nếu có thay đổi kể từ lần ghi trước. */
    synchronized void saveIfChanged() {
        long changes = service.changeCount();
        if (changes == savedChanges) {
            return;
        }
        try {
            Files.createDirectories(file.getParent() == null ? Path.of(".") : file.getParent());
            Path tmp = file.resolveSibling(FILE_NAME + ".tmp");
            try (OutputStream out = Files.newOutputStream(tmp); ObjectOutputStream oos = new ObjectOutputStream(out)) {
                oos.writeObject(service.snapshot());
            }
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            savedChanges = changes;
        } catch (IOException e) {
            log.warn("Không ghi được {}: {}", file.toAbsolutePath(), e.getMessage());
        }
    }
}
