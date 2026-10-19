/*
 * 健澜科技 jlmedaios - 血透工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blood_dialysis;

import com.jlmedaios.monolith.blood_dialysis.entity.DialysisSession;
import com.jlmedaios.monolith.blood_dialysis.service.BloodDialysisService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 血透工作站 Service 测试。
 */
@SpringBootTest
public class BloodDialysisServiceTest {

    @Autowired
    private BloodDialysisService bloodDialysisService;

    @Test
    void testTodaySchedule() {
        List<DialysisSession> list = bloodDialysisService.todaySchedule();
        assertNotNull(list);
    }

    @Test
    void testStartDialysis() {
        DialysisSession session = bloodDialysisService.startDialysis("DIA-001");
        assertNotNull(session);
    }

    @Test
    void testEndDialysis() {
        DialysisSession session = bloodDialysisService.endDialysis(
                "DIA-001",
                new BigDecimal("65.0"),
                new BigDecimal("2.5"),
                new BigDecimal("64.5")
        );
        assertNotNull(session);
    }

    @Test
    void testDialysisHistory() {
        List<DialysisSession> history = bloodDialysisService.dialysisHistory(1L);
        assertNotNull(history);
    }
}
