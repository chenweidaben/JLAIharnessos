/*
 * 健澜科技 jlmedaios - 患者画像 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_profile.service;

import com.jlmedaios.monolith.patient_profile.entity.PatientProfile;
import com.jlmedaios.monolith.patient_profile.repository.PatientProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * 患者画像 Service。
 *
 * <p>患者 360 度画像；汇总患者所有诊疗数据，生产接数据中台</p>
 */
@Service
@RequiredArgsConstructor
public class PatientProfileService {

    private final PatientProfileRepository patientProfileRepository;

    /**
     * 患者 360 度画像。
     *
     * @param patientId 患者 ID
     * @return 患者画像
     */
    public PatientProfile profile360(Long patientId) {
        List<PatientProfile> profiles = patientProfileRepository.findByPatientId(String.valueOf(patientId));
        return profiles.isEmpty() ? null : profiles.get(0);
    }

    /**
     * 高风险患者列表（riskScore>=7）。
     *
     * @return 患者画像列表
     */
    public List<PatientProfile> highRiskList() {
        return patientProfileRepository.findByRiskScoreGreaterThanEqual(new BigDecimal("7.0"));
    }

    /**
     * 科室患者概览。
     *
     * @param deptCode 科室编码
     * @return 患者画像列表
     */
    public List<PatientProfile> departmentOverview(String deptCode) {
        return patientProfileRepository.findAll();
    }
}
