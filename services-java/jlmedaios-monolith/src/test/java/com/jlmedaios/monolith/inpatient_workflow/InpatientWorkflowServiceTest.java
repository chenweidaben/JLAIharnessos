/*
 * 健澜科技 jlmedaios - 住院工作流 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.inpatient_workflow;

import com.jlmedaios.monolith.inpatient_workflow.entity.InpatientEpisode;
import com.jlmedaios.monolith.inpatient_workflow.service.InpatientWorkflowService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 住院工作流 Service 测试。
 */
@SpringBootTest
public class InpatientWorkflowServiceTest {

    @Autowired
    private InpatientWorkflowService inpatientWorkflowService;

    @Test
    void testAdmit() {
        InpatientEpisode episode = inpatientWorkflowService.admit(
                "INP-2026-001", "P001", "心内科", "床101");
        assertNotNull(episode.getId());
        assertEquals("ADMITTED", episode.getStatus());
    }

    @Test
    void testDischarge() {
        InpatientEpisode episode = inpatientWorkflowService.admit(
                "INP-2026-002", "P002", "普外科", "床201");
        Optional<InpatientEpisode> discharged = inpatientWorkflowService.discharge(episode.getId());
        assertTrue(discharged.isPresent());
        assertEquals("DISCHARGED", discharged.get().getStatus());
        assertNotNull(discharged.get().getDischargeTime());
    }

    @Test
    void testTimeline() {
        InpatientEpisode episode = inpatientWorkflowService.admit(
                "INP-2026-003", "P003", "骨科", "床301");
        Map<String, Object> timeline = inpatientWorkflowService.timeline(episode.getId());
        assertNotNull(timeline);
    }

    @Test
    void testStats() {
        Map<String, Object> stats = inpatientWorkflowService.stats();
        assertNotNull(stats);
    }
}
