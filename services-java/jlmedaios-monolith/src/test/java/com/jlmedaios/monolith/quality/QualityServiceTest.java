/*
 * 健澜科技 jlmedaios - 质量 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.quality;

import com.jlmedaios.monolith.quality.entity.QualityMetric;
import com.jlmedaios.monolith.quality.service.QualityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 质量 Service 测试。
 */
@SpringBootTest
public class QualityServiceTest {

    @Autowired
    private QualityService qualityService;

    @Test
    void testRecordGradeA() {
        QualityMetric metric = qualityService.record("INTERNAL", "治愈率", "2026Q3",
                new BigDecimal("90"), new BigDecimal("95"));
        assertNotNull(metric.getId());
        assertEquals("A", metric.getGrade());
    }

    @Test
    void testRecordGradeC() {
        QualityMetric metric = qualityService.record("SURGERY", "平均住院日", "2026Q3",
                new BigDecimal("10"), new BigDecimal("8.5"));
        assertNotNull(metric.getId());
        assertEquals("C", metric.getGrade());
    }

    @Test
    void testHospitalSummary() {
        Map<String, Object> summary = qualityService.hospitalSummary();
        assertNotNull(summary);
        assertTrue((Integer) summary.get("total") >= 0);
    }
}
