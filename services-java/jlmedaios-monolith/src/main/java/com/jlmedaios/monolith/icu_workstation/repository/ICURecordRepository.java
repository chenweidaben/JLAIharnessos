/*
 * 健澜科技 jlmedaios - ICU 监护记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_workstation.repository;

import com.jlmedaios.monolith.icu_workstation.entity.ICURecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ICU 监护记录 Repository。
 */
@Repository
public interface ICURecordRepository extends JpaRepository<ICURecord, Long> {

    /**
     * 按患者 ID 查询 ICU 监护记录。
     *
     * @param patientId 患者 ID
     * @return ICU 监护记录列表
     */
    List<ICURecord> findByPatientId(String patientId);

    /**
     * 按记录时间范围查询 ICU 监护记录。
     *
     * @param start 开始时间
     * @param end   结束时间
     * @return ICU 监护记录列表
     */
    List<ICURecord> findByRecordTimeBetween(LocalDateTime start, LocalDateTime end);
}
