/*
 * 健澜科技 jlmedaios - 临床决策支持 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_decision.service;

import com.jlmedaios.monolith.clinical_decision.entity.CDSHit;
import com.jlmedaios.monolith.clinical_decision.entity.CDSRule;
import com.jlmedaios.monolith.clinical_decision.repository.CDSHitRepository;
import com.jlmedaios.monolith.clinical_decision.repository.CDSRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 临床决策支持 Service。
 *
 * <p>CDS 规则主数据，命中记录 append-only</p>
 */
@Service
@RequiredArgsConstructor
public class ClinicalDecisionService {

    private final CDSRuleRepository cdsRuleRepository;
    private final CDSHitRepository cdsHitRepository;

    /**
     * 当前生效规则列表。
     *
     * @return 规则列表
     */
    public List<CDSRule> activeRules() {
        return cdsRuleRepository.findByStatus("ACTIVE");
    }

    /**
     * 评估触发的规则（mock 返回 2 条命中）。
     *
     * @param patientId  患者 ID
     * @param encounterId 就诊 ID
     * @return 命中记录列表
     */
    public List<CDSHit> evaluate(Long patientId, Long encounterId) {
        // mock：返回 2 条命中
        CDSHit hit1 = CDSHit.builder()
                .ruleId(1L)
                .patientId(patientId)
                .encounterId(encounterId)
                .build();
        CDSHit hit2 = CDSHit.builder()
                .ruleId(2L)
                .patientId(patientId)
                .encounterId(encounterId)
                .build();
        return List.of(cdsHitRepository.save(hit1), cdsHitRepository.save(hit2));
    }

    /**
     * 医生确认/忽略规则。
     *
     * @param hitId         命中记录 ID
     * @param acknowledgedBy 确认人工号
     * @return 已更新的命中记录
     */
    public Optional<CDSHit> acknowledge(Long hitId, String acknowledgedBy) {
        Optional<CDSHit> opt = cdsHitRepository.findById(hitId);
        if (opt.isPresent()) {
            CDSHit hit = opt.get();
            hit.setAcknowledgedBy(acknowledgedBy);
            hit.setAcknowledgedTime(LocalDateTime.now());
            cdsHitRepository.save(hit);
        }
        return opt;
    }
}
