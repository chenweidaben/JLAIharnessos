/*
 * 健澜科技 jlmedaios - 管理驾驶舱 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin_dashboard.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.admin_dashboard.entity.ExecutiveKPI;
import com.jlmedaios.monolith.admin_dashboard.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 管理驾驶舱 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    /**
     * 院长概览。
     *
     * @return Result<List<ExecutiveKPI>>
     */
    @GetMapping("/overview")
    public Result<List<ExecutiveKPI>> executiveOverview() {
        return Result.ok(adminDashboardService.executiveOverview());
    }

    /**
     * 科主任视角。
     *
     * @param deptCode 科室编码
     * @return Result<List<ExecutiveKPI>>
     */
    @GetMapping("/dept/{deptCode}")
    public Result<List<ExecutiveKPI>> deptView(@PathVariable String deptCode) {
        return Result.ok(adminDashboardService.deptView(deptCode));
    }

    /**
     * 管理预警。
     *
     * @return Result<List<ExecutiveKPI>>
     */
    @GetMapping("/alerts")
    public Result<List<ExecutiveKPI>> alerts() {
        return Result.ok(adminDashboardService.alerts());
    }
}
