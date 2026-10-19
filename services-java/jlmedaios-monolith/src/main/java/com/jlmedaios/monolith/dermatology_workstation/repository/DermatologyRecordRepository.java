/*
 * 健澜科技 jlmedaios - 皮肤科诊疗记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.dermatology_workstation.repository;

import com.jlmedaios.monolith.dermatology_workstation.entity.DermatologyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 皮肤科诊疗记录 Repository。
 */
@Repository
public interface DermatologyRecordRepository extends JpaRepository<DermatologyRecord, Long> {

    /**
     * 按患者 ID 查询皮肤科诊疗记录。
     *
     * @param patientId 患者 ID
     * @return 皮肤科诊疗记录列表
     */
    List<DermatologyRecord> findByPatientId(String patientId);

    /**
     * 按记录编号查询皮肤科诊疗记录。
     *
     * @param recordNo 记录编号
     * @return 皮肤科诊疗记录
     */
    DermatologyRecord findByRecordNo(String recordNo);
}
