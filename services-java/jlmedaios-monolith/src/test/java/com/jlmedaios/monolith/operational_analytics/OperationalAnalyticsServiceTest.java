/*
 * 健澜科技 jlmedaios - 运营分析 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.operational_analytics;

import com.jlmedaios.monolith.operational_analytics.service.OperationalAnalyticsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 运营分析 Service 测试。
 */
@SpringBootTest
public class OperationalAnalyticsServiceTest {

    @Autowired
    private OperationalAnalyticsService operationalAnalyticsService;

    @Test
    void testDeptSummary() {
        Map<String, Object> summary = operationalAnalyticsService.deptSummary("CARD");
        assertNotNull(summary);
        assertTrue(summary.containsKey("outpatientVolume"));
    }

    @Test
    void testHospitalOverview() {
        Map<String, Object> overview = operationalAnalyticsService.hospitalOverview();
        assertNotNull(overview);
        assertTrue(overview.containsKey("totalOutpatient"));
    }

    @Test
    void testCompareByMetric() {
        List<Map<String, Object>> compare = operationalAnalyticsService.compareByMetric("patientSatisfaction");
        assertNotNull(compare);
        assertFalse(compare.isEmpty());
    }
}
