/*
 * 健澜科技 jlmedaios - 公共卫生上报 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.public_health_report;

import com.jlmedaios.monolith.public_health_report.entity.PublicHealthReport;
import com.jlmedaios.monolith.public_health_report.service.PublicHealthReportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 公共卫生上报 Service 测试。
 */
@SpringBootTest
public class PublicHealthReportServiceTest {

    @Autowired
    private PublicHealthReportService service;

    @Test
    void testCreateReportNormal() {
        PublicHealthReport report = service.createReport("PHR-001", "传染病上报",
                "P001", "A01", "疾控中心");
        assertNotNull(report.getId());
        assertEquals("SUBMITTED", report.getStatus());
    }

    @Test
    void testPendingListNotNull() {
        assertNotNull(service.pendingList());
    }

    @Test
    void testStatsNotNull() {
        assertNotNull(service.stats());
    }
}
