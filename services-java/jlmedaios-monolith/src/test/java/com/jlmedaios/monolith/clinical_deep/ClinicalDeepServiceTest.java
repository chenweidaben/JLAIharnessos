/*
 * 健澜科技 jlmedaios - 临床决策支持深化 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_deep;

import com.jlmedaios.monolith.clinical_deep.entity.CDSEvaluation;
import com.jlmedaios.monolith.clinical_deep.entity.CDSRule;
import com.jlmedaios.monolith.clinical_deep.service.ClinicalDeepService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 临床决策支持深化 Service 测试。
 */
@SpringBootTest
public class ClinicalDeepServiceTest {

    @Autowired
    private ClinicalDeepService clinicalDeepService;

    @Test
    void testRuleListEmpty() {
        List<CDSRule> rules = clinicalDeepService.ruleList();
        assertNotNull(rules);
    }

    @Test
    void testEvaluate() {
        List<CDSEvaluation> evaluations = clinicalDeepService.evaluate(1L);
        assertNotNull(evaluations);
        assertEquals(2, evaluations.size());
    }

    @Test
    void testFeedbackNotFound() {
        Optional<CDSEvaluation> result = clinicalDeepService.feedback(999L, "接受", "ok");
        assertTrue(result.isEmpty());
    }
}
