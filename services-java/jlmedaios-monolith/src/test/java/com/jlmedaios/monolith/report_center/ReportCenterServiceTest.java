/*
 * 健澜科技 jlmedaios - 报表中心 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.report_center;

import com.jlmedaios.monolith.report_center.entity.ReportDefinition;
import com.jlmedaios.monolith.report_center.service.ReportCenterService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 报表中心 Service 测试。
 */
@SpringBootTest
public class ReportCenterServiceTest {

    @Autowired
    private ReportCenterService reportCenterService;

    @Test
    void testReportList() {
        List<ReportDefinition> list = reportCenterService.reportList();
        assertNotNull(list);
    }

    @Test
    void testGenerate() {
        Map<String, Object> report = reportCenterService.generate("RPT-001");
        assertNotNull(report);
        assertEquals("RPT-001", report.get("reportCode"));
        assertTrue(report.containsKey("rows"));
    }

    @Test
    void testByCategory() {
        List<ReportDefinition> list = reportCenterService.byCategory("医疗日报");
        assertNotNull(list);
    }
}
