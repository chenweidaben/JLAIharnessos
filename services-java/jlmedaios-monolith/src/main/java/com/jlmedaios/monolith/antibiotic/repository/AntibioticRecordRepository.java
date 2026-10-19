/*
 * 健澜科技 jlmedaios - 抗菌药物记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.antibiotic.repository;

import com.jlmedaios.monolith.antibiotic.entity.AntibioticRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 抗菌药物记录 Repository。
 */
@Repository
public interface AntibioticRecordRepository extends JpaRepository<AntibioticRecord, Long> {

    /**
     * 按患者 ID 查询抗菌药物记录列表。
     *
     * @param patientId 患者 ID
     * @return 抗菌药物记录列表
     */
    List<AntibioticRecord> findByPatientId(Long patientId);

    /**
     * 按审核状态查询抗菌药物记录列表。
     *
     * @param reviewStatus 审核状态
     * @return 抗菌药物记录列表
     */
    List<AntibioticRecord> findByReviewStatus(String reviewStatus);
}
