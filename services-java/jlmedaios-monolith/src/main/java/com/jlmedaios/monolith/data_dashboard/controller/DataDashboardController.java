/*
 * 健澜科技 jlmedaios - 数据看板 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_dashboard.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.data_dashboard.service.DataDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 数据看板 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dashboard")
public class DataDashboardController {

    private final DataDashboardService dataDashboardService;

    /**
     * 全院概览。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/hospital-overview")
    public Result<Map<String, Object>> hospitalOverview() {
        return Result.ok(dataDashboardService.hospitalOverview());
    }

    /**
     * 科室看板。
     *
     * @param deptCode 科室编码
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/department/{deptCode}")
    public Result<Map<String, Object>> departmentBoard(@PathVariable String deptCode) {
        return Result.ok(dataDashboardService.departmentBoard(deptCode));
    }

    /**
     * 实时数据。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/real-time")
    public Result<Map<String, Object>> realTimeData() {
        return Result.ok(dataDashboardService.realTimeData());
    }
}
