/*
 * 健澜科技 jlmedaios - 手术排班 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.operation_schedule.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.operation_schedule.entity.OperationSchedule;
import com.jlmedaios.monolith.operation_schedule.service.OperationScheduleService;
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
 * 手术排班 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/operation")
public class OperationScheduleController {

    private final OperationScheduleService operationScheduleService;

    /**
     * 创建手术排班。
     *
     * @param body {roomCode, surgeonId, assistantId, anesthesiologistId, patientId, procedureName, scheduledStart, scheduledEnd}
     * @return Result<OperationSchedule>
     */
    @PostMapping("/schedule")
    public Result<OperationSchedule> schedule(@RequestBody Map<String, Object> body) {
        OperationSchedule schedule = operationScheduleService.schedule(
                String.valueOf(body.get("roomCode")),
                String.valueOf(body.get("surgeonId")),
                String.valueOf(body.get("assistantId")),
                String.valueOf(body.get("anesthesiologistId")),
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("procedureName")),
                LocalDateTime.parse(String.valueOf(body.get("scheduledStart"))),
                LocalDateTime.parse(String.valueOf(body.get("scheduledEnd")))
        );
        return Result.ok(schedule);
    }

    /**
     * 今日手术安排。
     *
     * @return Result<List<OperationSchedule>>
     */
    @GetMapping("/today")
    public Result<List<OperationSchedule>> todayList() {
        return Result.ok(operationScheduleService.todayList());
    }

    /**
     * 手术开始。
     *
     * @param id 排班 ID
     * @return Result<OperationSchedule>
     */
    @PutMapping("/{id}/start")
    public Result<OperationSchedule> start(@PathVariable Long id) {
        return operationScheduleService.start(id)
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 手术完成。
     *
     * @param id 排班 ID
     * @return Result<OperationSchedule>
     */
    @PutMapping("/{id}/finish")
    public Result<OperationSchedule> finish(@PathVariable Long id) {
        return operationScheduleService.finish(id)
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }
}
