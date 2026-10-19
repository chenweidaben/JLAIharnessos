/*
 * 健澜科技 jlmedaios - 影像高级 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_advanced.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.radiology_advanced.entity.RadiologyOrder;
import com.jlmedaios.monolith.radiology_advanced.entity.RadiologyReport;
import com.jlmedaios.monolith.radiology_advanced.service.RadiologyAdvancedService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 影像高级 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/radiology")
public class RadiologyAdvancedController {

    private final RadiologyAdvancedService radiologyAdvancedService;

    /**
     * 创建影像申请单。
     *
     * @param body {orderNo, patientId, bodyPart, examType, clinicalInfo}
     * @return Result<RadiologyOrder>
     */
    @PostMapping("/order")
    public Result<RadiologyOrder> createOrder(@RequestBody Map<String, Object> body) {
        RadiologyOrder order = radiologyAdvancedService.createOrder(
                String.valueOf(body.get("orderNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("bodyPart")),
                String.valueOf(body.get("examType")),
                String.valueOf(body.get("clinicalInfo"))
        );
        return Result.ok(order);
    }

    /**
     * 完成检查。
     *
     * @param id 申请单 ID
     * @return Result<RadiologyOrder>
     */
    @PutMapping("/order/{id}/complete")
    public Result<RadiologyOrder> completeExam(@PathVariable Long id) {
        return radiologyAdvancedService.completeExam(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 创建影像报告。
     *
     * @param body {orderNo, patientId, modality, impression, findings, conclusion, reportDoctor}
     * @return Result<RadiologyReport>
     */
    @PostMapping("/report")
    public Result<RadiologyReport> createReport(@RequestBody Map<String, Object> body) {
        RadiologyReport report = radiologyAdvancedService.createReport(
                String.valueOf(body.get("orderNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("modality")),
                String.valueOf(body.get("impression")),
                String.valueOf(body.get("findings")),
                String.valueOf(body.get("conclusion")),
                String.valueOf(body.get("reportDoctor"))
        );
        return Result.ok(report);
    }

    /**
     * 审核报告。
     *
     * @param id   报告 ID
     * @param body {reviewDoctor}
     * @return Result<RadiologyReport>
     */
    @PutMapping("/report/{id}/review")
    public Result<RadiologyReport> reviewReport(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return radiologyAdvancedService.reviewReport(id, String.valueOf(body.get("reviewDoctor")))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }
}
