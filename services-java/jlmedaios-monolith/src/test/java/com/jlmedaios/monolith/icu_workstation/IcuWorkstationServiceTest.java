/*
 * 健澜科技 jlmedaios - ICU 工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_workstation;

import com.jlmedaios.monolith.icu_workstation.entity.ICURecord;
import com.jlmedaios.monolith.icu_workstation.entity.ICUWorkItem;
import com.jlmedaios.monolith.icu_workstation.service.IcuWorkstationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ICU 工作站 Service 测试（深化：床位+评分管理）。
 */
@SpringBootTest
public class IcuWorkstationServiceTest {

    @Autowired
    private IcuWorkstationService icuWorkstationService;

    @Test
    void testBedStatus() {
        Map<String, Object> status = icuWorkstationService.bedStatus();
        assertNotNull(status);
        assertTrue(status.containsKey("total"));
        assertTrue(status.containsKey("occupied"));
        assertTrue(status.containsKey("available"));
    }

    @Test
    void testUpdateScore() {
        ICUWorkItem item = icuWorkstationService.updateScore("ICU-WI-001", new BigDecimal("12.5"), 15);
        assertNotNull(item);
    }

    @Test
    void testVitalTrendByWorkItem() {
        List<ICURecord> trend = icuWorkstationService.vitalTrendByWorkItem("ICU-WI-001");
        assertNotNull(trend);
    }

    @Test
    void testDischargeICU() {
        ICUWorkItem item = icuWorkstationService.dischargeICU("ICU-WI-001");
        assertNotNull(item);
    }
}
