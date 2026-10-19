/*
 * 健澜科技 jlmedaios - CDS 命中记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_decision.repository;

import com.jlmedaios.monolith.clinical_decision.entity.CDSHit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * CDS 命中记录 Repository。
 */
@Repository
public interface CDSHitRepository extends JpaRepository<CDSHit, Long> {

    /**
     * 按患者 ID 查询命中记录。
     *
     * @param patientId 患者 ID
     * @return 命中记录列表
     */
    List<CDSHit> findByPatientId(Long patientId);
}
