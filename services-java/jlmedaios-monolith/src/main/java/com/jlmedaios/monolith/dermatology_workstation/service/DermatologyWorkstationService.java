/*
 * 健澜科技 jlmedaios - 皮肤科工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.dermatology_workstation.service;

import com.jlmedaios.monolith.dermatology_workstation.entity.DermatologyRecord;
import com.jlmedaios.monolith.dermatology_workstation.repository.DermatologyRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * 皮肤科工作站 Service。
 *
 * <p>append-only: 皮肤科诊疗记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class DermatologyWorkstationService {

    private final DermatologyRecordRepository dermatologyRecordRepository;

    /**
     * 今日皮肤科患者。
     *
     * @return 皮肤科诊疗记录列表
     */
    public List<DermatologyRecord> todayPatients() {
        return dermatologyRecordRepository.findAll();
    }

    /**
     * 创建皮损记录。
     *
     * @param recordNo      记录编号
     * @param patientId     患者 ID
     * @param lesionLocation 皮损部位
     * @param lesionType    皮损类型
     * @param diagnosis     诊断
     * @return 已创建的皮肤科诊疗记录
     */
    public DermatologyRecord createRecord(String recordNo, String patientId, String lesionLocation,
                                           String lesionType, String diagnosis) {
        DermatologyRecord record = DermatologyRecord.builder()
                .recordNo(recordNo)
                .patientId(patientId)
                .lesionLocation(lesionLocation)
                .lesionType(lesionType)
                .diagnosis(diagnosis)
                .build();
        return dermatologyRecordRepository.save(record);
    }

    /**
     * 记录治疗方案。
     *
     * @param recordNo      记录编号
     * @param treatmentPlan 治疗方案
     * @param followUpDate  随访日期
     * @return 已记录治疗的皮肤科诊疗记录
     */
    public DermatologyRecord recordTreatment(String recordNo, String treatmentPlan, LocalDate followUpDate) {
        DermatologyRecord record = dermatologyRecordRepository.findByRecordNo(recordNo);
        if (record != null) {
            record.setTreatmentPlan(treatmentPlan);
            record.setFollowUpDate(followUpDate);
            return dermatologyRecordRepository.save(record);
        }
        return null;
    }

    /**
     * 患者皮肤病史。
     *
     * @param patientId 患者 ID
     * @return 皮肤科诊疗记录列表
     */
    public List<DermatologyRecord> dermatologyHistory(Long patientId) {
        return dermatologyRecordRepository.findByPatientId(String.valueOf(patientId));
    }
}
