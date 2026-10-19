/*
 * 健澜科技 jlmedaios - 系统监控 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.system_monitoring;

import com.jlmedaios.monolith.system_monitoring.entity.SystemMetric;
import com.jlmedaios.monolith.system_monitoring.service.SystemMonitoringService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 系统监控 Service 测试。
 */
@SpringBootTest
public class SystemMonitoringServiceTest {

    @Autowired
    private SystemMonitoringService systemMonitoringService;

    @Test
    void testHealthCheck() {
        Map<String, Object> health = systemMonitoringService.healthCheck();
        assertNotNull(health);
        assertEquals("UP", health.get("monolith"));
        assertEquals("UP", health.get("ai_service"));
        assertEquals("UP", health.get("database"));
        assertEquals("UP", health.get("redis"));
    }

    @Test
    void testRealTimeMetrics() {
        List<SystemMetric> metrics = systemMonitoringService.realTimeMetrics();
        assertNotNull(metrics);
    }

    @Test
    void testActiveAlerts() {
        List<SystemMetric> alerts = systemMonitoringService.activeAlerts();
        assertNotNull(alerts);
    }
}
