/*
 * 健澜科技 jlmedaios - 放射报告 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_report.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.radiology_report.entity.RadiologyReport;
import com.jlmedaios.monolith.radiology_report.service.RadiologyReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 放射报告 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/radiology/report")
public class RadiologyReportController {

    private final RadiologyReportService radiologyReportService;

    /**
     * 创建放射报告草稿。
     *
     * @param body {examId, patientId, studyType, studyDate, indication, findings, impression, radiologistId}
     * @return Result<RadiologyReport>
     */
    @PostMapping
    public Result<RadiologyReport> create(@RequestBody Map<String, Object> body) {
        RadiologyReport report = radiologyReportService.create(
                Long.valueOf(String.valueOf(body.get("examId"))),
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("studyType")),
                LocalDate.parse(String.valueOf(body.get("studyDate"))),
                String.valueOf(body.get("indication")),
                String.valueOf(body.get("findings")),
                String.valueOf(body.get("impression")),
                String.valueOf(body.get("radiologistId"))
        );
        return Result.ok(report);
    }

    /**
     * 审核签名。
     *
     * @param id 报告 ID
     * @return Result<RadiologyReport>
     */
    @PutMapping("/{id}/sign")
    public Result<RadiologyReport> sign(@PathVariable Long id) {
        return radiologyReportService.sign(id)
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 按患者查询放射报告列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<RadiologyReport>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<RadiologyReport>> listByPatient(@PathVariable Long patientId) {
        return Result.ok(radiologyReportService.listByPatient(patientId));
    }
}
