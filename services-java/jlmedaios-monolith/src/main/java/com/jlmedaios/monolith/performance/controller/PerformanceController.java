/*
 * 健澜科技 jlmedaios - 绩效考核 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.performance.entity.PerformanceIndicator;
import com.jlmedaios.monolith.performance.entity.PerformanceResult;
import com.jlmedaios.monolith.performance.entity.PerformanceScore;
import com.jlmedaios.monolith.performance.service.PerformanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 绩效考核 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/performance")
public class PerformanceController {

    private final PerformanceService performanceService;

    /**
     * 录入绩效分。
     *
     * @param body {staffId, deptCode, period, metricCode, score, weight}
     * @return Result<PerformanceScore>
     */
    @PostMapping("/score")
    public Result<PerformanceScore> recordScore(@RequestBody Map<String, Object> body) {
        PerformanceScore ps = performanceService.recordScore(
                String.valueOf(body.get("staffId")),
                String.valueOf(body.get("deptCode")),
                String.valueOf(body.get("period")),
                String.valueOf(body.get("metricCode")),
                new BigDecimal(String.valueOf(body.get("score"))),
                new BigDecimal(String.valueOf(body.get("weight")))
        );
        return Result.ok(ps);
    }

    /**
     * 科室绩效汇总（mock）。
     *
     * @param deptCode 科室编码
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/dept/{deptCode}/summary")
    public Result<Map<String, Object>> deptSummary(@PathVariable String deptCode) {
        return Result.ok(performanceService.deptSummary(deptCode));
    }

    /**
     * 员工绩效历史。
     *
     * @param staffId 员工工号
     * @return Result<List<PerformanceScore>>
     */
    @GetMapping("/staff/{staffId}/history")
    public Result<List<PerformanceScore>> staffHistory(@PathVariable String staffId) {
        return Result.ok(performanceService.staffHistory(staffId));
    }

    /**
     * 全部考核指标。
     *
     * @return Result<List<PerformanceIndicator>>
     */
    @GetMapping("/indicators")
    public Result<List<PerformanceIndicator>> allIndicators() {
        return Result.ok(performanceService.allIndicators());
    }

    /**
     * 生成考核结果。
     *
     * @param body {departmentCode, period}
     * @return Result<PerformanceResult>
     */
    @PostMapping("/evaluate")
    public Result<PerformanceResult> evaluate(@RequestBody Map<String, Object> body) {
        PerformanceResult result = performanceService.evaluate(
                String.valueOf(body.get("departmentCode")),
                String.valueOf(body.get("period"))
        );
        return Result.ok(result);
    }

    /**
     * 科室排名。
     *
     * @param period 周期
     * @return Result<List<PerformanceResult>>
     */
    @GetMapping("/ranking")
    public Result<List<PerformanceResult>> ranking(@RequestParam String period) {
        return Result.ok(performanceService.ranking(period));
    }
}
