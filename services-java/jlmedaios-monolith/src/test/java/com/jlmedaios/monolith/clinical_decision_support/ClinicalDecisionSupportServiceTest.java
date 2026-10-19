/*
 * 健澜科技 jlmedaios - 临床决策支持 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_decision_support;

import com.jlmedaios.monolith.clinical_decision_support.entity.CDSSRule;
import com.jlmedaios.monolith.clinical_decision_support.service.ClinicalDecisionSupportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 临床决策支持 Service 测试。
 */
@SpringBootTest
public class ClinicalDecisionSupportServiceTest {

    @Autowired
    private ClinicalDecisionSupportService clinicalDecisionSupportService;

    @Test
    void testRuleList() {
        List<CDSSRule> list = clinicalDecisionSupportService.ruleList();
        assertNotNull(list);
    }

    @Test
    void testCheck() {
        List<CDSSRule> rules = clinicalDecisionSupportService.check(
                "2型糖尿病", "二甲双胍", "HbA1c=7.2%");
        assertNotNull(rules);
    }

    @Test
    void testToggleRule() {
        CDSSRule rule = clinicalDecisionSupportService.toggleRule("CDSS-001");
        // 可能为空（H2 内存库无预置数据）
    }
}
