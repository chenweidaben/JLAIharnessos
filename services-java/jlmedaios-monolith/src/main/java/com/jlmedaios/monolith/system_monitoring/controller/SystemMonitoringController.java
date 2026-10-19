/*
 * 健澜科技 jlmedaios - 系统监控 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.system_monitoring.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.system_monitoring.entity.SystemMetric;
import com.jlmedaios.monolith.system_monitoring.service.SystemMonitoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 系统监控 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/monitor")
public class SystemMonitoringController {

    private final SystemMonitoringService systemMonitoringService;

    /**
     * 系统健康检查。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/health")
    public Result<Map<String, Object>> healthCheck() {
        return Result.ok(systemMonitoringService.healthCheck());
    }

    /**
     * 实时性能指标。
     *
     * @return Result<List<SystemMetric>>
     */
    @GetMapping("/metrics")
    public Result<List<SystemMetric>> realTimeMetrics() {
        return Result.ok(systemMonitoringService.realTimeMetrics());
    }

    /**
     * 活跃告警列表。
     *
     * @return Result<List<SystemMetric>>
     */
    @GetMapping("/alerts")
    public Result<List<SystemMetric>> activeAlerts() {
        return Result.ok(systemMonitoringService.activeAlerts());
    }
}
