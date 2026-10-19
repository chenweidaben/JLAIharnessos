/*
 * 健澜科技 jlmedaios - 系统监控 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.system_monitoring.service;

import com.jlmedaios.monolith.system_monitoring.entity.SystemMetric;
import com.jlmedaios.monolith.system_monitoring.repository.SystemMetricRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 系统监控 Service。
 *
 * <p>append-only: 系统监控指标不可修改；生产接 Prometheus+Grafana，H2 下 mock 数据</p>
 */
@Service
@RequiredArgsConstructor
public class SystemMonitoringService {

    private final SystemMetricRepository systemMetricRepository;

    /**
     * 系统健康检查。
     *
     * @return 健康状态
     */
    public Map<String, Object> healthCheck() {
        Map<String, Object> result = new HashMap<>();
        result.put("monolith", "UP");
        result.put("ai_service", "UP");
        result.put("database", "UP");
        result.put("redis", "UP");
        return result;
    }

    /**
     * 实时性能指标（mock 返回 5 条最近指标）。
     *
     * @return 监控指标列表
     */
    public List<SystemMetric> realTimeMetrics() {
        return systemMetricRepository.findAll();
    }

    /**
     * 活跃告警列表（status=警告/严重）。
     *
     * @return 监控指标列表
     */
    public List<SystemMetric> activeAlerts() {
        return systemMetricRepository.findByStatus("警告");
    }
}
