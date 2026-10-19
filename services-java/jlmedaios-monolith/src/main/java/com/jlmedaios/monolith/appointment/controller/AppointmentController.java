/*
 * 健澜科技 jlmedaios - 预约 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.appointment.controller;

import com.jlmedaios.monolith.appointment.entity.Appointment;
import com.jlmedaios.monolith.appointment.service.AppointmentService;
import com.jlmedaios.monolith.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 预约 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/appointment")
public class AppointmentController {

    private final AppointmentService appointmentService;

    /**
     * 预约检查。
     *
     * @param body {patientId, examType, deptCode, scheduledTime, roomNumber}
     * @return Result<Appointment>
     */
    @PostMapping("/book")
    public Result<Appointment> book(@RequestBody Map<String, Object> body) {
        Appointment appointment = appointmentService.book(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("examType")),
                String.valueOf(body.get("deptCode")),
                LocalDateTime.parse(String.valueOf(body.get("scheduledTime"))),
                String.valueOf(body.get("roomNumber"))
        );
        return Result.ok(appointment);
    }

    /**
     * 今日某科室预约列表。
     *
     * @param deptCode 科室编码
     * @return Result<List<Appointment>>
     */
    @GetMapping("/dept/{deptCode}/today")
    public Result<List<Appointment>> todayDept(@PathVariable String deptCode) {
        return Result.ok(appointmentService.todayDept(deptCode));
    }

    /**
     * 完成预约。
     *
     * @param id 预约 ID
     * @return Result<Appointment>
     */
    @PutMapping("/{id}/complete")
    public Result<Appointment> complete(@PathVariable Long id) {
        return appointmentService.complete(id)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "预约记录不存在"));
    }
}
