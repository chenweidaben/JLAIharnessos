/*
 * 健澜科技 jlmedaios - 疼痛管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pain_management.service;

import com.jlmedaios.monolith.pain_management.entity.PainAssessment;
import com.jlmedaios.monolith.pain_management.entity.PainRecord;
import com.jlmedaios.monolith.pain_management.repository.PainAssessmentRepository;
import com.jlmedaios.monolith.pain_management.repository.PainRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * 疼痛管理 Service。
 *
 * <p>append-only: 疼痛评估记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class PainManagementService {

    private final PainAssessmentRepository painAssessmentRepository;
    private final PainRecordRepository painRecordRepository;

    /**
     * 疼痛评估。
     *
     * @param assessmentNo   评估编号
     * @param patientId        患者 ID
     * @param painScore        疼痛评分
     * @param painLocation     疼痛部位
     * @param painCharacter    疼痛性质
     * @param medicationGiven  已用药
     * @return 已持久化的疼痛评估
     */
    public PainAssessment assess(String assessmentNo, String patientId, Integer painScore,
                                  String painLocation, String painCharacter, String medicationGiven) {
        PainAssessment assessment = PainAssessment.builder()
                .assessmentNo(assessmentNo)
                .patientId(patientId)
                .painScore(painScore)
                .painLocation(painLocation)
                .painCharacter(painCharacter)
                .medicationGiven(medicationGiven)
                .build();
        return painAssessmentRepository.save(assessment);
    }

    /**
     * 疼痛历史。
     *
     * @param patientId 患者 ID
     * @return 疼痛评估列表
     */
    public List<PainAssessment> history(Long patientId) {
        return painAssessmentRepository.findByPatientId(String.valueOf(patientId));
    }

    /**
     * 重度疼痛列表（score>=7）。
     *
     * @return 疼痛评估列表
     */
    public List<PainAssessment> severePainList() {
        return painAssessmentRepository.findByPainScoreGreaterThanEqual(7);
    }

    // ==================== PainRecord 疼痛评估管理（深化） ====================

    /**
     * 待随访患者列表。
     *
     * @return 疼痛评估记录列表
     */
    public List<PainRecord> pendingFollowUp() {
        return painRecordRepository.findByFollowUpDateBefore(LocalDate.now());
    }

    /**
     * 创建疼痛评估。
     *
     * @param recordNo   记录编号
     * @param patientId  患者 ID
     * @param painSite   疼痛部位
     * @param painScore  疼痛评分
     * @param painType   疼痛类型
     * @return 已创建的疼痛评估记录
     */
    public PainRecord assess(String recordNo, String patientId, String painSite,
                              Integer painScore, String painType) {
        PainRecord record = PainRecord.builder()
                .recordNo(recordNo)
                .patientId(patientId)
                .painSite(painSite)
                .painScore(painScore)
                .painType(painType)
                .build();
        return painRecordRepository.save(record);
    }

    /**
     * 记录治疗方案。
     *
     * @param recordNo      记录编号
     * @param treatmentType 治疗类型
     * @param followUpDate  随访日期
     * @return 已记录治疗的疼痛评估记录
     */
    public PainRecord recordTreatment(String recordNo, String treatmentType, LocalDate followUpDate) {
        PainRecord record = findByRecordNo(recordNo);
        if (record != null) {
            record.setTreatmentType(treatmentType);
            record.setFollowUpDate(followUpDate);
            return painRecordRepository.save(record);
        }
        return null;
    }

    /**
     * 患者疼痛史。
     *
     * @param patientId 患者 ID
     * @return 疼痛评估记录列表
     */
    public List<PainRecord> painHistory(Long patientId) {
        return painRecordRepository.findByPatientId(String.valueOf(patientId));
    }

    private PainRecord findByRecordNo(String recordNo) {
        // P3 性能优化：直接调用 Repository 派生查询
        return painRecordRepository.findByRecordNo(recordNo);
    }
}
