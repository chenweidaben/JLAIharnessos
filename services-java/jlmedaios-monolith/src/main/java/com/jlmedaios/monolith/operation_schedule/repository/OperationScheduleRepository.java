/*
 * 健澜科技 jlmedaios - 手术排班 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.operation_schedule.repository;

import com.jlmedaios.monolith.operation_schedule.entity.OperationSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 手术排班 Repository。
 */
@Repository
public interface OperationScheduleRepository extends JpaRepository<OperationSchedule, Long> {

    /**
     * 按时间段查询手术排班。
     *
     * @param start 开始时间
     * @param end   结束时间
     * @return 手术排班列表
     */
    List<OperationSchedule> findByScheduledStartBetween(LocalDateTime start, LocalDateTime end);

    /**
     * 按状态查询手术排班。
     *
     * @param status 状态
     * @return 手术排班列表
     */
    List<OperationSchedule> findByStatus(String status);
}
