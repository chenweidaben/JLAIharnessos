/*
 * 健澜科技 jlmedaios - 危急值 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.critical;

import com.jlmedaios.monolith.critical.entity.CriticalValue;
import com.jlmedaios.monolith.critical.service.CriticalService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 危急值 Service 测试。
 */
@SpringBootTest
public class CriticalServiceTest {

    @Autowired
    private CriticalService criticalService;

    @Test
    void testReport() {
        CriticalValue cv = criticalService.report(1L, "血钾", "6.8mmol/L",
                "3.5-5.5", "CRITICAL");
        assertNotNull(cv.getId());
        assertEquals("REPORTED", cv.getStatus());
        assertNotNull(cv.getReportedTime());
    }

    @Test
    void testAckAndAction() {
        CriticalValue cv = criticalService.report(2L, "血糖", "2.1mmol/L",
                "3.9-6.1", "CRITICAL");
        Optional<CriticalValue> acked = criticalService.ack(cv.getId(), "张医生");
        assertTrue(acked.isPresent());
        assertEquals("ACKED", acked.get().getStatus());
        assertNotNull(acked.get().getReceiverAckTime());

        Optional<CriticalValue> acted = criticalService.action(cv.getId(),
                "静推高糖 20ml");
        assertTrue(acted.isPresent());
        assertEquals("CLOSED", acted.get().getStatus());
    }

    @Test
    void testOpenList() {
        CriticalValue cv = criticalService.report(3L, "血红蛋白", "50g/L",
                "115-150", "CRITICAL");
        List<CriticalValue> open = criticalService.openList();
        assertNotNull(open);
        assertTrue(open.size() >= 1);
    }
}
