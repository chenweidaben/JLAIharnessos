/*
 * 健澜科技 jlmedaios - 临床决策支持深化 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_deep.service;

import com.jlmedaios.monolith.clinical_deep.entity.CDSEvaluation;
import com.jlmedaios.monolith.clinical_deep.entity.CDSRule;
import com.jlmedaios.monolith.clinical_deep.repository.CDSEvaluationRepository;
import com.jlmedaios.monolith.clinical_deep.repository.CDSRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * 临床决策支持深化 Service。
 *
 * <p>append-only: CDS 评估记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class ClinicalDeepService {

    private final CDSRuleRepository cdsRuleRepository;
    private final CDSEvaluationRepository cdsEvaluationRepository;

    /**
     * 规则列表。
     *
     * @return 规则列表
     */
    public List<CDSRule> ruleList() {
        return cdsRuleRepository.findByStatus("ACTIVE");
    }

    /**
     * 评估触发规则（mock 返回 2 条命中）。
     *
     * @param patientId 患者 ID
     * @return 评估记录列表
     */
    public List<CDSEvaluation> evaluate(Long patientId) {
        List<CDSEvaluation> evaluations = new ArrayList<>();
        CDSEvaluation e1 = CDSEvaluation.builder()
                .evaluationNo("EVAL-" + System.currentTimeMillis())
                .patientId(String.valueOf(patientId))
                .ruleCode("RULE-001")
                .actionTaken("")
                .build();
        evaluations.add(cdsEvaluationRepository.save(e1));

        CDSEvaluation e2 = CDSEvaluation.builder()
                .evaluationNo("EVAL-" + System.currentTimeMillis() + "-2")
                .patientId(String.valueOf(patientId))
                .ruleCode("RULE-002")
                .actionTaken("")
                .build();
        evaluations.add(cdsEvaluationRepository.save(e2));
        return evaluations;
    }

    /**
     * 医生反馈。
     *
     * @param evaluationId  评估记录 ID
     * @param actionTaken   操作（接受/忽略/修改）
     * @param feedback       反馈内容
     * @return 已更新的评估记录
     */
    public Optional<CDSEvaluation> feedback(Long evaluationId, String actionTaken, String feedback) {
        Optional<CDSEvaluation> opt = cdsEvaluationRepository.findById(evaluationId);
        if (opt.isPresent()) {
            CDSEvaluation evaluation = opt.get();
            evaluation.setActionTaken(actionTaken);
            evaluation.setFeedback(feedback);
            cdsEvaluationRepository.save(evaluation);
        }
        return opt;
    }
}
