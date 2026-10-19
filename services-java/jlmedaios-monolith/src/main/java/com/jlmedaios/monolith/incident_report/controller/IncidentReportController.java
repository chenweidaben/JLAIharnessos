/*
 * 健澜科技 jlmedaios - 不良事件上报 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.incident_report.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.incident_report.entity.IncidentReport;
import com.jlmedaios.monolith.incident_report.service.IncidentReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 不良事件上报 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/incident")
public class IncidentReportController {

    private final IncidentReportService incidentReportService;

    /**
     * 上报不良事件。
     *
     * @param body {reportNo, reporterId, eventType, eventLevel, description, eventTime}
     * @return Result<IncidentReport>
     */
    @PostMapping("/report")
    public Result<IncidentReport> report(@RequestBody Map<String, Object> body) {
        IncidentReport report = incidentReportService.report(
                String.valueOf(body.get("reportNo")),
                String.valueOf(body.get("reporterId")),
                String.valueOf(body.get("eventType")),
                String.valueOf(body.get("eventLevel")),
                String.valueOf(body.get("description")),
                LocalDateTime.parse(String.valueOf(body.get("eventTime")))
        );
        return Result.ok(report);
    }

    /**
     * 开始调查。
     *
     * @param id 不良事件 ID
     * @return Result<IncidentReport>
     */
    @PutMapping("/{id}/investigate")
    public Result<IncidentReport> investigate(@PathVariable Long id) {
        return incidentReportService.investigate(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 结案。
     *
     * @param id   不良事件 ID
     * @param body {rootCause}
     * @return Result<IncidentReport>
     */
    @PutMapping("/{id}/close")
    public Result<IncidentReport> close(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return incidentReportService.close(id, String.valueOf(body.get("rootCause")))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 待处理列表。
     *
     * @return Result<List<IncidentReport>>
     */
    @GetMapping("/pending")
    public Result<List<IncidentReport>> pendingList() {
        return Result.ok(incidentReportService.pendingList());
    }
}
