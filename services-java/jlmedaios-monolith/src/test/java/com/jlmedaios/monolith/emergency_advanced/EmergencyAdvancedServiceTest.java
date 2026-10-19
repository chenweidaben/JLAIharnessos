/*
 * 健澜科技 jlmedaios - 急诊高级 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emergency_advanced;

import com.jlmedaios.monolith.emergency_advanced.entity.EmergencyVisit;
import com.jlmedaios.monolith.emergency_advanced.service.EmergencyAdvancedService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 急诊高级 Service 测试。
 */
@SpringBootTest
public class EmergencyAdvancedServiceTest {

    @Autowired
    private EmergencyAdvancedService emergencyAdvancedService;

    @Test
    void testRegister() {
        EmergencyVisit visit = emergencyAdvancedService.register("VISIT-001", "P001", "胸痛");
        assertNotNull(visit.getId());
        assertEquals("ARRIVED", visit.getStatus());
    }

    @Test
    void testTriageAndTransfer() {
        EmergencyVisit visit = emergencyAdvancedService.register("VISIT-002", "P002", "腹痛");
        Optional<EmergencyVisit> triaged = emergencyAdvancedService.triage(visit.getId(), "Ⅱ级危重");
        assertTrue(triaged.isPresent());
        assertEquals("TRIAGED", triaged.get().getStatus());
        assertEquals("Ⅱ级危重", triaged.get().getTriageLevel());

        Optional<EmergencyVisit> transferred = emergencyAdvancedService.transfer(visit.getId(), "ICU");
        assertTrue(transferred.isPresent());
        assertEquals("TRANSFERRED", transferred.get().getStatus());
    }

    @Test
    void testStats() {
        Map<String, Object> stats = emergencyAdvancedService.stats();
        assertNotNull(stats);
        assertTrue((Integer) stats.get("total_visits") >= 0);
    }
}
