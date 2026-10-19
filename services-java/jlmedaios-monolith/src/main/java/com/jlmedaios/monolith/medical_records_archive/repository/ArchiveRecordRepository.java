/*
 * 健澜科技 jlmedaios - 病案归档 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_records_archive.repository;

import com.jlmedaios.monolith.medical_records_archive.entity.ArchiveRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 病案归档 Repository。
 */
@Repository
public interface ArchiveRecordRepository extends JpaRepository<ArchiveRecord, Long> {

    /**
     * 按状态查询归档记录。
     *
     * @param status 状态
     * @return 归档记录列表
     */
    List<ArchiveRecord> findByStatus(String status);

    /**
     * 按患者 ID 查询归档记录。
     *
     * @param patientId 患者 ID
     * @return 归档记录列表
     */
    List<ArchiveRecord> findByPatientId(Long patientId);
}
