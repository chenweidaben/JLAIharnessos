/*
 * 健澜科技 jlmedaios - 医保 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.insurance.service;

import com.jlmedaios.monolith.insurance.entity.InsuranceClaim;
import com.jlmedaios.monolith.insurance.repository.InsuranceClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 医保 Service。
 */
@Service
@RequiredArgsConstructor
public class InsuranceService {

    private final InsuranceClaimRepository insuranceClaimRepository;

    /**
     * 医保结算申报。
     * mock 分组：
     * - 主诊断含"肺炎"→drgGroup="ES1"
     * - 主诊断含"心梗"→drgGroup="FM1"
     * - 否则→drgGroup="UNMAPPED"
     * mock estimatedReimburse = totalCost * 0.7
     *
     * @param patientId          患者 ID
     * @param visitId            就诊 ID
     * @param principalDiagnosis 主诊断
     * @param otherDiagnoses     其他诊断
     * @param procedures          手术操作
     * @param totalCost          总费用
     * @return 已持久化的医保结算记录
     */
    public InsuranceClaim claim(Long patientId, Long visitId, String principalDiagnosis,
                                 String otherDiagnoses, String procedures, BigDecimal totalCost) {
        // mock DRG 分组
        String drgGroup = mockDrgGroup(principalDiagnosis);

        // mock 预估报销 = 总费用 * 0.7
        BigDecimal estimatedReimburse = totalCost.multiply(new BigDecimal("0.7"))
                .setScale(2, RoundingMode.HALF_UP);

        InsuranceClaim claim = InsuranceClaim.builder()
                .patientId(patientId)
                .visitId(visitId)
                .principalDiagnosis(principalDiagnosis)
                .otherDiagnoses(otherDiagnoses)
                .procedures(procedures)
                .totalCost(totalCost)
                .drgGroup(drgGroup)
                .estimatedReimburse(estimatedReimburse)
                .build();
        return insuranceClaimRepository.save(claim);
    }

    /**
     * 按结算 ID 查询。
     *
     * @param id 结算 ID
     * @return 医保结算 Optional
     */
    public Optional<InsuranceClaim> getByClaimId(Long id) {
        return insuranceClaimRepository.findById(id);
    }

    /**
     * 科室医保汇总（mock）。
     *
     * @param deptCode 科室编码
     * @return 汇总结果 Map
     */
    public Map<String, Object> deptSummary(String deptCode) {
        // mock 返回固定数字
        Map<String, Object> summary = new HashMap<>();
        summary.put("deptCode", deptCode);
        summary.put("total_claims", 12);
        summary.put("avg_reimburse", 8500);
        summary.put("total_revenue", 102000);
        return summary;
    }

    /**
     * mock DRG 分组。
     */
    private String mockDrgGroup(String principalDiagnosis) {
        if (principalDiagnosis == null) {
            return "UNMAPPED";
        }
        if (principalDiagnosis.contains("肺炎")) {
            return "ES1";
        } else if (principalDiagnosis.contains("心梗")) {
            return "FM1";
        } else {
            return "UNMAPPED";
        }
    }
}
