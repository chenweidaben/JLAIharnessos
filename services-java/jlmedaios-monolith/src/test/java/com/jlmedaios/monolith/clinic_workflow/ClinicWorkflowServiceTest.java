/*
 * 健澜科技 jlmedaios - 门诊工作流 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinic_workflow;

import com.jlmedaios.monolith.clinic_workflow.entity.ClinicSession;
import com.jlmedaios.monolith.clinic_workflow.service.ClinicWorkflowService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 门诊工作流 Service 测试。
 */
@SpringBootTest
public class ClinicWorkflowServiceTest {

    @Autowired
    private ClinicWorkflowService clinicWorkflowService;

    @Test
    void testCreateSession() {
        ClinicSession session = clinicWorkflowService.createSession(
                "CLINIC-2026-001", "P001", "心内科", "D001");
        assertNotNull(session.getId());
        assertEquals("REGISTERED", session.getStatus());
    }

    @Test
    void testUpdateStep() {
        ClinicSession session = clinicWorkflowService.createSession(
                "CLINIC-2026-002", "P002", "普外科", "D002");
        Optional<ClinicSession> updated = clinicWorkflowService.updateStep(session.getId(), "SEE_DOCTOR");
        assertTrue(updated.isPresent());
        assertEquals("IN_VISIT", updated.get().getStatus());
    }

    @Test
    void testTimeline() {
        ClinicSession session = clinicWorkflowService.createSession(
                "CLINIC-2026-003", "P003", "骨科", "D003");
        Map<String, Object> timeline = clinicWorkflowService.timeline(session.getId());
        assertNotNull(timeline);
    }

    @Test
    void testStats() {
        Map<String, Object> stats = clinicWorkflowService.stats();
        assertNotNull(stats);
    }
}
