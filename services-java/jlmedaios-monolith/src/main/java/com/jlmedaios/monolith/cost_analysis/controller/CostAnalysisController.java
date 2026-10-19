/*
 * 健澜科技 jlmedaios - 成本核算 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.cost_analysis.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.cost_analysis.entity.CostItem;
import com.jlmedaios.monolith.cost_analysis.service.CostAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 成本核算 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/cost")
public class CostAnalysisController {

    private final CostAnalysisService costAnalysisService;

    /**
     * 记录成本。
     *
     * @param body {costCode, costName, category, amount, department, period}
     * @return Result<CostItem>
     */
    @PostMapping("/record")
    public Result<CostItem> record(@RequestBody Map<String, Object> body) {
        CostItem item = costAnalysisService.record(
                String.valueOf(body.get("costCode")),
                String.valueOf(body.get("costName")),
                String.valueOf(body.get("category")),
                new BigDecimal(String.valueOf(body.get("amount"))),
                String.valueOf(body.get("department")),
                String.valueOf(body.get("period"))
        );
        return Result.ok(item);
    }

    /**
     * 科室成本汇总。
     *
     * @param deptCode 科室编码
     * @return Result<List<CostItem>>
     */
    @GetMapping("/department/{deptCode}")
    public Result<List<CostItem>> deptSummary(@PathVariable String deptCode) {
        return Result.ok(costAnalysisService.deptSummary(deptCode));
    }

    /**
     * 成本结构分析。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/analysis")
    public Result<Map<String, Object>> analysis() {
        return Result.ok(costAnalysisService.analysis());
    }
}
