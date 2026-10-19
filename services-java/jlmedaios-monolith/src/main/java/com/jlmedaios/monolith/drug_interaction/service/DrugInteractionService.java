/*
 * 健澜科技 jlmedaios - 药品相互作用 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.drug_interaction.service;

import com.jlmedaios.monolith.drug_interaction.entity.DrugInteractionRule;
import com.jlmedaios.monolith.drug_interaction.entity.InteractionCheckLog;
import com.jlmedaios.monolith.drug_interaction.repository.DrugInteractionRuleRepository;
import com.jlmedaios.monolith.drug_interaction.repository.InteractionCheckLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 药品相互作用 Service。
 *
 * <p>与 ai_prescription_review.py 形成 Java 规则引擎 + AI 辅助双保险</p>
 */
@Service
@RequiredArgsConstructor
public class DrugInteractionService {

    private final DrugInteractionRuleRepository drugInteractionRuleRepository;
    private final InteractionCheckLogRepository interactionCheckLogRepository;

    /**
     * 检查药品相互作用（mock：含"华法林"+"阿司匹林"→禁忌/high）。
     *
     * @param medications 药品列表
     * @param patientId    患者 ID
     * @return 检查结果
     */
    public Map<String, Object> check(List<String> medications, Long patientId) {
        boolean hasWarfarin = medications.contains("华法林");
        boolean hasAspirin = medications.contains("阿司匹林");

        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> matchedRules = List.of();

        if (hasWarfarin && hasAspirin) {
            matchedRules = List.of(Map.of(
                    "drugA", "华法林",
                    "drugB", "阿司匹林",
                    "type", "禁忌",
                    "severity", "high",
                    "advice", "增加出血风险，禁止联用"
            ));
            result.put("result", "match");
        } else {
            result.put("result", "no_match");
        }

        // 保存检查日志
        InteractionCheckLog log = InteractionCheckLog.builder()
                .patientId(patientId)
                .medicationsJSON(medications.toString())
                .result(String.valueOf(result.get("result")))
                .matchedRulesJSON(matchedRules.toString())
                .build();
        interactionCheckLogRepository.save(log);

        result.put("matchedRules", matchedRules);
        return result;
    }

    /**
     * 全部规则列表。
     *
     * @return 规则列表
     */
    public List<DrugInteractionRule> allRules() {
        return drugInteractionRuleRepository.findAll();
    }

    /**
     * 检查日志。
     *
     * @param patientId 患者 ID
     * @return 检查日志列表
     */
    public List<InteractionCheckLog> checkLog(Long patientId) {
        return interactionCheckLogRepository.findByPatientId(patientId);
    }
}
