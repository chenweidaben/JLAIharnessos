/*
 * 健澜科技 jlmedaios - 病案 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_record.repository;

import com.jlmedaios.monolith.medical_record.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 病案 Repository。
 */
@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {

    /**
     * 按患者 ID 查询病案。
     *
     * @param patientId 患者 ID
     * @return 病案列表
     */
    List<MedicalRecord> findByPatientId(Long patientId);

    /**
     * 按质控状态查询病案。
     *
     * @param status 质控状态
     * @return 病案列表
     */
    List<MedicalRecord> findByQualityCheckStatus(String status);
}
