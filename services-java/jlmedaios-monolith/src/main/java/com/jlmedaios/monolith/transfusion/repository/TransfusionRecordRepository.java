/*
 * 健澜科技 jlmedaios - 输血记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.transfusion.repository;

import com.jlmedaios.monolith.transfusion.entity.TransfusionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 输血记录 Repository。
 */
@Repository
public interface TransfusionRecordRepository extends JpaRepository<TransfusionRecord, Long> {

    /**
     * 按患者 ID 查询输血记录列表。
     *
     * @param patientId 患者 ID
     * @return 输血记录列表
     */
    List<TransfusionRecord> findByPatientId(Long patientId);

    /**
     * 按状态查询输血记录列表。
     *
     * @param status 状态
     * @return 输血记录列表
     */
    List<TransfusionRecord> findByStatus(String status);
}
