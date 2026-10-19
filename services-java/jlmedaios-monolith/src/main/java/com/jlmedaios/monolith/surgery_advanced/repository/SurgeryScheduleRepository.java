/*
 * 健澜科技 jlmedaios - 手术排台 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.surgery_advanced.repository;

import com.jlmedaios.monolith.surgery_advanced.entity.SurgerySchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 手术排台 Repository。
 */
@Repository
public interface SurgeryScheduleRepository extends JpaRepository<SurgerySchedule, Long> {

    /**
     * 按状态查询排台。
     *
     * @param status 状态
     * @return 排台列表
     */
    List<SurgerySchedule> findByStatus(String status);

    /**
     * 按计划开始时间范围查询排台。
     *
     * @param start 开始时间
     * @param end   结束时间
     * @return 排台列表
     */
    List<SurgerySchedule> findByScheduledStartBetween(LocalDateTime start, LocalDateTime end);
}
