/*
 * 健澜科技 jlmedaios - 查房记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.mobile_rounds.repository;

import com.jlmedaios.monolith.mobile_rounds.entity.RoundRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 查房记录 Repository。
 */
@Repository
public interface RoundRecordRepository extends JpaRepository<RoundRecord, Long> {

    /**
     * 按病区+时间范围查询查房记录。
     *
     * @param wardCode 病区编码
     * @param start    开始时间
     * @param end      结束时间
     * @return 查房记录列表
     */
    List<RoundRecord> findByWardCodeAndRoundTimeBetween(String wardCode, LocalDateTime start, LocalDateTime end);

    /**
     * 按患者 ID 查询查房历史。
     *
     * @param patientId 患者 ID
     * @return 查房记录列表
     */
    List<RoundRecord> findByPatientId(Long patientId);
}
