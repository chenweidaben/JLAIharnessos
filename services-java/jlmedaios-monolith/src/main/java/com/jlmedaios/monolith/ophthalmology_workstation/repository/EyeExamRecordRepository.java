/*
 * 健澜科技 jlmedaios - 眼科检查记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ophthalmology_workstation.repository;

import com.jlmedaios.monolith.ophthalmology_workstation.entity.EyeExamRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 眼科检查记录 Repository。
 */
@Repository
public interface EyeExamRecordRepository extends JpaRepository<EyeExamRecord, Long> {

    /**
     * 按患者 ID 查询眼科检查记录。
     *
     * @param patientId 患者 ID
     * @return 眼科检查记录列表
     */
    List<EyeExamRecord> findByPatientId(String patientId);

    /**
     * 按记录编号查询眼科检查记录。
     *
     * @param recordNo 记录编号
     * @return 眼科检查记录
     */
    EyeExamRecord findByRecordNo(String recordNo);
}
