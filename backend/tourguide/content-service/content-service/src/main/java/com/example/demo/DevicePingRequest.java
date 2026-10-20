package com.example.demo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Tín hiệu "vẫn đang mở web", gửi mỗi 30 giây. */
public record DevicePingRequest(@NotBlank @Size(max = 64) String deviceId) {
}
