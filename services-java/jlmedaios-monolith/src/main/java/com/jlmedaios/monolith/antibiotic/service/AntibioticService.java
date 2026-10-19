/*
 * 健澜科技 jlmedaios - 抗菌药物 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.antibiotic.service;

import com.jlmedaios.monolith.antibiotic.entity.AntibioticRecord;
import com.jlmedaios.monolith.antibiotic.repository.AntibioticRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 抗菌药物 Service。
 */
@Service
@RequiredArgsConstructor
public class AntibioticService {

    private final AntibioticRecordRepository antibioticRecordRepository;

    /**
     * 开立抗菌药物。
     * level=SPECIAL 时 consultationRequired=true（需会诊）。
     *
     * @param patientId 患者 ID
     * @param drugName  药品名称
     * @param dose      剂量
     * @param reason    用药原因
     * @param level     级别（RESTRICTED/SPECIAL）
     * @return 已持久化的抗菌药物记录
     */
    public AntibioticRecord order(Long patientId, String drugName, String dose,
                                   String reason, String level) {
        AntibioticRecord record = AntibioticRecord.builder()
                .patientId(patientId)
                .drugName(drugName)
                .dose(dose)
                .reason(reason)
                .level(level)
                .consultationRequired("SPECIAL".equals(level))
                .build();
        return antibioticRecordRepository.save(record);
    }

    /**
     * 按患者 ID 查询抗菌药物记录列表。
     *
     * @param patientId 患者 ID
     * @return 抗菌药物记录列表
     */
    public List<AntibioticRecord> listByPatient(Long patientId) {
        return antibioticRecordRepository.findByPatientId(patientId);
    }

    /**
     * 药师审核。
     *
     * @param id               抗菌药物记录 ID
     * @param pharmacistName    药师姓名
     * @param approved         是否通过
     * @param consultationNote  会诊意见
     * @return 更新后的抗菌药物记录
     */
    public Optional<AntibioticRecord> review(Long id, String pharmacistName,
                                               boolean approved, String consultationNote) {
        Optional<AntibioticRecord> opt = antibioticRecordRepository.findById(id);
        opt.ifPresent(r -> {
            r.setPharmacistName(pharmacistName);
            r.setReviewStatus(approved ? "APPROVED" : "REJECTED");
            r.setConsultationNote(consultationNote);
            antibioticRecordRepository.save(r);
        });
        return opt;
    }
}
