/*
 * 健澜科技 jlmedaios - 口腔科检查记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.dental_workstation.repository;

import com.jlmedaios.monolith.dental_workstation.entity.DentalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 口腔科检查记录 Repository。
 */
@Repository
public interface DentalRecordRepository extends JpaRepository<DentalRecord, Long> {

    /**
     * 按患者 ID 查询口腔科检查记录。
     *
     * @param patientId 患者 ID
     * @return 口腔科检查记录列表
     */
    List<DentalRecord> findByPatientId(String patientId);

    /**
     * 按记录编号查询口腔科检查记录。
     *
     * @param recordNo 记录编号
     * @return 口腔科检查记录
     */
    DentalRecord findByRecordNo(String recordNo);
}
