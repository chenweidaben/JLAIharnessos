/*
 * 健澜科技 jlmedaios - 手术记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.surgery.repository;

import com.jlmedaios.monolith.surgery.entity.SurgeryRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 手术记录 Repository。
 */
@Repository
public interface SurgeryRecordRepository extends JpaRepository<SurgeryRecord, Long> {

    /**
     * 按状态查询手术记录。
     *
     * @param status 状态
     * @return 手术记录列表
     */
    List<SurgeryRecord> findByStatus(String status);

    /**
     * 按时间段查询手术记录（今日手术）。
     *
     * @param start 开始时间
     * @param end   结束时间
     * @return 手术记录列表
     */
    List<SurgeryRecord> findByStartTimeBetween(LocalDateTime start, LocalDateTime end);
}
