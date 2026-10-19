/*
 * 健澜科技 jlmedaios - 疼痛评估 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pain_management.repository;

import com.jlmedaios.monolith.pain_management.entity.PainAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 疼痛评估 Repository。
 */
@Repository
public interface PainAssessmentRepository extends JpaRepository<PainAssessment, Long> {

    /**
     * 按患者 ID 查询疼痛评估记录。
     *
     * @param patientId 患者 ID
     * @return 疼痛评估列表
     */
    List<PainAssessment> findByPatientId(String patientId);

    /**
     * 按疼痛评分阈值查询。
     *
     * @param threshold 疼痛评分阈值
     * @return 疼痛评估列表
     */
    List<PainAssessment> findByPainScoreGreaterThanEqual(Integer threshold);
}
