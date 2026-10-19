/*
 * 健澜科技 jlmedaios - 病案管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_record.service;

import com.jlmedaios.monolith.medical_record.entity.MedicalRecord;
import com.jlmedaios.monolith.medical_record.repository.MedicalRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 病案管理 Service。
 *
 * <p>append-only: 病案归档后不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;

    /**
     * 创建病案。
     *
     * @param patientId       患者 ID
     * @param visitId         就诊 ID
     * @param recordType      病案类型
     * @param icdPrincipal    主诊断 ICD
     * @param icdOther        其他诊断 ICD（逗号分隔）
     * @param operationCodes   手术编码（逗号分隔）
     * @param admissionDate   入院日期
     * @param dischargeDate   出院日期
     * @param attendingDoctor 主治医师
     * @return 已持久化的病案
     */
    public MedicalRecord create(Long patientId, Long visitId, String recordType,
                                String icdPrincipal, String icdOther, String operationCodes,
                                LocalDate admissionDate, LocalDate dischargeDate,
                                String attendingDoctor) {
        MedicalRecord record = MedicalRecord.builder()
                .patientId(patientId)
                .visitId(visitId)
                .recordType(recordType)
                .icdPrincipal(icdPrincipal)
                .icdOther(icdOther)
                .operationCodes(operationCodes)
                .admissionDate(admissionDate)
                .dischargeDate(dischargeDate)
                .attendingDoctor(attendingDoctor)
                .build();
        return medicalRecordRepository.save(record);
    }

    /**
     * 病案质控（QUALIFIED/DEFECT/RETURNED）。
     *
     * @param id     病案 ID
     * @param status 质控状态
     * @return 已更新的病案
     */
    public Optional<MedicalRecord> qualityCheck(Long id, String status) {
        Optional<MedicalRecord> opt = medicalRecordRepository.findById(id);
        if (opt.isPresent()) {
            MedicalRecord record = opt.get();
            record.setQualityCheckStatus(status);
            record.setUpdatedAt(LocalDateTime.now());
            medicalRecordRepository.save(record);
        }
        return opt;
    }

    /**
     * 病案归档（append-only 锁定）。
     *
     * @param id 病案 ID
     * @return 已更新的病案
     */
    public Optional<MedicalRecord> archive(Long id) {
        Optional<MedicalRecord> opt = medicalRecordRepository.findById(id);
        if (opt.isPresent()) {
            MedicalRecord record = opt.get();
            record.setArchivedStatus("ARCHIVED");
            record.setUpdatedAt(LocalDateTime.now());
            medicalRecordRepository.save(record);
        }
        return opt;
    }

    /**
     * 按患者 ID 查询病案列表。
     *
     * @param patientId 患者 ID
     * @return 病案列表
     */
    public List<MedicalRecord> listByPatient(Long patientId) {
        return medicalRecordRepository.findByPatientId(patientId);
    }
}
