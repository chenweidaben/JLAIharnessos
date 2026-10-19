/*
 * 健澜科技 jlmedaios - 运营看板 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.opdashboard.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.opdashboard.entity.DailyKpi;
import com.jlmedaios.monolith.opdashboard.service.OpDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 运营看板 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/opdashboard")
public class OpDashboardController {

    private final OpDashboardService opDashboardService;

    /**
     * 查日 KPI。
     *
     * @param date 统计日期（yyyy-MM-dd）
     * @return Result<DailyKpi>
     */
    @GetMapping("/daily/{date}")
    public Result<DailyKpi> daily(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return opDashboardService.daily(date)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "该日期 KPI 不存在"));
    }

    /**
     * 近 30 天趋势。
     *
     * @return Result<List<DailyKpi>>
     */
    @GetMapping("/trend")
    public Result<List<DailyKpi>> trend() {
        return Result.ok(opDashboardService.trend());
    }

    /**
     * 数据导入。
     *
     * @param body {statDate, outpatientVisits, inpatientCount, avgLOS, pharmacyRatio, revenue}
     * @return Result<DailyKpi>
     */
    @PostMapping("/import")
    public Result<DailyKpi> importKpi(@RequestBody Map<String, Object> body) {
        DailyKpi kpi = opDashboardService.importKpi(
                LocalDate.parse(String.valueOf(body.get("statDate"))),
                Integer.valueOf(String.valueOf(body.get("outpatientVisits"))),
                Integer.valueOf(String.valueOf(body.get("inpatientCount"))),
                new BigDecimal(String.valueOf(body.get("avgLOS"))),
                new BigDecimal(String.valueOf(body.get("pharmacyRatio"))),
                new BigDecimal(String.valueOf(body.get("revenue")))
        );
        return Result.ok(kpi);
    }
}
