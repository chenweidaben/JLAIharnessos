/*
 * 健澜科技 jlmedaios - 医疗纠纷处理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_dispute.service;

import com.jlmedaios.monolith.medical_dispute.entity.DisputeCase;
import com.jlmedaios.monolith.medical_dispute.repository.DisputeCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * 医疗纠纷处理 Service。
 *
 * <p>append-only: 医疗纠纷记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class MedicalDisputeService {

    private final DisputeCaseRepository disputeCaseRepository;

    /**
     * 纠纷上报。
     *
     * @param caseNo       案件编号
     * @param patientId      患者 ID
     * @param department     科室
     * @param disputeType    纠纷类型
     * @param description    纠纷描述
     * @return 已持久化的纠纷案件
     */
    public DisputeCase report(String caseNo, String patientId, String department,
                               String disputeType, String description) {
        DisputeCase dispute = DisputeCase.builder()
                .caseNo(caseNo)
                .patientId(patientId)
                .department(department)
                .disputeType(disputeType)
                .description(description)
                .build();
        return disputeCaseRepository.save(dispute);
    }

    /**
     * 开始调查（status=INVESTIGATING）。
     *
     * @param caseId 案件 ID
     * @return 已更新的纠纷案件
     */
    public Optional<DisputeCase> startInvestigate(Long caseId) {
        Optional<DisputeCase> opt = disputeCaseRepository.findById(caseId);
        if (opt.isPresent()) {
            DisputeCase dispute = opt.get();
            dispute.setStatus("INVESTIGATING");
            disputeCaseRepository.save(dispute);
        }
        return opt;
    }

    /**
     * 结案（status=CLOSED + compensationAmount）。
     *
     * @param caseId             案件 ID
     * @param compensationAmount 赔偿金额
     * @return 已更新的纠纷案件
     */
    public Optional<DisputeCase> close(Long caseId, BigDecimal compensationAmount) {
        Optional<DisputeCase> opt = disputeCaseRepository.findById(caseId);
        if (opt.isPresent()) {
            DisputeCase dispute = opt.get();
            dispute.setStatus("CLOSED");
            dispute.setCompensationAmount(compensationAmount);
            disputeCaseRepository.save(dispute);
        }
        return opt;
    }

    /**
     * 待处理列表。
     *
     * @return 纠纷案件列表
     */
    public List<DisputeCase> pendingList() {
        return disputeCaseRepository.findByStatus("PENDING");
    }
}
