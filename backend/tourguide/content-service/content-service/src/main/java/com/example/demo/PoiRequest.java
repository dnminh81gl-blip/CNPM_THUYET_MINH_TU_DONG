package com.example.demo;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Dữ liệu admin gửi lên khi thêm / sửa địa điểm. Trường để trống (null) khi sửa = giữ nguyên giá trị cũ. */
public record PoiRequest(
        @NotBlank(message = "Tên địa điểm không được để trống") @Size(max = 120) String name,
        @Size(max = 60) String category,
        @Size(max = 200) String address,
        Double lat,
        Double lng,
        @Min(20) @Max(300) Integer radius,
        @NotBlank(message = "Nội dung giới thiệu không được để trống") @Size(max = 4000) String text
) {
}
