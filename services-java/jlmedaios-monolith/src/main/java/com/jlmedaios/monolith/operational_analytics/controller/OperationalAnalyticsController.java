/*
 * 健澜科技 jlmedaios - 运营分析 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.operational_analytics.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.operational_analytics.service.OperationalAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 运营分析 Controller。
 *
 * <p>数据从各模块聚合，生产接数仓/OLAP（ClickHouse/Doris）</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/analytics")
public class OperationalAnalyticsController {

    private final OperationalAnalyticsService operationalAnalyticsService;

    /**
     * 科室运营汇总。
     *
     * @param deptCode 科室编码
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/dept/{deptCode}/summary")
    public Result<Map<String, Object>> deptSummary(@PathVariable String deptCode) {
        return Result.ok(operationalAnalyticsService.deptSummary(deptCode));
    }

    /**
     * 全院概览。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/hospital/overview")
    public Result<Map<String, Object>> hospitalOverview() {
        return Result.ok(operationalAnalyticsService.hospitalOverview());
    }

    /**
     * 科室间对比。
     *
     * @param metricName 指标名称
     * @return Result<List<Map<String, Object>>>
     */
    @GetMapping("/compare")
    public Result<List<Map<String, Object>>> compareByMetric(@RequestParam String metricName) {
        return Result.ok(operationalAnalyticsService.compareByMetric(metricName));
    }
}
