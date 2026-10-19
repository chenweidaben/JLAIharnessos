/*
 * 健澜科技 jlmedaios - 疼痛管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pain_management.service;

import com.jlmedaios.monolith.pain_management.entity.PainAssessment;
import com.jlmedaios.monolith.pain_management.repository.PainAssessmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
}
