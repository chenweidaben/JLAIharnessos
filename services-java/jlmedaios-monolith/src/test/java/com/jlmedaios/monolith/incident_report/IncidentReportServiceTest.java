/*
 * 健澜科技 jlmedaios - 不良事件上报 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.incident_report;

import com.jlmedaios.monolith.incident_report.entity.IncidentReport;
import com.jlmedaios.monolith.incident_report.service.IncidentReportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 不良事件上报 Service 测试。
 */
@SpringBootTest
public class IncidentReportServiceTest {

    @Autowired
    private IncidentReportService incidentReportService;

    @Test
    void testReport() {
        IncidentReport report = incidentReportService.report(
                "IR20261019001", "NURSE001", "跌倒", "Ⅱ级不良后果",
                "患者下床时跌倒", LocalDateTime.now().minusHours(2)
        );
        assertNotNull(report.getId());
        assertEquals("REPORTED", report.getStatus());
    }

    @Test
    void testInvestigateAndClose() {
        IncidentReport report = incidentReportService.report(
                "IR20261019002", "NURSE002", "用药错误", "Ⅲ级未造成后果",
                "护士给药剂量错误", LocalDateTime.now().minusHours(1)
        );
        Optional<IncidentReport> investigating = incidentReportService.investigate(report.getId());
        assertTrue(investigating.isPresent());
        assertEquals("INVESTIGATING", investigating.get().getStatus());

        Optional<IncidentReport> closed = incidentReportService.close(report.getId(), "护士未双人核对");
        assertTrue(closed.isPresent());
        assertEquals("CLOSED", closed.get().getStatus());
        assertEquals("护士未双人核对", closed.get().getRootCause());
    }

    @Test
    void testPendingList() {
        incidentReportService.report(
                "IR20261019003", "DOC001", "压疮", "Ⅱ级不良后果",
                "患者长期卧床", LocalDateTime.now().minusHours(3)
        );
        assertNotNull(incidentReportService.pendingList());
    }
}
