/*
 * 健澜科技 jlmedaios - CDS 评估记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_deep.repository;

import com.jlmedaios.monolith.clinical_deep.entity.CDSEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * CDS 评估记录 Repository。
 */
@Repository
public interface CDSEvaluationRepository extends JpaRepository<CDSEvaluation, Long> {

    /**
     * 按患者 ID 查询评估记录。
     *
     * @param patientId 患者 ID
     * @return 评估记录列表
     */
    List<CDSEvaluation> findByPatientId(String patientId);
}
