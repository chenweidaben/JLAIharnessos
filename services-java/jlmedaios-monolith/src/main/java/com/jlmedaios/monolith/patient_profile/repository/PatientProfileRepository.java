/*
 * 健澜科技 jlmedaios - 患者画像 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_profile.repository;

import com.jlmedaios.monolith.patient_profile.entity.PatientProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

/**
 * 患者画像 Repository。
 */
@Repository
public interface PatientProfileRepository extends JpaRepository<PatientProfile, Long> {

    /**
     * 按患者 ID 查询画像。
     *
     * @param patientId 患者 ID
     * @return 患者画像列表
     */
    List<PatientProfile> findByPatientId(String patientId);

    /**
     * 按风险分数阈值查询高风险患者。
     *
     * @param threshold 风险分数阈值
     * @return 患者画像列表
     */
    List<PatientProfile> findByRiskScoreGreaterThanEqual(BigDecimal threshold);
}
