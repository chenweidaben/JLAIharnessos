/*
 * 健澜科技 jlmedaios - 护理记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_record.repository;

import com.jlmedaios.monolith.nursing_record.entity.NursingRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 护理记录 Repository。
 */
@Repository
public interface NursingRecordRepository extends JpaRepository<NursingRecord, Long> {

    /**
     * 按患者 ID 查询护理记录列表。
     *
     * @param patientId 患者 ID
     * @return 护理记录列表
     */
    List<NursingRecord> findByPatientId(Long patientId);

    /**
     * 按病区编码 + 时间段查询护理记录列表。
     *
     * @param wardCode 病区编码
     * @param start     开始时间
     * @param end       结束时间
     * @return 护理记录列表
     */
    List<NursingRecord> findByWardCodeAndRecordTimeBetween(String wardCode,
                                                            LocalDateTime start,
                                                            LocalDateTime end);
}
