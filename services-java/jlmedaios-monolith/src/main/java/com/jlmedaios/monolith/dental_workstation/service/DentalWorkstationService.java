/*
 * 健澜科技 jlmedaios - 口腔科工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.dental_workstation.service;

import com.jlmedaios.monolith.dental_workstation.entity.DentalRecord;
import com.jlmedaios.monolith.dental_workstation.repository.DentalRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 口腔科工作站 Service。
 *
 * <p>append-only: 口腔科检查记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class DentalWorkstationService {

    private final DentalRecordRepository dentalRecordRepository;

    /**
     * 今日口腔科患者。
     *
     * @return 口腔科检查记录列表
     */
    public List<DentalRecord> todayPatients() {
        return dentalRecordRepository.findAll();
    }

    /**
     * 创建口腔检查记录。
     *
     * @param recordNo         记录编号
     * @param patientId        患者 ID
     * @param visitType        就诊类型
     * @param examType         检查类型
     * @param teethConditionJSON 牙齿状况 JSON
     * @return 已创建的口腔科检查记录
     */
    public DentalRecord createExam(String recordNo, String patientId, String visitType,
                                    String examType, String teethConditionJSON) {
        DentalRecord record = DentalRecord.builder()
                .recordNo(recordNo)
                .patientId(patientId)
                .visitType(visitType)
                .examType(examType)
                .teethConditionJSON(teethConditionJSON)
                .build();
        return dentalRecordRepository.save(record);
    }

    /**
     * 制定治疗计划。
     *
     * @param recordNo     记录编号
     * @param diagnosis    诊断
     * @param treatmentPlan 治疗计划
     * @return 已制定治疗计划的口腔科检查记录
     */
    public DentalRecord makeTreatmentPlan(String recordNo, String diagnosis, String treatmentPlan) {
        DentalRecord record = dentalRecordRepository.findByRecordNo(recordNo);
        if (record != null) {
            record.setDiagnosis(diagnosis);
            record.setTreatmentPlan(treatmentPlan);
            return dentalRecordRepository.save(record);
        }
        return null;
    }

    /**
     * 患者口腔科史。
     *
     * @param patientId 患者 ID
     * @return 口腔科检查记录列表
     */
    public List<DentalRecord> dentalHistory(Long patientId) {
        return dentalRecordRepository.findByPatientId(String.valueOf(patientId));
    }
}
