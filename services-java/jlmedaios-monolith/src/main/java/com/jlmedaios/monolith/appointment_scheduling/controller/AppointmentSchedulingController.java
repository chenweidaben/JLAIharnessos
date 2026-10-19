/*
 * 健澜科技 jlmedaios - 智能预约排班 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.appointment_scheduling.controller;

import com.jlmedaios.monolith.appointment_scheduling.entity.AppointmentSlot;
import com.jlmedaios.monolith.appointment_scheduling.service.AppointmentSchedulingService;
import com.jlmedaios.monolith.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 智能预约排班 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/appointment")
public class AppointmentSchedulingController {

    private final AppointmentSchedulingService appointmentSchedulingService;

    /**
     * 查询可预约号源。
     *
     * @param department 科室
     * @param date       日期
     * @return Result<List<AppointmentSlot>>
     */
    @GetMapping("/slots")
    public Result<List<AppointmentSlot>> availableSlots(
            @RequestParam String department,
            @RequestParam String date) {
        return Result.ok(appointmentSchedulingService.availableSlots(department, LocalDate.parse(date)));
    }

    /**
     * 预约挂号。
     *
     * @param body {slotId, patientId}
     * @return Result<AppointmentSlot>
     */
    @PostMapping("/book")
    public Result<AppointmentSlot> book(@RequestBody Map<String, Object> body) {
        return appointmentSchedulingService.book(
                Long.valueOf(String.valueOf(body.get("slotId"))),
                Long.valueOf(String.valueOf(body.get("patientId")))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 取消预约。
     *
     * @param id 号源 ID
     * @return Result<AppointmentSlot>
     */
    @PutMapping("/{id}/cancel")
    public Result<AppointmentSlot> cancel(@PathVariable Long id) {
        return appointmentSchedulingService.cancel(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 今日出诊安排。
     *
     * @return Result<List<AppointmentSlot>>
     */
    @GetMapping("/today")
    public Result<List<AppointmentSlot>> todaySchedule() {
        return Result.ok(appointmentSchedulingService.todaySchedule());
    }
}
