/*
 * 健澜科技 jlmedaios - 监控 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.monitoring.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 监控 Service。
 *
 * <p>生产接 Prometheus + Grafana</p>
 */
@Service
@RequiredArgsConstructor
public class MonitoringService {

    /**
     * 健康检查（mock）。
     *
     * @return 健康状态
     */
    public Map<String, Object> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("modules", 40);
        health.put("uptime", "2h");
        return health;
    }

    /**
     * 业务指标（mock）。
     *
     * @return 业务指标
     */
    public Map<String, Object> metrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("today_registrations", 120);
        metrics.put("inpatient_count", 45);
        metrics.put("pending_critical", 2);
        metrics.put("ai_calls", 350);
        return metrics;
    }

    /**
     * 运营仪表盘（mock）。
     *
     * @return 仪表盘数据
     */
    public Map<String, Object> dashboard() {
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("today", Map.of(
                "registrations", 120,
                "inpatient_count", 45,
                "ai_calls", 350
        ));
        dashboard.put("week_trend", List.of(
                Map.of("day", "Mon", "registrations", 100),
                Map.of("day", "Tue", "registrations", 110),
                Map.of("day", "Wed", "registrations", 120)
        ));
        return dashboard;
    }
}
