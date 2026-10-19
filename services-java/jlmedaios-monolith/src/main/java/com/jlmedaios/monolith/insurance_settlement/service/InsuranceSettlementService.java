/*
 * 健澜科技 jlmedaios - 医保结算 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.insurance_settlement.service;

import com.jlmedaios.monolith.insurance_settlement.entity.InsuranceClaim;
import com.jlmedaios.monolith.insurance_settlement.repository.InsuranceClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 医保结算 Service。
 *
 * <p>append-only: 医保结算记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class InsuranceSettlementService {

    private final InsuranceClaimRepository insuranceClaimRepository;

    /**
     * 提交医保申报。
     *
     * @param claimNo         申报编号
     * @param patientId       患者 ID
     * @param medicalRecordNo  病历号
     * @param insuranceType   医保类型
     * @param totalAmount     总金额
     * @param insurancePay    医保支付
     * @param selfPay        自付金额
     * @return 已持久化的医保申报
     */
    public InsuranceClaim submit(String claimNo, String patientId, String medicalRecordNo,
                                 String insuranceType, BigDecimal totalAmount,
                                 BigDecimal insurancePay, BigDecimal selfPay) {
        InsuranceClaim claim = InsuranceClaim.builder()
                .claimNo(claimNo)
                .patientId(patientId)
                .medicalRecordNo(medicalRecordNo)
                .insuranceType(insuranceType)
                .totalAmount(totalAmount)
                .insurancePay(insurancePay)
                .selfPay(selfPay)
                .build();
        return insuranceClaimRepository.save(claim);
    }

    /**
     * 审核（approved→APPROVED，否则→REJECTED）。
     *
     * @param id       申报 ID
     * @param approved 是否通过
     * @return 已更新的医保申报
     */
    public Optional<InsuranceClaim> review(Long id, boolean approved) {
        Optional<InsuranceClaim> opt = insuranceClaimRepository.findById(id);
        if (opt.isPresent()) {
            InsuranceClaim claim = opt.get();
            claim.setClaimStatus(approved ? "APPROVED" : "REJECTED");
            insuranceClaimRepository.save(claim);
        }
        return opt;
    }

    /**
     * 待审核列表（claimStatus=SUBMITTED）。
     *
     * @return 医保申报列表
     */
    public List<InsuranceClaim> pendingList() {
        return insuranceClaimRepository.findByClaimStatus("SUBMITTED");
    }

    /**
     * 医保结算统计（mock）。
     *
     * @return 统计数据
     */
    public Map<String, Object> stats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total_claims", 500);
        stats.put("total_paid", new BigDecimal("1250000.00"));
        stats.put("approval_rate", new BigDecimal("0.92"));
        return stats;
    }
}
