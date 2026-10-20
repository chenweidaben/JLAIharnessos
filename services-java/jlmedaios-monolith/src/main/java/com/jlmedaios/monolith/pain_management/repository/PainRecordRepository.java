/*
 * 健澜科技 jlmedaios - 疼痛评估记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pain_management.repository;

import com.jlmedaios.monolith.pain_management.entity.PainRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 疼痛评估记录 Repository。
 */
@Repository
public interface PainRecordRepository extends JpaRepository<PainRecord, Long> {

    /**
     * 按随访日期之前查询疼痛评估记录。
     *
     * @param date 日期
     * @return 疼痛评估记录列表
     */
    List<PainRecord> findByFollowUpDateBefore(LocalDate date);

    /**
     * 按患者 ID 查询疼痛评估记录。
     *
     * @param patientId 患者 ID
     * @return 疼痛评估记录列表
     */
    List<PainRecord> findByPatientId(String patientId);

    /**
     * 按记录编号查询疼痛评估记录（P3 性能优化：替代 findAll().filter()）。
     *
     * @param recordNo 记录编号
     * @return 疼痛评估记录
     */
    PainRecord findByRecordNo(String recordNo);
}
