/*
 * 健澜科技 jlmedaios - 诊疗记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.encounter.repository;

import com.jlmedaios.monolith.encounter.entity.EncounterRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 诊疗记录 Repository。
 */
@Repository
public interface EncounterRecordRepository extends JpaRepository<EncounterRecord, Long> {

    /**
     * 按患者 ID 查询诊疗记录列表。
     *
     * @param patientId 患者 ID
     * @return 诊疗记录列表
     */
    List<EncounterRecord> findByPatientId(Long patientId);

    /**
     * 按科室编码查询诊疗记录列表。
     *
     * @param deptCode 科室编码
     * @return 诊疗记录列表
     */
    List<EncounterRecord> findByDeptCode(String deptCode);
}
