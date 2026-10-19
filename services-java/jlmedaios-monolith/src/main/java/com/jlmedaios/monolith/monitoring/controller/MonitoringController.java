/*
 * 健澜科技 jlmedaios - 监控 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.monitoring.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.monitoring.service.MonitoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 监控 Controller。
 *
 * <p>生产接 Prometheus + Grafana</p>
 */
@RestController
@RequiredArgsConstructor
public class MonitoringController {

    private final MonitoringService monitoringService;

    /**
     * 健康检查（mock）。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/actuator/health")
    public Result<Map<String, Object>> health() {
        return Result.ok(monitoringService.health());
    }

    /**
     * 业务指标（mock）。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/actuator/metrics")
    public Result<Map<String, Object>> metrics() {
        return Result.ok(monitoringService.metrics());
    }

    /**
     * 运营仪表盘（mock）。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/api/monitoring/dashboard")
    public Result<Map<String, Object>> dashboard() {
        return Result.ok(monitoringService.dashboard());
    }
}
