/*
 * 健澜科技 jlmedaios - 成本核算 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.cost_analysis;

import com.jlmedaios.monolith.cost_analysis.entity.CostItem;
import com.jlmedaios.monolith.cost_analysis.service.CostAnalysisService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 成本核算 Service 测试。
 */
@SpringBootTest
public class CostAnalysisServiceTest {

    @Autowired
    private CostAnalysisService service;

    @Test
    void testRecordNormal() {
        CostItem item = service.record("COST-001", "人力成本", "人力成本",
                new BigDecimal("500000.00"), "心内科", "月度");
        assertNotNull(item.getId());
        assertEquals("人力成本", item.getCategory());
    }

    @Test
    void testDeptSummaryEmpty() {
        assertTrue(service.deptSummary("不存在科室").isEmpty());
    }

    @Test
    void testAnalysisNotNull() {
        assertNotNull(service.analysis());
    }
}
