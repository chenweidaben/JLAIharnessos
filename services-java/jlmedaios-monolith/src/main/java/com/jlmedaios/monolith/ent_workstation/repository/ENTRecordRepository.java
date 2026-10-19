/*
 * 健澜科技 jlmedaios - 耳鼻喉检查记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ent_workstation.repository;

import com.jlmedaios.monolith.ent_workstation.entity.ENTRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 耳鼻喉检查记录 Repository。
 */
@Repository
public interface ENTRecordRepository extends JpaRepository<ENTRecord, Long> {

    /**
     * 按患者 ID 查询耳鼻喉检查记录。
     *
     * @param patientId 患者 ID
     * @return 耳鼻喉检查记录列表
     */
    List<ENTRecord> findByPatientId(String patientId);

    /**
     * 按记录编号查询耳鼻喉检查记录。
     *
     * @param recordNo 记录编号
     * @return 耳鼻喉检查记录
     */
    ENTRecord findByRecordNo(String recordNo);
}
