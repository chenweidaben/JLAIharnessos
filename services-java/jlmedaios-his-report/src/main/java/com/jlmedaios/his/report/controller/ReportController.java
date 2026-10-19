/*
 * 健澜科技 jlmedaios - 报表统计 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.report.controller;

import com.jlmedaios.his.report.common.Result;
import com.jlmedaios.his.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 报表统计 Controller（纯 mock）。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/his/report")
public class ReportController {

    private final ReportService reportService;

    /**
     * 门诊日报。
     *
     * @return Result<Map<String,Object>>
     */
    @GetMapping("/outpatient/daily")
    public Result<Map<String, Object>> outpatientDaily() {
        return Result.ok(reportService.outpatientDaily());
    }

    /**
     * 住院床位占用率。
     *
     * @return Result<Map<String,Object>>
     */
    @GetMapping("/inpatient/occupancy")
    public Result<Map<String, Object>> inpatientOccupancy() {
        return Result.ok(reportService.inpatientOccupancy());
    }

    /**
     * 药房销售日报。
     *
     * @return Result<Map<String,Object>>
     */
    @GetMapping("/pharmacy/sales")
    public Result<Map<String, Object>> pharmacySales() {
        return Result.ok(reportService.pharmacySales());
    }
}
