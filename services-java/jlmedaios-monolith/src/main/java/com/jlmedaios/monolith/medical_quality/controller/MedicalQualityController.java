/*
 * 健澜科技 jlmedaios - 医疗质量控制 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_quality.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.medical_quality.entity.QualityCheckRecord;
import com.jlmedaios.monolith.medical_quality.entity.QualityIndicator;
import com.jlmedaios.monolith.medical_quality.service.MedicalQualityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 医疗质量控制 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/quality")
public class MedicalQualityController {

    private final MedicalQualityService medicalQualityService;

    /**
     * 质量指标列表。
     *
     * @return Result<List<QualityIndicator>>
     */
    @GetMapping("/indicators")
    public Result<List<QualityIndicator>> indicatorList() {
        return Result.ok(medicalQualityService.indicatorList());
    }

    /**
     * 创建质量检查记录。
     *
     * @param body {checkNo, department, checker, findings, conclusion}
     * @return Result<QualityCheckRecord>
     */
    @PostMapping("/check")
    public Result<QualityCheckRecord> createCheck(@RequestBody Map<String, Object> body) {
        QualityCheckRecord record = medicalQualityService.createCheck(
                String.valueOf(body.get("checkNo")),
                String.valueOf(body.get("department")),
                String.valueOf(body.get("checker")),
                String.valueOf(body.get("findings")),
                String.valueOf(body.get("conclusion"))
        );
        return Result.ok(record);
    }

    /**
     * 质量统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(medicalQualityService.stats());
    }
}
