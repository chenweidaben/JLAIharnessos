/*
 * 健澜科技 jlmedaios - 临床路径记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_pathway.repository;

import com.jlmedaios.monolith.clinical_pathway.entity.PathwayRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 临床路径记录 Repository。
 */
@Repository
public interface PathwayRecordRepository extends JpaRepository<PathwayRecord, Long> {

    /**
     * 按状态查询临床路径列表。
     *
     * @param status 状态
     * @return 临床路径列表
     */
    List<PathwayRecord> findByStatus(String status);

    /**
     * 按患者 ID 查询临床路径列表。
     *
     * @param patientId 患者 ID
     * @return 临床路径列表
     */
    List<PathwayRecord> findByPatientId(Long patientId);
}
