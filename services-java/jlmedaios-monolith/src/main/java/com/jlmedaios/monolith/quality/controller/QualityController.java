/*
 * 健澜科技 jlmedaios - 质量 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.quality.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.quality.entity.QualityMetric;
import com.jlmedaios.monolith.quality.service.QualityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 质量 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/quality")
public class QualityController {

    private final QualityService qualityService;

    /**
     * 按科室查询质量指标列表。
     *
     * @param deptCode 科室编码
     * @return Result<List<QualityMetric>>
     */
    @GetMapping("/dept/{deptCode}")
    public Result<List<QualityMetric>> listByDept(@PathVariable String deptCode) {
        return Result.ok(qualityService.listByDept(deptCode));
    }

    /**
     * 全院汇总。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/hospital")
    public Result<Map<String, Object>> hospitalSummary() {
        return Result.ok(qualityService.hospitalSummary());
    }

    /**
     * 录入质量指标。
     *
     * @param body {deptCode, metricCode, periodValue, targetValue, actualValue}
     * @return Result<QualityMetric>
     */
    @PostMapping("/record")
    public Result<QualityMetric> record(@RequestBody Map<String, Object> body) {
        QualityMetric metric = qualityService.record(
                String.valueOf(body.get("deptCode")),
                String.valueOf(body.get("metricCode")),
                String.valueOf(body.get("periodValue")),
                new BigDecimal(String.valueOf(body.get("targetValue"))),
                new BigDecimal(String.valueOf(body.get("actualValue")))
        );
        return Result.ok(metric);
    }
}
