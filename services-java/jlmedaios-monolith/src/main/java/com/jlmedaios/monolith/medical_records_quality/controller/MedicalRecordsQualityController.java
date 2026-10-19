/*
 * 健澜科技 jlmedaios - 病历质控 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_records_quality.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.medical_records_quality.entity.MRQCRecord;
import com.jlmedaios.monolith.medical_records_quality.service.MedicalRecordsQualityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 病历质控 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mrqc")
public class MedicalRecordsQualityController {

    private final MedicalRecordsQualityService medicalRecordsQualityService;

    /**
     * 病历质控。
     *
     * @param body {recordNo, medicalRecordNo, deptCode, qcType, qcItemsJSON}
     * @return Result<MRQCRecord>
     */
    @PostMapping("/check")
    public Result<MRQCRecord> checkRecord(@RequestBody Map<String, Object> body) {
        MRQCRecord record = medicalRecordsQualityService.checkRecord(
                String.valueOf(body.get("recordNo")),
                String.valueOf(body.get("medicalRecordNo")),
                String.valueOf(body.get("deptCode")),
                String.valueOf(body.get("qcType")),
                String.valueOf(body.get("qcItemsJSON"))
        );
        return Result.ok(record);
    }

    /**
     * 整改。
     *
     * @param id 记录 ID
     * @return Result<MRQCRecord>
     */
    @PutMapping("/{id}/rectify")
    public Result<MRQCRecord> rectify(@PathVariable Long id) {
        return medicalRecordsQualityService.rectify(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 待质控列表。
     *
     * @return Result<List<MRQCRecord>>
     */
    @GetMapping("/pending")
    public Result<List<MRQCRecord>> pendingList() {
        return Result.ok(medicalRecordsQualityService.pendingList());
    }

    /**
     * 质控统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(medicalRecordsQualityService.stats());
    }
}
