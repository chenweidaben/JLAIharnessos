/*
 * 健澜科技 jlmedaios - 预约 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.appointment.service;

import com.jlmedaios.monolith.appointment.entity.Appointment;
import com.jlmedaios.monolith.appointment.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * 预约 Service。
 */
@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;

    /**
     * 预约检查。
     *
     * @param patientId     患者 ID
     * @param examType      检查类型
     * @param deptCode      科室编码
     * @param scheduledTime 预约时间
     * @param roomNumber    检查室号
     * @return 已持久化的预约
     */
    public Appointment book(Long patientId, String examType, String deptCode,
                              LocalDateTime scheduledTime, String roomNumber) {
        Appointment appointment = Appointment.builder()
                .patientId(patientId)
                .examType(examType)
                .deptCode(deptCode)
                .scheduledTime(scheduledTime)
                .roomNumber(roomNumber)
                .build();
        return appointmentRepository.save(appointment);
    }

    /**
     * 今日某科室预约列表。
     *
     * @param deptCode 科室编码
     * @return 今日预约列表
     */
    public List<Appointment> todayDept(String deptCode) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        return appointmentRepository
                .findByDeptCodeAndScheduledTimeBetween(deptCode, startOfDay, endOfDay);
    }

    /**
     * 完成预约（status → COMPLETED）。
     *
     * @param id 预约 ID
     * @return 更新后的预约
     */
    public Optional<Appointment> complete(Long id) {
        Optional<Appointment> opt = appointmentRepository.findById(id);
        opt.ifPresent(appointment -> {
            appointment.setStatus("COMPLETED");
            appointmentRepository.save(appointment);
        });
        return opt;
    }
}
