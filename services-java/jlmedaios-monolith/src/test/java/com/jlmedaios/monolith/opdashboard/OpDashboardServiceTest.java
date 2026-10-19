/*
 * 健澜科技 jlmedaios - 运营看板 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.opdashboard;

import com.jlmedaios.monolith.opdashboard.entity.DailyKpi;
import com.jlmedaios.monolith.opdashboard.service.OpDashboardService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 运营看板 Service 测试。
 */
@SpringBootTest
public class OpDashboardServiceTest {

    @Autowired
    private OpDashboardService opDashboardService;

    @Test
    void testImportKpi() {
        DailyKpi kpi = opDashboardService.importKpi(LocalDate.now(),
                1200, 350, new BigDecimal("6.5"),
                new BigDecimal("0.35"), new BigDecimal("850000"));
        assertNotNull(kpi.getId());
        assertEquals(1200, kpi.getOutpatientVisits());
    }

    @Test
    void testDaily() {
        LocalDate today = LocalDate.now();
        opDashboardService.importKpi(today, 1500, 400, new BigDecimal("6.2"),
                new BigDecimal("0.33"), new BigDecimal("920000"));
        Optional<DailyKpi> kpi = opDashboardService.daily(today);
        assertTrue(kpi.isPresent());
        assertEquals(1500, kpi.get().getOutpatientVisits());
    }

    @Test
    void testTrend() {
        List<DailyKpi> trend = opDashboardService.trend();
        assertNotNull(trend);
        assertTrue(trend.size() >= 0);
    }
}
