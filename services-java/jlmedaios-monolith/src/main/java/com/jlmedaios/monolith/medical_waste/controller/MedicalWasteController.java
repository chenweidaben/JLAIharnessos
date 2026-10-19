/*
 * 健澜科技 jlmedaios - 医疗废物管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_waste.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.medical_waste.entity.WasteRecord;
import com.jlmedaios.monolith.medical_waste.service.MedicalWasteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 医疗废物管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/waste")
public class MedicalWasteController {

    private final MedicalWasteService medicalWasteService;

    /**
     * 创建废物记录。
     *
     * @param body {recordNo, wasteType, weightKg, generateDepartment}
     * @return Result<WasteRecord>
     */
    @PostMapping("/record")
    public Result<WasteRecord> createRecord(@RequestBody Map<String, Object> body) {
        WasteRecord record = medicalWasteService.createRecord(
                String.valueOf(body.get("recordNo")),
                String.valueOf(body.get("wasteType")),
                new BigDecimal(String.valueOf(body.get("weightKg"))),
                String.valueOf(body.get("generateDepartment"))
        );
        return Result.ok(record);
    }

    /**
     * 转运。
     *
     * @param id   记录 ID
     * @param body {transportCompany, disposalLocation}
     * @return Result<WasteRecord>
     */
    @PutMapping("/record/{id}/transport")
    public Result<WasteRecord> transport(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return medicalWasteService.transport(
                id,
                String.valueOf(body.get("transportCompany")),
                String.valueOf(body.get("disposalLocation"))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 废物统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(medicalWasteService.stats());
    }
}
