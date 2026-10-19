/*
 * 健澜科技 jlmedaios - 号源 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.appointment_scheduling.repository;

import com.jlmedaios.monolith.appointment_scheduling.entity.AppointmentSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 号源 Repository。
 */
@Repository
public interface AppointmentSlotRepository extends JpaRepository<AppointmentSlot, Long> {

    /**
     * 按科室和日期查询号源。
     *
     * @param department 科室
     * @param date       日期
     * @return 号源列表
     */
    List<AppointmentSlot> findByDepartmentAndDate(String department, LocalDate date);

    /**
     * 按状态查询号源。
     *
     * @param status 状态
     * @return 号源列表
     */
    List<AppointmentSlot> findByStatus(String status);
}
