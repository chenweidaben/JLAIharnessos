/*
 * 健澜科技 jlmedaios - 医技检查预约 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.appointment.repository;

import com.jlmedaios.monolith.appointment.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 医技检查预约 Repository。
 */
@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    /**
     * 按科室 + 时间段查询预约列表。
     *
     * @param deptCode      科室编码
     * @param scheduledTime 预约时间
     * @param scheduledTime2 结束时间
     * @return 预约列表
     */
    List<Appointment> findByDeptCodeAndScheduledTimeBetween(String deptCode,
                                                            LocalDateTime scheduledTime,
                                                            LocalDateTime scheduledTime2);

    /**
     * 按患者 ID 查询预约列表。
     *
     * @param patientId 患者 ID
     * @return 预约列表
     */
    List<Appointment> findByPatientId(Long patientId);
}
