/*
 * 健澜科技 jlmedaios - 康复工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.rehabilitation_workstation;

import com.jlmedaios.monolith.rehabilitation_workstation.entity.RehabSession;
import com.jlmedaios.monolith.rehabilitation_workstation.service.RehabilitationWorkstationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 康复工作站 Service 测试。
 */
@SpringBootTest
public class RehabilitationWorkstationServiceTest {

    @Autowired
    private RehabilitationWorkstationService rehabilitationWorkstationService;

    @Test
    void testTodaySessions() {
        List<RehabSession> list = rehabilitationWorkstationService.todaySessions();
        assertNotNull(list);
    }

    @Test
    void testCreateSession() {
        RehabSession session = rehabilitationWorkstationService.createSession(
                "REHAB-001", "P001", "物理治疗", "T001", 30);
        assertNotNull(session.getId());
        assertEquals("SCHEDULED", session.getStatus());
    }

    @Test
    void testCompleteSession() {
        RehabSession session = rehabilitationWorkstationService.completeSession("REHAB-001", "治疗顺利完成");
        assertNotNull(session);
    }

    @Test
    void testRehabPlan() {
        Map<String, Object> plan = rehabilitationWorkstationService.rehabPlan(1L);
        assertNotNull(plan);
        assertTrue(plan.containsKey("phases"));
    }
}
