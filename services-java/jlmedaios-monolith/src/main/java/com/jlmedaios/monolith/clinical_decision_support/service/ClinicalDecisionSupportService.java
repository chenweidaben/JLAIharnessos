/*
 * 健澜科技 jlmedaios - 临床决策支持 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_decision_support.service;

import com.jlmedaios.monolith.clinical_decision_support.entity.CDSSRule;
import com.jlmedaios.monolith.clinical_decision_support.repository.CDSSRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 临床决策支持 Service。
 *
 * <p>CDSS 规则主数据；与 ai_prescription_review.py 形成 Java 规则引擎+AI 辅助双保险</p>
 */
@Service
@RequiredArgsConstructor
public class ClinicalDecisionSupportService {

    private final CDSSRuleRepository cdssRuleRepository;

    /**
     * 规则列表。
     *
     * @return CDSS 规则列表
     */
    public List<CDSSRule> ruleList() {
        return cdssRuleRepository.findAll();
    }

    /**
     * 临床决策检查（mock 返回触发规则）。
     *
     * @param diagnosis   诊断
     * @param medications 用药
     * @param labResults  检验结果
     * @return 触发的 CDSS 规则列表
     */
    public List<CDSSRule> check(String diagnosis, String medications, String labResults) {
        return cdssRuleRepository.findByStatus("ENABLED");
    }

    /**
     * 启用/停用规则。
     *
     * @param ruleCode 规则编码
     * @return 已更新的 CDSS 规则
     */
    public CDSSRule toggleRule(String ruleCode) {
        List<CDSSRule> rules = cdssRuleRepository.findAll();
        for (CDSSRule rule : rules) {
            if (ruleCode.equals(rule.getRuleCode())) {
                rule.setStatus("DISABLED".equals(rule.getStatus()) ? "ENABLED" : "DISABLED");
                return cdssRuleRepository.save(rule);
            }
        }
        return null;
    }
}
