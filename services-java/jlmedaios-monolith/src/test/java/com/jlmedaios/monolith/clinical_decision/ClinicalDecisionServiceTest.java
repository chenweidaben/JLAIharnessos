/*
 * 健澜科技 jlmedaios - 临床决策支持 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_decision;

import com.jlmedaios.monolith.clinical_decision.entity.CDSHit;
import com.jlmedaios.monolith.clinical_decision.service.ClinicalDecisionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 临床决策支持 Service 测试。
 */
@SpringBootTest
public class ClinicalDecisionServiceTest {

    @Autowired
    private ClinicalDecisionService clinicalDecisionService;

    @Test
    void testActiveRules() {
        assertNotNull(clinicalDecisionService.activeRules());
    }

    @Test
    void testEvaluate() {
        List<CDSHit> hits = clinicalDecisionService.evaluate(1L, 1L);
        assertNotNull(hits);
        assertFalse(hits.isEmpty());
    }

    @Test
    void testAcknowledge() {
        List<CDSHit> hits = clinicalDecisionService.evaluate(2L, 2L);
        Optional<CDSHit> acked = clinicalDecisionService.acknowledge(hits.get(0).getId(), "DOC001");
        assertTrue(acked.isPresent());
        assertEquals("DOC001", acked.get().getAcknowledgedBy());
        assertNotNull(acked.get().getAcknowledgedTime());
    }
}
