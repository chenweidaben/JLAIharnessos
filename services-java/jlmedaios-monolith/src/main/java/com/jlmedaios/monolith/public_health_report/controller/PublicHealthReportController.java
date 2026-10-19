/*
 * 健澜科技 jlmedaios - 公共卫生上报 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.public_health_report.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.public_health_report.entity.PublicHealthReport;
import com.jlmedaios.monolith.public_health_report.service.PublicHealthReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 公共卫生上报 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public-health")
public class PublicHealthReportController {

    private final PublicHealthReportService publicHealthReportService;

    /**
     * 创建上报。
     *
     * @param body {reportNo, reportType, patientId, diseaseCode, receivingAuthority}
     * @return Result<PublicHealthReport>
     */
    @PostMapping("/report")
    public Result<PublicHealthReport> createReport(@RequestBody Map<String, Object> body) {
        PublicHealthReport report = publicHealthReportService.createReport(
                String.valueOf(body.get("reportNo")),
                String.valueOf(body.get("reportType")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("diseaseCode")),
                String.valueOf(body.get("receivingAuthority"))
        );
        return Result.ok(report);
    }

    /**
     * 待处理列表。
     *
     * @return Result<List<PublicHealthReport>>
     */
    @GetMapping("/pending")
    public Result<List<PublicHealthReport>> pendingList() {
        return Result.ok(publicHealthReportService.pendingList());
    }

    /**
     * 上报统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(publicHealthReportService.stats());
    }
}
