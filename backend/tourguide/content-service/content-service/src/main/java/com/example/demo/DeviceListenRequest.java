package com.example.demo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Web gửi lên khi một thiết bị bắt đầu nghe thuyết minh của một POI. */
public record DeviceListenRequest(
        @NotBlank @Size(max = 64) String deviceId,
        @NotNull Long poiId,
        @Size(max = 10) String lang
) {
}
