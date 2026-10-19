/*
 * 健澜科技 jlmedaios - 智能预约排班 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.appointment_scheduling.service;

import com.jlmedaios.monolith.appointment_scheduling.entity.AppointmentSlot;
import com.jlmedaios.monolith.appointment_scheduling.repository.AppointmentSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 智能预约排班 Service。
 */
@Service
@RequiredArgsConstructor
public class AppointmentSchedulingService {

    private final AppointmentSlotRepository appointmentSlotRepository;

    /**
     * 查询可预约号源。
     *
     * @param department 科室
     * @param date       日期
     * @return 号源列表
     */
    public List<AppointmentSlot> availableSlots(String department, LocalDate date) {
        return appointmentSlotRepository.findByDepartmentAndDate(department, date).stream()
                .filter(s -> "OPEN".equals(s.getStatus()))
                .filter(s -> s.getBookedQuota() < s.getTotalQuota())
                .toList();
    }

    /**
     * 预约挂号（bookedQuota+1，满了自动设 FULL）。
     *
     * @param slotId    号源 ID
     * @param patientId 患者 ID
     * @return 已更新的号源
     */
    public Optional<AppointmentSlot> book(Long slotId, Long patientId) {
        Optional<AppointmentSlot> opt = appointmentSlotRepository.findById(slotId);
        if (opt.isPresent()) {
            AppointmentSlot slot = opt.get();
            slot.setBookedQuota(slot.getBookedQuota() + 1);
            if (slot.getBookedQuota() >= slot.getTotalQuota()) {
                slot.setStatus("FULL");
            }
            appointmentSlotRepository.save(slot);
        }
        return opt;
    }

    /**
     * 取消预约（bookedQuota-1）。
     *
     * @param slotId 号源 ID
     * @return 已更新的号源
     */
    public Optional<AppointmentSlot> cancel(Long slotId) {
        Optional<AppointmentSlot> opt = appointmentSlotRepository.findById(slotId);
        if (opt.isPresent()) {
            AppointmentSlot slot = opt.get();
            slot.setBookedQuota(Math.max(0, slot.getBookedQuota() - 1));
            if ("FULL".equals(slot.getStatus())) {
                slot.setStatus("OPEN");
            }
            appointmentSlotRepository.save(slot);
        }
        return opt;
    }

    /**
     * 今日出诊安排。
     *
     * @return 号源列表
     */
    public List<AppointmentSlot> todaySchedule() {
        return appointmentSlotRepository.findByStatus("OPEN").stream()
                .filter(s -> LocalDate.now().equals(s.getDate()))
                .toList();
    }
}
